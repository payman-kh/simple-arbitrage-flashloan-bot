// ⚠️ Polygon has USDC (native) and USDC.e (bridged). Choose one and be consistent across pools.
// Provide canonical WETH on Polygon too.

export const TOKENS = {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
};

// Standard decimals (verify for your chosen addresses)
export const DECIMALS = {
    WETH: 18,
    USDC: 6
};
