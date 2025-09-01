import { ethers } from "ethers";
import { RPC } from "../config/chains.js";

export const provider = new ethers.JsonRpcProvider(RPC.polygon);

export function makeWallet() {
    // TEST
    //const pk = process.env.PRIVATE_KEY;
    const pk = process.env.PRIVATE_KEY_POLYGON_FORKED;
    if (!pk) throw new Error("Missing PRIVATE_KEY");
    return new ethers.Wallet(pk, provider);
}
