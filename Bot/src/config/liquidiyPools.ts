export const liquidityPools = {
    polygon: {
        sushiswap: {
            "USDC-WETH": "0x397FF1542f962076d0BFE58eA045FfA2d347ACa0"
        },
        uniswapV2: {
            "USDC-WETH": "0x67473ebdbfd1e6fc4367462d55ed1ee56e1963fa"
            //todo add more pairs
        },
        sushiswapV3: {
            "USDC-WETH": {
                500: "0xa4d8c89f0c20efbe54cba9e7e7a7e509056228d9", // 0.05% fee
                3000: "0x19c5505638383337d2972ce68b493ad78e315147", // 0.3% fee
                10000: "0x12bd7ae45acf2504bed144eabc6ff5bbebd91563", // 1% fee
            }
        },
        sushiswapV4: {
          // todo: research v4
        },

    },
    // todo: add more chains
}
