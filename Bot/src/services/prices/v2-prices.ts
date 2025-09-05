import { ethers } from "ethers";

// Minimal V2 router ABI piece
const V2_ABI = [
    "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"
];

export async function getV2Quote(
    provider: ethers.Provider,
    router: string,
    amountIn: bigint,
    path: string[]
): Promise<bigint> {
    const r = new ethers.Contract(router, V2_ABI, provider);
    const out: bigint[] = await r.getAmountsOut(amountIn, path);
    return out[out.length - 1];
}
