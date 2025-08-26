import { ethers } from "ethers";
import { RPC } from "../config/chains.js";

export const provider = new ethers.JsonRpcProvider(RPC.polygon);

export function makeWallet() {
    const pk = process.env.PRIVATE_KEY;
    if (!pk) throw new Error("Missing PRIVATE_KEY");
    return new ethers.Wallet(pk, provider);
}
