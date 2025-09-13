import { ethers } from "ethers";
import { DEXES } from "./config/dexes.js";
import { TOKENS, DECIMALS } from "./config/tokens.js";
import { getV2Quote, QuoteResult } from "./services/priceFetcher/v2Prices.js";
import { getV3Quotes } from "./services/priceFetcher/v3Prices.js";

// Define the arbitrage opportunity type
export type Opportunity = {
    borrowToken: keyof typeof TOKENS;
    direction: "AtoB" | "BtoA";
    buyOn: string;
    sellOn: string;
    amountIn: bigint;
    expectedOut: bigint;
    leg1Out: bigint;
    leg2Out: bigint;
};

// Scanner function
export async function findSinglePairArb(
    provider: ethers.Provider,
    baseToken: keyof typeof TOKENS,
    quoteToken: keyof typeof TOKENS,
    amountInUnits: string
): Promise<Opportunity | null> {

    const amtIn = ethers.parseUnits(amountInUnits, DECIMALS[baseToken]);

    // 1️⃣ Fetch all quotes (V2 + V3)
    const allQuotes: QuoteResult[] = [
        ...await getV2Quote(provider, DEXES.sushiswap.router, amtIn, [TOKENS[baseToken], TOKENS[quoteToken]], "sushiswap"),
        ...await getV2Quote(provider, DEXES.uniswap.router, amtIn, [TOKENS[baseToken], TOKENS[quoteToken]], "uniswapV2"),
        ...await getV3Quotes(provider, DEXES.uniswapV3.quoter, amtIn, TOKENS[baseToken], TOKENS[quoteToken], "uniswapV3")
    ];

    if (allQuotes.length < 2) return null; // need at least 2 pools for a 2-leg arb

    let bestOpp: Opportunity | null = null;
    let bestProfit: bigint = 0n;

    // 2️⃣ Loop over all pairs of pools to simulate buy → sell
    for (const buyPool of allQuotes) {
        for (const sellPool of allQuotes) {
            if (buyPool === sellPool) continue;

            const leg1Out = buyPool.amountOut;
            const leg2Out = await simulateSecondLeg(provider, sellPool, leg1Out, quoteToken, baseToken);

            const profit = leg2Out - amtIn;
            if (profit > bestProfit) {
                bestProfit = profit;

                bestOpp = {
                    borrowToken: baseToken,
                    direction: "AtoB",
                    buyOn: buyPool.dex,
                    sellOn: sellPool.dex,
                    amountIn: amtIn,
                    expectedOut: leg2Out,
                    leg1Out,
                    leg2Out
                };
            }
        }
    }

    return bestOpp;
}

// Helper: simulate second leg output based on QuoteResult
async function simulateSecondLeg(
    provider: ethers.Provider,
    sellPool: QuoteResult,
    amountIn: bigint,
    tokenIn: keyof typeof TOKENS,
    tokenOut: keyof typeof TOKENS
): Promise<bigint> {

    // V2 pool
    if (!sellPool.fee) {
        const path = [TOKENS[tokenIn], TOKENS[tokenOut]];
        return (await getV2Quote(provider, DEXES[sellPool.dex].router, amountIn, path, sellPool.dex))[0].amountOut;
    }

    // V3 pool
    return (await getV3Quotes(provider, DEXES.uniswapV3.quoter, amountIn, TOKENS[tokenIn], TOKENS[tokenOut], sellPool.dex))
        .find(q => q.fee === sellPool.fee)?.amountOut ?? 0n;
}
