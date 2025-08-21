// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Arbitrage.sol";

// Minimal mintable ERC20 for testing
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MintableERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ArbitrageTest is Test {
    Arbitrage arb;
    MintableERC20 tokenA;
    MintableERC20 tokenB;

    address owner = address(this);

    receive() external payable {}

    function setUp() public {
        arb = new Arbitrage();

        // Deploy 2 mock tokens
        tokenA = new MintableERC20("TokenA", "TKA");
        tokenB = new MintableERC20("TokenB", "TKB");

        // Mint some tokens to owner
        tokenA.mint(owner, 1_000_000 ether);
        tokenB.mint(owner, 1_000_000 ether);
    }

    /// ------------------------------------------------
    /// Basic Deployment
    /// ------------------------------------------------

    function testOwnerIsDeployer() public {
        assertEq(arb.owner(), owner);
    }

    /// ------------------------------------------------
    /// Withdraw function
    /// ------------------------------------------------

    function testWithdrawERC20() public {
        // Send some tokenA to contract
        tokenA.mint(address(arb), 100 ether);

        uint256 before = tokenA.balanceOf(owner);

        // Withdraw
        arb.withdraw(address(tokenA), owner, 100 ether);

        uint256 afterBal = tokenA.balanceOf(owner);
        assertEq(afterBal - before, 100 ether);
    }

    function testWithdrawETH() public {
        // Send ETH to contract
        vm.deal(address(arb), 1 ether);

        uint256 before = owner.balance;

        arb.withdraw(address(0), owner, 1 ether);

        uint256 afterBal = owner.balance;
        assertEq(afterBal - before, 1 ether);
    }

    /// ------------------------------------------------
    /// Arbitrage entrypoint tests (dry runs)
    /// ------------------------------------------------

    function testAaveFlashArbFailsWithoutPool() public {
        bytes memory params = abi.encode(
            TwoLegArbParams({
                dexTypeA: 2,
                routerA: address(0),
                pathA: "",
                minOutA: 0,
                dexTypeB: 2,
                routerB: address(0),
                pathB: "",
                minOutB: 0,
                profitToken: address(tokenA),
                minProfit: 0,
                v2FlashFeeBips: 30
            })
        );

        // No pool set → should revert
        vm.expectRevert();
        arb.aaveFlashArb(address(0), address(tokenA), 1000 ether, params);
    }
}
