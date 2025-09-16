// services/eventSubscriber/events.ts

// Common liquidity pool events across DEX types
export const LP_EVENTS = {
    SWAP: "Swap",
    MINT: "Mint",    // AddLiquidity (V2) / IncreaseLiquidity (V3)
    BURN: "Burn",    // RemoveLiquidity (V2) / DecreaseLiquidity (V3)
    SYNC: "Sync",    // V2 only: reserves updated
    COLLECT: "Collect" // V3 only: fees collected
};

// -------------------------
// Uniswap V2 (and forks: Sushi, Pancake, QuickSwap, etc.)
// -------------------------
export const UNISWAP_V2_EVENTS_ABI = [
    // Swap: emitted on every trade
    "event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)",

    // Liquidity added
    "event Mint(address indexed sender, uint amount0, uint amount1)",

    // Liquidity removed
    "event Burn(address indexed sender, uint amount0, uint amount1, address indexed to)",

    // Reserves updated
    "event Sync(uint112 reserve0, uint112 reserve1)"
];

// -------------------------
// Uniswap V3 (and forks: Algebra, Pancake V3, etc.)
// -------------------------
export const UNISWAP_V3_EVENTS_ABI = [
    // Swap: emitted on every trade
    "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)",

    // Liquidity increased
    "event Mint(address sender, address indexed owner, int24 tickLower, int24 tickUpper, uint128 amount, uint256 amount0, uint256 amount1)",

    // Liquidity decreased
    "event Burn(address indexed owner, int24 tickLower, int24 tickUpper, uint128 amount, uint256 amount0, uint256 amount1)",

    // Fees collected
    "event Collect(address indexed owner, address recipient, int24 tickLower, int24 tickUpper, uint128 amount0, uint128 amount1)"
];
