import {ethers} from "ethers";
import {getOptimalSqrtPriceLimitX96} from './priceLimitCalculator.js';
import {QuoteResult} from './v2Prices.js';  // reuse the same interface

const QUOTER_ABI = [
    "function quoteExactInputSingle((address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut)"
];

//const STANDARD_FEE_TIERS = [500, 3000, 10000];

export async function getV3Quotes(
    provider: ethers.Provider,
    quoterAddress: string,
    amountIn: bigint,
    baseToken: string,
    quoteToken: string,
    dexName: string = "uniswapV3",
    tokenInDecimals: number = 18,
    tokenOutDecimals: number = 18,
    maxSlippagePercent: number = 0.5,
    feeTier: number
): Promise<QuoteResult> {

    const quoter = new ethers.Contract(quoterAddress, QUOTER_ABI, provider);
    const results: QuoteResult[] = [];

    //for (const fee of STANDARD_FEE_TIERS) {
    console.log(`Checking ${dexName} fee tier ${feeTier}...`);
    try {
        // Preliminary quote
        // @ts-ignore
        const preliminaryOut: bigint = await quoter.callStatic.quoteExactInputSingle({
            tokenIn: baseToken,
            tokenOut: quoteToken,
            fee: feeTier,
            amountIn: amountIn,
            sqrtPriceLimitX96: 0n
        });

        // Compute safe sqrtPriceLimit
        const sqrtPriceLimit = getOptimalSqrtPriceLimitX96(
            amountIn,
            preliminaryOut,
            tokenInDecimals,
            tokenOutDecimals,
            maxSlippagePercent
        );

        // Final quote with limit
        // @ts-ignore
        const finalOut: bigint = await quoter.callStatic.quoteExactInputSingle({
            tokenIn: baseToken,
            tokenOut: quoteToken,
            fee: feeTier,
            amountIn: amountIn,
            sqrtPriceLimitX96: sqrtPriceLimit
        });

        // results.push({
        //     dex: dexName,
        //     fee,
        //     amountOut: finalOut
        // });
        return {
                dex: dexName,
                amountOut: finalOut
            };

    } catch (err) {
        console.log(`Skipping ${dexName} fee tier ${fee}, error: ${(err as any).message}`);
    }
    //}

    if (results.length === 0) {
        throw new Error(`No ${dexName} pools found for ${baseToken}/${quoteToken}`);
    }

    return results;
}
