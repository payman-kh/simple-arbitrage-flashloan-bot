// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

interface ISwapRouterV3 {
    struct ExactInputParams {
        bytes path;               // abi.encodePacked(token, fee, token, fee, ..., token)
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params)
    external
    payable
    returns (uint256 amountOut);
}

interface IUniswapV2Pair {
    function token0() external view returns (address);
    function token1() external view returns (address);

    // Standard UniswapV2-style swap with flash-swap data hook
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
}

// Aave V3 pool (Polygon)
interface IAaveV3Pool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

/*
    Arbitrage execution params for flash callbacks (Aave or V2 flash swap).

    The bot must ABI-encode this struct and pass it as `params` (Aave) or `data` (V2 flash swap).
*/
    struct TwoLegArbParams {
        // First leg (buy)
        uint8 dexTypeA;             // 2 = V2 router, 3 = V3 router
        address routerA;            // router for first leg
        bytes pathA;                // for V2: abi.encode(address[] path), for V3: the bytes path (packed with fees)
        uint256 minOutA;

        // Second leg (sell)
        uint8 dexTypeB;             // 2 = V2 router, 3 = V3 router
        address routerB;
        bytes pathB;                // for V2: abi.encode(address[] path), for V3: the bytes path
        uint256 minOutB;

        // Settlement
        address profitToken;        // token to check profit in (commonly same as asset borrowed)
        uint256 minProfit;          // minimal net profit in profitToken

        // V2 flash-swap specific
        // Fee in basis points for the pair you borrow from (e.g., 30 = 0.30% for Uni/Sushi,
        // 25 = 0.25% for Pancake V2). Only used for V2 flash swaps.
        uint16 v2FlashFeeBips;
    }

