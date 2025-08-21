// src/config/chains.ts

export interface ChainConfig {
    name: string
    chainId: number
    rpcUrl: string
    explorerUrl: string
    wrappedNative: string // WETH, WMATIC, WBNB, etc.
    aavePool?: string     // only if Aave flashloans supported on this chain
}

export const CHAINS: Record<string, ChainConfig> = {
    // ethereum: {
    //     name: "Ethereum Mainnet",
    //     chainId: 1,
    //     rpcUrl: process.env.ETHEREUM_RPC_URL!,
    //     explorerUrl: "https://etherscan.io",
    //     wrappedNative: "0xC02aaa39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
    //     aavePool: "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9",      // Aave v2 pool
    // },

    polygon: {
        name: "Polygon Mainnet",
        chainId: 137,
        rpcUrl: process.env.POLYGON_RPC_URL!,
        explorerUrl: "https://polygonscan.com",
        wrappedNative: "0x0d500B1d8E8eE1e9dC6Dd35fA8a82B39E3c57d0F", // WMATIC
        aavePool: "0x8dff5e27ea6b7ac08ebfdf9eb090f32ee9a30fcf",      // Aave v2 pool on Polygon
    },

    bsc: {
        name: "Binance Smart Chain",
        chainId: 56,
        rpcUrl: process.env.BSC_RPC_URL!,
        explorerUrl: "https://bscscan.com",
        wrappedNative: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
        // ⚠️ Aave is not live on BSC; you'd need PancakeSwap flashloans or another lender
        aavePool: undefined,
    },

    // sepolia: {
    //     name: "Ethereum Sepolia Testnet",
    //     chainId: 11155111,
    //     rpcUrl: process.env.SEPOLIA_RPC_URL!,
    //     explorerUrl: "https://sepolia.etherscan.io",
    //     wrappedNative: "0x...wethSepolia", // update with correct WETH on Sepolia
    // },
}
