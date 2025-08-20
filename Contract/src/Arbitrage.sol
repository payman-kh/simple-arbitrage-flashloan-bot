// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Minimal V2 router interface
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

// Minimal V3 swap router interface (single-hop and multi-hop)
interface ISwapRouterV3 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96; // 0 for no limit
    }

    struct ExactInputParams {
        bytes path;               // abi.encodePacked(token, fee, token, fee, ..., token)
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
    external
    payable
    returns (uint256 amountOut);

    function exactInput(ExactInputParams calldata params)
    external
    payable
    returns (uint256 amountOut);
}

contract Arbitrage is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public owner;

    event ArbitrageExecuted(
        address indexed dex1,
        address indexed dex2,
        address indexed tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 finalBalanceIncrease
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero owner");
        owner = newOwner;
    }

    // --------------------------
    // V2 -> V2
    // --------------------------
    function executeArbV2ToV2(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address routerV2_A,
        address routerV2_B,
        uint256 minOutOnA,
        uint256 minOutOnB,
        uint256 minProfit
    ) external onlyOwner nonReentrant {
        uint256 balBefore = IERC20(tokenIn).balanceOf(address(this));

        // 1) tokenIn -> tokenOut on V2 router A
        _approve(tokenIn, routerV2_A, amountIn);
        uint256 receivedOut = _swapV2(routerV2_A, tokenIn, tokenOut, amountIn, minOutOnA);

        // 2) tokenOut -> tokenIn on V2 router B
        _approve(tokenOut, routerV2_B, receivedOut);
        _swapV2(routerV2_B, tokenOut, tokenIn, receivedOut, minOutOnB);

        _assertProfitAndEmit(routerV2_A, routerV2_B, tokenIn, tokenOut, amountIn, balBefore, minProfit);
    }

    // --------------------------
    // V2 -> V3 (single-hop)
    // --------------------------
    function executeArbV2ToV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address routerV2,
        address routerV3,
        uint24 v3Fee,
        uint256 minOutOnV2,
        uint256 minOutOnV3,
        uint256 minProfit
    ) external onlyOwner nonReentrant {
        uint256 balBefore = IERC20(tokenIn).balanceOf(address(this));

        // 1) tokenIn -> tokenOut on V2
        _approve(tokenIn, routerV2, amountIn);
        uint256 receivedOut = _swapV2(routerV2, tokenIn, tokenOut, amountIn, minOutOnV2);

        // 2) tokenOut -> tokenIn on V3
        _approve(tokenOut, routerV3, receivedOut);
        _swapV3Single(routerV3, tokenOut, tokenIn, v3Fee, receivedOut, minOutOnV3);

        _assertProfitAndEmit(routerV2, routerV3, tokenIn, tokenOut, amountIn, balBefore, minProfit);
    }

    // --------------------------
    // V3 (single-hop) -> V2
    // --------------------------
    function executeArbV3ToV2(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address routerV3,
        address routerV2,
        uint24 v3Fee,
        uint256 minOutOnV3,
        uint256 minOutOnV2,
        uint256 minProfit
    ) external onlyOwner nonReentrant {
        uint256 balBefore = IERC20(tokenIn).balanceOf(address(this));

        // 1) tokenIn -> tokenOut on V3
        _approve(tokenIn, routerV3, amountIn);
        uint256 receivedOut = _swapV3Single(routerV3, tokenIn, tokenOut, v3Fee, amountIn, minOutOnV3);

        // 2) tokenOut -> tokenIn on V2
        _approve(tokenOut, routerV2, receivedOut);
        _swapV2(routerV2, tokenOut, tokenIn, receivedOut, minOutOnV2);

        _assertProfitAndEmit(routerV3, routerV2, tokenIn, tokenOut, amountIn, balBefore, minProfit);
    }

    // --------------------------
    // V3 (single-hop) -> V3 (single-hop)
    // --------------------------
    function executeArbV3ToV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address routerV3_A,
        uint24 v3Fee_A,
        address routerV3_B,
        uint24 v3Fee_B,
        uint256 minOutOnA,
        uint256 minOutOnB,
        uint256 minProfit
    ) external onlyOwner nonReentrant {
        uint256 balBefore = IERC20(tokenIn).balanceOf(address(this));

        // 1) tokenIn -> tokenOut on V3 A
        _approve(tokenIn, routerV3_A, amountIn);
        uint256 receivedOut = _swapV3Single(routerV3_A, tokenIn, tokenOut, v3Fee_A, amountIn, minOutOnA);

        // 2) tokenOut -> tokenIn on V3 B
        _approve(tokenOut, routerV3_B, receivedOut);
        _swapV3Single(routerV3_B, tokenOut, tokenIn, v3Fee_B, receivedOut, minOutOnB);

        _assertProfitAndEmit(routerV3_A, routerV3_B, tokenIn, tokenOut, amountIn, balBefore, minProfit);
    }

    // --------------------------
    // Optional: V3 multi-hop leg helper (can be used if you later need paths)
    // --------------------------
    function executeArbV3PathToV2(
        address tokenIn,
        bytes calldata v3PathOut, // path for tokenIn -> tokenOut
        address tokenOut,
        uint256 amountIn,
        address routerV3,
        uint256 minOutOnV3,
        address routerV2,
        uint256 minOutOnV2,
        uint256 minProfit
    ) external onlyOwner nonReentrant {
        uint256 balBefore = IERC20(tokenIn).balanceOf(address(this));

        _approve(tokenIn, routerV3, amountIn);
        uint256 receivedOut = _swapV3Path(routerV3, v3PathOut, amountIn, minOutOnV3);

        _approve(tokenOut, routerV2, receivedOut);
        _swapV2(routerV2, tokenOut, tokenIn, receivedOut, minOutOnV2);

        _assertProfitAndEmit(routerV3, routerV2, tokenIn, tokenOut, amountIn, balBefore, minProfit);
    }

    // --------------------------
    // Admin
    // --------------------------
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransfer(owner, balance);
    }

    // --------------------------
    // Internal helpers
    // --------------------------
    function _approve(address token, address spender, uint256 amount) internal {
        // reset to 0 then set exact amount to avoid non-standard ERC20 issues
        IERC20(token).forceApprove(spender, 0);
        IERC20(token).forceApprove(spender, amount);
    }

    function _swapV2(
        address routerV2,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) internal returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint[] memory amounts = IUniswapV2Router(routerV2).swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            address(this),
            block.timestamp
        );
        amountOut = amounts[amounts.length - 1];
    }

    function _swapV3Single(
        address routerV3,
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint256 amountOutMin
    ) internal returns (uint256 amountOut) {
        amountOut = ISwapRouterV3(routerV3).exactInputSingle(
            ISwapRouterV3.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: amountOutMin,
                sqrtPriceLimitX96: 0
            })
        );
    }

    function _swapV3Path(
        address routerV3,
        bytes calldata path,
        uint256 amountIn,
        uint256 amountOutMin
    ) internal returns (uint256 amountOut) {
        amountOut = ISwapRouterV3(routerV3).exactInput(
            ISwapRouterV3.ExactInputParams({
                path: path,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: amountOutMin
            })
        );
    }

    function _assertProfitAndEmit(
        address dex1,
        address dex2,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 balBefore,
        uint256 minProfit
    ) internal {
        uint256 balAfter = IERC20(tokenIn).balanceOf(address(this));
        uint256 profit = balAfter - balBefore;
        require(profit >= minProfit, "Insufficient profit");
        emit ArbitrageExecuted(dex1, dex2, tokenIn, tokenOut, amountIn, profit);
    }
}