// src/config/chains.ts

export interface ChainConfig {
    name: string
    chainId: number
    rpcUrl: string
    explorerUrl: string
    wrappedNative: string
    tokens: Record<string, string>
    aavePool?: string
    dexes: {
        uniswapV2Router?: string
        uniswapV3Factory?: string
        pancakeRouter?: string
    }
    flashPairs?: Record<string, string>
}

const ENV = process.env.NETWORK_ENV || "testnet" // "mainnet" or "testnet"

// =======================
// POLYGON CONFIG
// =======================
const polygon = {
    mainnet: {
        name: "Polygon Mainnet",
        chainId: 137,
        rpcUrl: process.env.POLYGON_RPC_URL!,
        explorerUrl: "https://polygonscan.com",
        wrappedNative: "0x0d500B1d8E8eE1e9dC6Dd35fA8a82B39E3c57d0F", // WMATIC
        tokens: {
            WMATIC: "0x0d500B1d8E8eE1e9dC6Dd35fA8a82B39E3c57d0F",
            USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
            WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
        },
        aavePool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD", // Aave V3 on Polygon
        dexes: {
            uniswapV2Router: "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506", // SushiSwap (UniV2 fork)
            uniswapV3Factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984", // Uniswap V3 factory
        },
    },
    testnet: {
        name: "Polygon Mumbai",
        chainId: 80001,
        rpcUrl: process.env.POLYGON_RPC_URL!,
        explorerUrl: "https://mumbai.polygonscan.com",
        wrappedNative: "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889", // WMATIC (testnet)
        tokens: {
            WMATIC: "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
            USDC: "0x6e3cAF71d2fAE2C9d2970e6cC3dF190A7C83eF06",
            WETH: "0x6CfCfa7aE97e6510f24dC3E3c29D8A71208f7C35",
        },
        aavePool: "0x771A45a3c89F443E5468f88E7aFF9c0d29eAE8D6", // Aave test pool
        dexes: {
            uniswapV2Router: "0x8954AfA98594b838bda56FE4C12a09D7739D179b", // Quickswap V2 (testnet)
        },
        flashPairs: {},
    },
}

// =======================
// BSC CONFIG
// =======================
const bsc = {
    mainnet: {
        name: "Binance Smart Chain",
        chainId: 56,
        rpcUrl: process.env.BSC_RPC_URL!,
        explorerUrl: "https://bscscan.com",
        wrappedNative: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
        tokens: {
            WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
            BUSD: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
            USDT: "0x55d398326f99059fF775485246999027B3197955",
        },
        aavePool: undefined, // not supported on BSC
        dexes: {
            pancakeRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E", // PancakeSwap V2
        },
        flashPairs: {
            PancakeV2_WBNB_USDT: "0x16b9a82891338f9ba80e2d6970fdda79d1eb0dae",
            PancakeV3_USDT_WBNB: "0x36696169c63e42cd08ce11f5deebbcebae652050",
        },
    },
    testnet: {
        name: "BSC Testnet",
        chainId: 97,
        rpcUrl: process.env.BSC_RPC_URL!,
        explorerUrl: "https://testnet.bscscan.com",
        wrappedNative: "0xae13d989dac2f0debff460ac112a837c89baa7cd", // WBNB (testnet)
        tokens: {
            WBNB: "0xae13d989dac2f0debff460ac112a837c89baa7cd",
            BUSD: "0x78867BbEeF44f2326bF8DDd1941a4439382EF2A7", // Testnet BUSD
            USDT: "0x7ef95a0Fe3fFfFfFfFFfFFfFFfFFfFFfFFfFFfFF", // Placeholder USDT (testnet faucet token)
        },
        aavePool: undefined, // not on BSC
        dexes: {
            pancakeRouter: "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3", // PancakeSwap testnet router
        },
        flashPairs: {
            PancakeV2_WBNB_USDT: "0x44253faFe93140E9d41C2Ae2C4c00E49638Dff97", // ✅ working testnet pair
            PancakeV3_USDT_WBNB: "", // no stable V3 pool on testnet
        },
    },
}

// =======================
// EXPORT ACTIVE CHAINS
// =======================
export const CHAINS = {
    polygon: polygon[ENV as "mainnet" | "testnet"],
    bsc: bsc[ENV as "mainnet" | "testnet"],
}
