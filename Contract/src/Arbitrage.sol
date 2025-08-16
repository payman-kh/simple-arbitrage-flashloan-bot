// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

contract Arbitrage {
    using SafeERC20 for IERC20;

    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /// @notice Perform an arbitrage trade between two DEXes
    function executeArbitrage(
        address tokenIn,
        address tokenOut,
        uint amountIn,
        address dex1,
        address dex2
    ) external onlyOwner {
        IERC20(tokenIn).safeApprove(dex1, amountIn);

        // Swap on dex1
        address ;
        path1[0] = tokenIn;
        path1[1] = tokenOut;

        uint[] memory amounts1 = IUniswapV2Router(dex1).swapExactTokensForTokens(
            amountIn,
            1, // no slippage protection yet
            path1,
            address(this),
            block.timestamp
        );

        uint received = amounts1[amounts1.length - 1];

        IERC20(tokenOut).safeApprove(dex2, received);

        // Swap back on dex2
        address ;
        path2[0] = tokenOut;
        path2[1] = tokenIn;

        IUniswapV2Router(dex2).swapExactTokensForTokens(
            received,
            1,
            path2,
            address(this),
            block.timestamp
        );
    }

    /// @notice Withdraw profits
    function withdraw(address token) external onlyOwner {
        uint balance = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransfer(owner, balance);
    }
}
