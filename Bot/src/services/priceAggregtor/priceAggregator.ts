// services/priceAggregator/priceAggregator.ts
import {ethers} from "ethers";
import {getV2Quote} from "../priceFetcher/v2Prices.js";
import {getV3Quotes} from "../priceFetcher/v3Prices.js";
import {TOKENS, DECIMALS} from "../../config/tokens.js";
import {DEXES} from "../../config/dexes.js";

// ---------- Types ----------
export type DexQuote = {  // quote result from querying a dex
    name: string;   // name of the dex: uniswap, sushiswap, ...
    amountIn: number;
    tokenIn: string;
    tokenOut: string;
    amountOut: number;
    price: number;
    //feeTier?: number; // optional, only for V3
};

export type AggregatedQuotes = {
    pair: [string, string];
    results: DexQuote[];
}[];

export type DexConfig = {
    name: string;
    type: "v2" | "v3";
    router?: string;   // for V2
    quoter?: string;   // for V3
    //feeTier?: number;  // optional, for V3
};

// ---------- Input options ----------
export type AggregatorOptions = {
    dexes?: DexConfig[];    // full config objects
    dexNames?: string[];    // names to fetch from DEXES
};

// ---------- Main aggregator ----------
export async function getPrices(
    provider: ethers.Provider,
    pairs: [string, string][],
    amountIn: number,
    options: AggregatorOptions
): Promise<AggregatedQuotes> {

    // Determine which DEX configs to use
    let dexConfigs: DexConfig[] = [];
    if (options.dexes) {
        dexConfigs = options.dexes;
    } else if (options.dexNames) {
        // @ts-ignore
        dexConfigs = options.dexNames.map(name => DEXES[name]);
    } else {
        throw new Error("No DEXes provided. Pass either dexes or dexNames.");
    }

    const aggregated: AggregatedQuotes = [];

    for (const pair of pairs) {
        const [tokenIn, tokenOut] = pair;
        const pairResults: DexQuote[] = [];

        for (const dex of dexConfigs) {
            // @ts-ignore
            const amtIn = ethers.parseUnits(amountIn.toString(), DECIMALS[tokenIn]);

            if (dex.type === "v2" && dex.router) {
                // @ts-ignore
                const quotes =
                    await getV2Quote(
                        provider,
                        dex.router,
                        amtIn,
                        // @ts-ignore
                        [TOKENS[tokenIn], TOKENS[tokenOut]],
                        dex.name
                    );
                for (const q of quotes) {
                    pairResults.push({
                        name: dex.name,
                        amountIn,
                        tokenIn,
                        tokenOut,
                        // @ts-ignore
                        amountOut: Number(ethers.formatUnits(q.amountOut, DECIMALS[tokenOut])),
                        price: Number(q.amountOut) / amountIn
                    });
                }
            }

            if (dex.type === "v3" && dex.quoter) {
                // @ts-ignore
                const quotes =
                    // @ts-ignore
                    await getV3Quotes(
                        provider,
                        dex.quoter,
                        amtIn,
                        // @ts-ignore
                        TOKENS[tokenIn],
                        // @ts-ignore
                        TOKENS[tokenOut],
                        dex.name,
                    );
                for (const q of quotes) {
                    pairResults.push({
                        name: dex.name,
                        amountIn,
                        tokenIn,
                        tokenOut,
                        // @ts-ignore
                        amountOut: Number(ethers.formatUnits(q.amountOut, DECIMALS[tokenOut])),
                        price: Number(q.amountOut) / amountIn,
                    });
                }
            }
        }

        aggregated.push({
            pair,
            results: pairResults
        });
    }

    return aggregated;
}
