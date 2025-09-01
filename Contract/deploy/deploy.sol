// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Arbitrage.sol"; // adjust path to your contract

contract DeployArb is Script {
    function run() external {
        // Start broadcasting transactions
        vm.startBroadcast();

        // Deploy the contract
        Arbitrage arb = new Arbitrage();

        // Print the deployed address
        console.log("Arbitrage contract deployed at:", address(arb));

        vm.stopBroadcast();
    }
}
