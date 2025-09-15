import {ethers} from "ethers";

export interface QuoteResult {
    dex: string;          // "uniswapV2", "sushiswap", etc.
    fee?: number;         // optional, only for V3
    amountOut: bigint;
}

const V2_ABI = [
    "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"
];

export async function getV2Quote(
    provider: ethers.Provider,
    router: string,
    amountIn: bigint,
    path: string[],
    dexName: string
): Promise<QuoteResult> {
    const r = new ethers.Contract(router, V2_ABI, provider);
    const out: bigint[] = await r.getAmountsOut(amountIn, path);

    return {
        dex: dexName,
        amountOut: out[out.length - 1]
    };
}
