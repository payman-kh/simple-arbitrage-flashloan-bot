import { ethers } from "ethers";
import { V2_ROUTERS } from "../config/dexes.js";
import { TOKENS, DECIMALS } from "../config/tokens.js";
import { getV2Quote } from "./prices.js";

// Simple 2-leg arb between two V2 routers: buy on A, sell on B (and reverse)
export type Opportunity = {
    borrowToken: "USDC" | "WETH";   // 👈 new field
    direction: "AtoB" | "BtoA";
    buyOn: "sushiswap" | "quickswap";
    sellOn: "sushiswap" | "quickswap";
    amountIn: bigint;
    expectedOut: bigint;
    leg1Out: bigint;
    leg2Out: bigint;
};

export async function findSinglePairArb(
    provider: ethers.Provider,
    baseToken: "USDC" | "WETH",
    quoteToken: "USDC" | "WETH",
    amountInUnits: string
): Promise<Opportunity | null> {
    const amtIn = ethers.parseUnits(amountInUnits, DECIMALS[baseToken]);

    const A = "sushiswap";
    const B = "quickswap";

    const rA = V2_ROUTERS[A];
    const rB = V2_ROUTERS[B];

    // base -> quote on A, then quote -> base on B
    const pathA1 = [TOKENS[baseToken], TOKENS[quoteToken]];
    const pathB1 = [TOKENS[quoteToken], TOKENS[baseToken]];

    // Direction A→B
    let leg1A = 0n, leg2A = 0n, outA = 0n;
    try {
        leg1A = await getV2Quote(provider, rA, amtIn, pathA1);
        leg2A = await getV2Quote(provider, rB, leg1A, pathB1);
        outA = leg2A;
    } catch {}

    // Direction B→A
    let leg1B = 0n, leg2B = 0n, outB = 0n;
    try {
        const leg1 = await getV2Quote(provider, rB, amtIn, pathA1);
        const leg2 = await getV2Quote(provider, rA, leg1, pathB1);
        leg1B = leg1; leg2B = leg2; outB = leg2;
    } catch {}

    // Choose better of the two
    const bestA = outA > amtIn ? {
        direction: "AtoB" as const,
        buyOn: A, sellOn: B,
        amountIn: amtIn,
        expectedOut: outA,
        leg1Out: leg1A,
        leg2Out: leg2A
    } : null;

    const bestB = outB > amtIn ? {
        direction: "BtoA" as const,
        buyOn: B, sellOn: A,
        amountIn: amtIn,
        expectedOut: outB,
        leg1Out: leg1B,
        leg2Out: leg2B
    } : null;

    if (!bestA && !bestB) return null;
    return (bestA && bestB) ? (bestA.expectedOut - amtIn > bestB.expectedOut - amtIn ? bestA : bestB) : (bestA ?? bestB);
}
