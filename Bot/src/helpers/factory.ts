import { ethers } from "ethers";

// PancakeSwap Factories
const PCS_V2_FACTORY = "0x6725F303b657a9451d8BA641348b6761A6CC7a17"; // BSC Testnet
const PCS_V3_FACTORY = "0x6ce6D58A46322997d46597C93d070127F70DF812"; // BSC Testnet

// ABIs
const V2_FACTORY_ABI = [
    "function getPair(address tokenA, address tokenB) external view returns (address pair)"
];
const V3_FACTORY_ABI = [
    "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
];

/**
 * Get V2 pair address from factory
 */
export async function getV2Pair(provider: ethers.Provider, tokenA: string, tokenB: string) {
    const factory = new ethers.Contract(PCS_V2_FACTORY, V2_FACTORY_ABI, provider);
    return await factory.getPair(tokenA, tokenB);
}

/**
 * Get V3 pool address from factory
 * fee = 500 (0.05%), 2500 (0.25%), 10000 (1%)
 */
export async function getV3Pool(provider: ethers.Provider, tokenA: string, tokenB: string, fee: number) {
    const factory = new ethers.Contract(PCS_V3_FACTORY, V3_FACTORY_ABI, provider);
    return await factory.getPool(tokenA, tokenB, fee);
}
