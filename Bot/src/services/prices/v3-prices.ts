import { ethers } from "ethers";

// Minimal V3 Quoter ABI
const QUOTER_ABI = [
    "function quoteExactInputSingle((address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut)"
];


// Standard fee tiers
const STANDARD_FEE_TIERS = [500, 3000, 10000]; // 0.05%, 0.3%, 1%

export async function getV3Quote(
    provider: ethers.Provider,
    quoterAddress: string,
    amountIn: bigint,
    baseToken: string,
    quoteToken: string
): Promise<{ bestOut: bigint; bestFee: number }> {
    const quoter = new ethers.Contract(quoterAddress, QUOTER_ABI, provider);
    let bestOut = 0n;
    let bestFee = STANDARD_FEE_TIERS[0];

    for (const fee of STANDARD_FEE_TIERS) {
        try {
            // @ts-ignore
            console.log('calling the quoter with fee: ' + fee + '');
            const out: bigint = await quoter.callStatic.quoteExactInputSingle({
                tokenIn: baseToken,
                tokenOut: quoteToken,
                fee: fee,
                amountIn: amountIn,
                sqrtPriceLimitX96: 0n
            });

            console.log('the output is: ' + out + '');

            if (out > bestOut) {
                bestOut = out;
                bestFee = fee;
            }
        } catch (err) {
            // Pool may not exist for this fee tier, skip silently
            // do nothing.
        }
    }

    if (bestOut === 0n) {
        throw new Error(`No V3 pool found for ${baseToken}/${quoteToken}`);
    }

    console.log(`Best V3 quote for ${baseToken}/${quoteToken}: ${bestOut} (fee tier ${bestFee})`);
    return { bestOut, bestFee };
}
