export const DEXES = {
    uniswapV2: {
        name: "Uniswap V2",
        type: "v2",
        chains: {
            137: { // Polygon
                factory: "0x5757371414417b8c6caad45baef941abc7d3ab32",
                router:  "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506",
                weth:    "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"
            }
        }
    },

    uniswapV3: {
        name: "Uniswap V3",
        type: "v3",
        chains: {
            137: { // Polygon
                factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
                router:  "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // SwapRouter02
                weth:    "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"
            }
        }
    },

    sushiSwap: {
        name: "SushiSwap",
        type: "v2",
        chains: {
            137: { // Polygon
                factory: "0xc35DADB65012eC5796536bD9864eD8773aBc74C4",
                router:  "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506",
                weth:    "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"
            }
        }
    }
};
