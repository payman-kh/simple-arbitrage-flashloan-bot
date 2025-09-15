import {ethers} from "ethers";
import {TOKENS} from "./config/tokens.js";
import {Pair} from "./config/pairs.js";
import {getPrices} from "./services/priceAggregtor/priceAggregator.js"

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
    provider: ethers.AbstractProvider,
    pair: Pair[],
    dexNames: string[] //{dexNames: ["uniswapV2", "uniswapV3", "sushiswap"]}
): Promise<Opportunity | null> {


    // make initial price list
    const priceList = getPrices(
        provider,
        pair,
        dexNames
    );


    //todo: do the subscriptions
    // we will build the login inside the eventSubscriber.ts under /services


    //todo: update the list by fetching the price again every ? minutes


    // const amtIn = ethers.parseUnits(amountInUnits, DECIMALS[baseToken]);
    //
    // // 1️⃣ Fetch all quotes (V2 + V3)
    // const allQuotes: QuoteResult[] = [
    //     ...await getV2Quote(provider, DEXES.sushiswap.router, amtIn, [TOKENS[baseToken], TOKENS[quoteToken]], "sushiswap"),
    //     ...await getV2Quote(provider, DEXES.uniswap.router, amtIn, [TOKENS[baseToken], TOKENS[quoteToken]], "uniswapV2"),
    //     ...await getV3Quotes(provider, DEXES.uniswapV3.quoter, amtIn, TOKENS[baseToken], TOKENS[quoteToken], "uniswapV3")
    // ];
    //
    // if (allQuotes.length < 2) return null; // need at least 2 pools for a 2-leg arb
    //
    // let bestOpp: Opportunity | null = null;
    // let bestProfit: bigint = 0n;
    //
    // // 2️⃣ Loop over all pairs of pools to simulate buy → sell
    // for (const buyPool of allQuotes) {
    //     for (const sellPool of allQuotes) {
    //         if (buyPool === sellPool) continue;
    //
    //         const leg1Out = buyPool.amountOut;
    //         const leg2Out = await simulateSecondLeg(provider, sellPool, leg1Out, quoteToken, baseToken);
    //
    //         const profit = leg2Out - amtIn;
    //         if (profit > bestProfit) {
    //             bestProfit = profit;
    //
    //             bestOpp = {
    //                 borrowToken: baseToken,
    //                 direction: "AtoB",
    //                 buyOn: buyPool.dex,
    //                 sellOan: sellPool.dex,
    //                 amountIn: amtIn,
    //                 expectedOut: leg2Out,
    //                 leg1Out,
    //                 leg2Out
    //             };
    //         }
    //     }
    // }
    //
    // return bestOpp;
}