contract Arbitrage is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public owner;

    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    event ArbitrageExecuted(
        address indexed initiator,
        address indexed profitToken,
        uint256 grossProfit,
        uint256 netProfit
    );

    event Withdrawn(address indexed token, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ------------------------------------------------
    // Public entry points (owner-only)
    // ------------------------------------------------

    // Polygon: Aave V3 flash loan
    // - asset: token to borrow (e.g., USDC/WETH/WMATIC)
    // - amount: decided by your bot
    // - pool: Aave Pool address per network (your bot supplies)
    // - params: abi.encode(TwoLegArbParams{...})
    function aaveFlashArb(
        address pool,
        address asset,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner nonReentrant {
        IAaveV3Pool(pool).flashLoanSimple(address(this), asset, amount, params, 0);
    }

    // Cross-chain: UniswapV2-style flash swap (works on Sushi, ApeSwap, Pancake V2, etc.)
    // - pair: V2 pair you borrow from (must contain the asset you want to borrow)
    // - assetToBorrow: which token to draw from the pair
    // - amount: decided by your bot
    // - params: abi.encode(TwoLegArbParams{...}) used in callback
    function v2FlashArb(
        address pair,
        address assetToBorrow,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner nonReentrant {
        IUniswapV2Pair p = IUniswapV2Pair(pair);
        address token0 = p.token0();
        address token1 = p.token1();

        require(assetToBorrow == token0 || assetToBorrow == token1, "asset not in pair");

        uint amount0Out = assetToBorrow == token0 ? amount : 0;
        uint amount1Out = assetToBorrow == token1 ? amount : 0;

        // data non-empty triggers the flash swap callback on this contract
        p.swap(amount0Out, amount1Out, address(this), params);
    }

    // ------------------------------------------------
    // Aave V3 flash loan callback
    // ------------------------------------------------
    // Aave V3 will call this on the receiver with the same `params` passed to flashLoanSimple.
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address /* initiator */,
        bytes calldata params
    ) external returns (bool) {
        TwoLegArbParams memory p = abi.decode(params, (TwoLegArbParams));

        uint256 balBefore = IERC20(p.profitToken).balanceOf(address(this));

        // 1) Use borrowed `asset` as input to leg A
        _executeLeg(p.dexTypeA, p.routerA, p.pathA, amount, p.minOutA);

        // 2) Use entire received output from leg A as input to leg B
        uint256 interTokenBal = _inputAmountForNextLeg(p.dexTypeB, p.pathB);
        _executeLeg(p.dexTypeB, p.routerB, p.pathB, interTokenBal, p.minOutB);

        // 3) Check profit and repay
        uint256 balAfter = IERC20(p.profitToken).balanceOf(address(this));
        require(balAfter > balBefore, "no gain");
        uint256 grossProfit = balAfter - balBefore;

        // Repay Aave: amount + premium in `asset`
        uint256 repayAmount = amount + premium;
        IERC20 assetToken = IERC20(asset);
        require(assetToken.balanceOf(address(this)) >= repayAmount, "insufficient to repay");

        // OZ v5: use forceApprove instead of (removed) safeApprove
        assetToken.forceApprove(msg.sender, repayAmount);

        // Compute net profit in p.profitToken
        uint256 netProfit;
        if (p.profitToken == asset) {
            netProfit = grossProfit >= premium ? grossProfit - premium : 0;
        } else {
            netProfit = grossProfit;
        }

        require(netProfit >= p.minProfit, "minProfit not met");

        emit ArbitrageExecuted(tx.origin, p.profitToken, grossProfit, netProfit);
        return true;
    }

    // ------------------------------------------------
    // UniswapV2-style flash swap callbacks
    // ------------------------------------------------
    // Called by UniswapV2/Sushi/Ape/Pancake V2 pairs
    function uniswapV2Call(address /*sender*/, uint amount0, uint amount1, bytes calldata data) external {
        _v2FlashCallback(amount0, amount1, data);
    }

    // Called by PancakeSwap V2 pairs (alias)
    function pancakeCall(address /*sender*/, uint amount0, uint amount1, bytes calldata data) external {
        _v2FlashCallback(amount0, amount1, data);
    }

    // Shared V2 flash-swap callback logic
    function _v2FlashCallback(uint amount0, uint amount1, bytes calldata data) internal nonReentrant {
        // Borrowed token and amount
        address pair = msg.sender;
        IUniswapV2Pair p = IUniswapV2Pair(pair);
        address token0 = p.token0();
        address token1 = p.token1();

        uint256 amountBorrowed = amount0 > 0 ? amount0 : amount1;
        address asset = amount0 > 0 ? token0 : token1;

        TwoLegArbParams memory ap = abi.decode(data, (TwoLegArbParams));
        require(ap.profitToken != address(0), "bad params");

        uint256 balBefore = IERC20(ap.profitToken).balanceOf(address(this));

        // 1) Execute leg A using `asset` as input
        _executeLeg(ap.dexTypeA, ap.routerA, ap.pathA, amountBorrowed, ap.minOutA);

        // 2) Execute leg B using all output from leg A
        uint256 interTokenBal = _inputAmountForNextLeg(ap.dexTypeB, ap.pathB);
        _executeLeg(ap.dexTypeB, ap.routerB, ap.pathB, interTokenBal, ap.minOutB);

        // 3) Repay pair with fees (generalized for different V2 fee bips)
        // Required input when returning same token as borrowed:
        // repay = ceil(amountBorrowed * D / (D - feeBips)), D = 10000
        uint256 D = 10_000;
        uint16 feeBips = ap.v2FlashFeeBips;
        require(feeBips > 0 && feeBips < D, "invalid fee bips");

        uint256 repayAmount = (amountBorrowed * D) / (D - feeBips);
        // round up
        if ((amountBorrowed * D) % (D - feeBips) != 0) {
            repayAmount += 1;
        }

        IERC20(asset).safeTransfer(pair, repayAmount);

        // 4) Profit check
        uint256 balAfter = IERC20(ap.profitToken).balanceOf(address(this));
        require(balAfter > balBefore, "no gain");
        uint256 netProfit = balAfter - balBefore;

        require(netProfit >= ap.minProfit, "minProfit not met");

        emit ArbitrageExecuted(tx.origin, ap.profitToken, netProfit, netProfit);
    }

    // ------------------------------------------------
    // Internal swap execution
    // ------------------------------------------------

    function _executeLeg(
        uint8 dexType,
        address router,
        bytes memory pathEncoded,
        uint256 amountIn,
        uint256 minOut
    ) internal {
        require(router != address(0), "router=0");
        require(amountIn > 0, "amountIn=0");

        if (dexType == 2) {
            // V2 router
            address[] memory path = abi.decode(pathEncoded, (address[]));
            address tokenIn = path[0];

            IERC20(tokenIn).forceApprove(router, amountIn);

            IUniswapV2Router(router).swapExactTokensForTokens(
                amountIn,
                minOut,
                path,
                address(this),
                block.timestamp
            );
        } else if (dexType == 3) {
            // V3 router
            // pathEncoded is the full encoded path: abi.encodePacked(tokenIn, fee, tokenOut, [fee, tokenOut]...)
            address tokenIn = _firstTokenInV3Path(pathEncoded);

            IERC20(tokenIn).forceApprove(router, amountIn);

            ISwapRouterV3(router).exactInput(
                ISwapRouterV3.ExactInputParams({
                    path: pathEncoded,
                    recipient: address(this),
                    deadline: block.timestamp,
                    amountIn: amountIn,
                    amountOutMinimum: minOut
                })
            );
        } else {
            revert("bad dexType");
        }
    }

    // Determine how much to feed into the next leg:
    // - For V2, read balance of last token in path
    // - For V3, read balance of last token in path bytes
    function _inputAmountForNextLeg(uint8 dexType, bytes memory pathEncoded) internal view returns (uint256) {
        if (dexType == 2) {
            address[] memory path = abi.decode(pathEncoded, (address[]));
            address tokenOut = path[path.length - 1];
            return IERC20(tokenOut).balanceOf(address(this));
        } else if (dexType == 3) {
            address tokenOut = _lastTokenOutV3Path(pathEncoded);
            return IERC20(tokenOut).balanceOf(address(this));
        } else {
            revert("bad dexType");
        }
    }

    // Extract first token from V3 path (packed)
    function _firstTokenInV3Path(bytes memory path) internal pure returns (address token) {
        require(path.length >= 20 + 3 + 20, "bad v3 path");
        assembly {
            token := shr(96, mload(add(path, 32)))
        }
    }

    // Extract last token from V3 path (packed)
    function _lastTokenOutV3Path(bytes memory path) internal pure returns (address token) {
        // V3 path is token (20) + fee (3) + token (20) [+ fee (3) + token (20)]*
        require(path.length >= 20 + 3 + 20, "bad v3 path");
        // Walk from the end: last 20 bytes is tokenOut
        uint256 len = path.length;
        uint256 start = len - 20;
        assembly {
            token := shr(96, mload(add(path, add(32, start))))
        }
    }

    // ------------------------------------------------
    // Admin utilities
    // ------------------------------------------------

    function withdraw(address token, address to, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            // withdraw native
            (bool ok, ) = to.call{value: amount}("");
            require(ok, "native transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
        emit Withdrawn(token, to, amount);
    }

    receive() external payable {}
}
