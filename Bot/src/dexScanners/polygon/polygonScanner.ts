import {ethers} from "ethers";
import {TOKENS} from "../../config/tokens.js";
import {Pair} from "../../config/pairs.js";
import {PriceList, getPrices} from "../../services/priceAggregtor/priceAggregator.js"
import {comparePriceLists} from "../../utils/priceListComparison.js";
import {subscribeOnChainEvents} from "../../services/eventSubscriber/subscribeOnChainEvents.js";


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
export async function findSinglePairArbPolygon(
    provider: ethers.AbstractProvider,
    pairs: Pair[],
    dexNames: string[] //{dexNames: ["uniswapV2", "uniswapV3", "sushiswap"]}
): Promise<Opportunity | null> {

    // vars
    let priceList: PriceList,
        intervalMs: number = 3000; // the interval should also be dynamic/different per chain

    try {
        // make initial price list
        priceList = await getPrices(
            provider,
            pairs,
            dexNames
        );


        console.log('stating the subscription');
        console.log('initial list:');
        console.log(priceList)

        //todo: continue here
        // do the subscriptions
        for (const {pair, results} of priceList) {
            await subscribeOnChainEvents({
                provider,
                pair,
                dexNames,
                onEvent: async (eventName: any, eventData: any) => {
                    console.log(`[Polygon] Event received: ${eventName}`, eventData);
                    console.log('updating the pricelist')

                    // todo: add the real logic here.
                    // for now, we just update the price list
                    priceList = await getPrices(provider, pairs, dexNames);
                }
            });
        }

        // todo: make the interval dynamic/different per chain
        // fallback polling every 3 seconds
        setInterval(async () => {
            const newPrices: PriceList = await getPrices(
                provider,
                pairs,
                dexNames
            );
            if (!comparePriceLists(priceList, newPrices))
                priceList = newPrices;

        }, intervalMs)


    } catch (err: any) {
        console.error(`polygon scan error`, err.message);
    }


}




