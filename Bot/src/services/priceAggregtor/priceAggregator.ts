import {ethers} from "ethers";
import {getV2Quote} from "../priceFetcher/v2Prices.js";
import {getV3Quotes} from "../priceFetcher/v3Prices.js";
import {TOKENS, DECIMALS} from "../../config/tokens.js";
import {DEXES} from "../../config/dexes.js";
import {Pair} from "../../config/pairs.js";

// ---------- Types ----------
export type DexQuote = {  // quote result from querying a dex
    name: string;   // name of the dex: uniswap, sushiswap, ...
    amountIn: bigint;
    baseToken: string;
    quoteToken: string;
    amountOut: number;
    price: number;
    //feeTier?: number; // optional, only for V3
};

// array of aggregated quotes for each pair
export type PriceList = {
    pair: Pair;
    results: DexQuote[];
}[];

export type DexConfig = {
    name: string;
    type: "v2" | "v3";
    router?: string;   // for V2
    quoter?: string;   // for V3
    //feeTier?: number;  // optional, for V3
};



// ---------- Main aggregator ----------
export async function getPrices(
    provider: ethers.Provider,
    pairs: Pair[],
    dexNames: string[]
): Promise<PriceList> {

    // Determine which DEX configs to use
    // @ts-ignore
    let dexConfigs: DexConfig[] = dexNames.map(name => DEXES[name]);


    const priceList: PriceList = [];

    for (const pair of pairs) {
        const {baseToken, quoteToken, amountIn} = pair;
        const pairResults: DexQuote[] = [];

        for (const dex of dexConfigs) {
            // @ts-ignore
            const amount = ethers.parseUnits(amountIn.toString(), DECIMALS[baseToken]);

            // add prices of the uniswapv2 or sushiswap to the price list
            if (dex.type === "v2" && dex.router) {
                // @ts-ignore
                const quote =
                    await getV2Quote(
                        provider,
                        dex.router,
                        amount,
                        // @ts-ignore
                        [TOKENS[baseToken], TOKENS[quoteToken]],
                        dex.name
                    );

                pairResults.push({
                    name: dex.name,
                    amountIn: amount,
                    baseToken,
                    quoteToken,
                    // @ts-ignore
                    amountOut: Number(ethers.formatUnits(quote.amountOut, DECIMALS[quoteToken])),
                    // @ts-ignore
                    price: Number(quote.amountOut) / amount
                });

            }

            // add prices of the uniswapv3 to the price list
            if (dex.type === "v3" && dex.quoter) {
                // @ts-ignore
                const quotes =
                    // @ts-ignore
                    await getV3Quotes(
                        provider,
                        dex.quoter,
                        amount,
                        // @ts-ignore
                        TOKENS[baseToken],
                        // @ts-ignore
                        TOKENS[quoteToken],
                        dex.name,
                    );
                for (const q of quotes) {
                    pairResults.push({
                        name: dex.name,
                        amountIn: amount,
                        baseToken,
                        quoteToken,
                        // @ts-ignore
                        amountOut: Number(ethers.formatUnits(q.amountOut, DECIMALS[quoteToken])),
                        price: Number(q.amountOut) / amountIn,
                    });
                }
            }
        }

        priceList.push({
            pair,
            results: pairResults
        });
    }

    return priceList;
}
