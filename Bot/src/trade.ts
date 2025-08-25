import { ethers } from "ethers";

/** Uniswap V2 path encoding: abi.encode(address[]) */
export function encodeV2Path(addresses: string[]): string {
    return ethers.AbiCoder.defaultAbiCoder().encode(["address[]"], [addresses]);
}

/** Uniswap V3 single-/multi-hop path: packed bytes: token (20) | fee (3) | token (20) ... */
export function encodeV3Path(hops: { token: string; fee: number }[]): string {
    // hops must start with tokenIn and alternate fee/tokenOut. Example:
    // [{token: WETH, fee: 500}, {token: USDC, fee: 500}, {token: WETH, fee: 500}] -> WETH-500-USDC-500-WETH
    if (hops.length < 2) throw new Error("need at least 2 tokens (in/out)");
    const parts: Uint8Array[] = [];
    for (let i = 0; i < hops.length; i++) {
        // token
        parts.push(ethers.getBytes(hops[i].token));
        if (i < hops.length - 1) {
            // fee (uint24, 3 bytes big-endian)
            const fee = hops[i + 1].fee ?? hops[i].fee;
            const feeHex = ethers.toBeHex(fee, 3); // 3 bytes
            parts.push(ethers.getBytes(feeHex));
        }
    }
    return ethers.hexlify(ethers.concat(parts));
}

/** TwoLegArbParams solidity type (must match your contract exactly)
 struct TwoLegArbParams {
 uint8 dexTypeA;
 address routerA;
 bytes pathA;
 uint256 minOutA;
 uint8 dexTypeB;
 address routerB;
 bytes pathB;
 uint256 minOutB;
 address profitToken;
 uint256 minProfit;
 uint16 v2FlashFeeBips;
 }
 */
export type TwoLegArbParams = {
    dexTypeA: number;
    routerA: string;
    pathA: string;
    minOutA: bigint;
    dexTypeB: number;
    routerB: string;
    pathB: string;
    minOutB: bigint;
    profitToken: string;
    minProfit: bigint;
    v2FlashFeeBips: number;
};

export function encodeTwoLegParams(p: TwoLegArbParams): string {
    const types = [
        "uint8","address","bytes","uint256",
        "uint8","address","bytes","uint256",
        "address","uint256","uint16"
    ];
    const values = [
        p.dexTypeA, p.routerA, p.pathA, p.minOutA,
        p.dexTypeB, p.routerB, p.pathB, p.minOutB,
        p.profitToken, p.minProfit, p.v2FlashFeeBips
    ];
    return ethers.AbiCoder.defaultAbiCoder().encode(types, values);
}
