export type Pair = {
    baseToken: string;
    quoteToken: string;
    amountIn: number;
};

export const PAIRS : Pair[] = [
    {
        baseToken: "USDC",
        quoteToken: "WETH",
        amountIn: 1000  // borrow 1,000 USDC
    },
    {
        baseToken: "WETH",
        quoteToken: "USDC",
        amountIn: 1  // borrow 1 WETH
    }
]