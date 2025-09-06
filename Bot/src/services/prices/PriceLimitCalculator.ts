/**
* Compute an optimal sqrtPriceLimitX96 for a single-hop Uniswap V3 trade.
* @param amountIn - input token amount
* @param expectedOut - output token amount from Quoter
* @param tokenInDecimals - decimals of input token
* @param tokenOutDecimals - decimals of output token
* @param maxSlippagePercent - maximum slippage allowed (0.5 = 0.5%)
*/
export function getOptimalSqrtPriceLimitX96(
amountIn: bigint,
expectedOut: bigint,
tokenInDecimals: number,
tokenOutDecimals: number,
maxSlippagePercent: number
): bigint {

// Convert amounts to normalized prices
// P = amountOut / amountIn (adjusted for decimals)
const normalizedIn = Number(amountIn) / 10 ** tokenInDecimals;
const normalizedOut = Number(expectedOut) / 10 ** tokenOutDecimals;
const price = normalizedOut / normalizedIn;

// Apply slippage
const minPrice = price * (1 - maxSlippagePercent / 100);

// Convert to sqrtPriceX96
const sqrtPrice = Math.sqrt(minPrice) * 2 ** 96;

return BigInt(Math.floor(sqrtPrice));
}
