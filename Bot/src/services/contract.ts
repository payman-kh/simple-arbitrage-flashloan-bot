import { ethers } from "ethers";
import arbAbi from "../data/Arbitrage.json" with { type: "json" };

export function getArbitrageContract(signer: ethers.Signer) {
    const addr = process.env.ARBITRAGE_CONTRACT_ADDRESS;
    if (!addr) throw new Error("Missing ARBITRAGE_CONTRACT_ADDRESS");
    return new ethers.Contract(addr, arbAbi.abi ?? arbAbi, signer);
}
