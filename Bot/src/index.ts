import { ethers } from "ethers";
import { chains } from "./chain";
import arbArtifact from "./artifacts/Arbitrage.json"; // adjust path to ABI

// Load private key
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
if (!PRIVATE_KEY) throw new Error("Missing PRIVATE_KEY");

async function start() {
    for (const chain of chains) {
        const provider = new ethers.JsonRpcProvider(chain.rpc);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        const arb = new ethers.Contract(chain.arbitrage, arbArtifact.abi, wallet);

        console.log(`Bot connected to ${chain.name} as ${wallet.address}`);

        await monitorChain(chain, arb, wallet);
    }
}

async function monitorChain(chain: any, arb: ethers.Contract, wallet: ethers.Wallet) {
    console.log(`Monitoring ${chain.name} for arbitrage opportunities...`);

    setInterval(async () => {
        try {
            // 🔎 Replace with your actual price/opportunity detection logic
            const opportunityFound = Math.random() < 0.05; // 5% chance
            if (!opportunityFound) return;

            console.log(`[${chain.name}] Opportunity detected!`);

            // Example params (must be filled with real trade data from your detection logic)
            const params = {
                dexTypeA: 2,
                routerA: chain.routers.v2, // UniswapV2 router
                pathA: ethers.AbiCoder.defaultAbiCoder().encode(
                    ["address[]"],
                    [[chain.tokens.USDC, chain.tokens.WETH]]
                ),
                minOutA: 0,

                dexTypeB: 3,
                routerB: chain.routers.v3, // UniswapV3 router
                pathB: ethers.hexlify(
                    ethers.concat([
                        chain.tokens.WETH,
                        ethers.toBeHex(3000, 3), // fee = 0.3%
                        chain.tokens.USDC,
                    ])
                ),
                minOutB: 0,

                profitToken: chain.tokens.USDC,
                minProfit: ethers.parseUnits("1", 6), // require at least 1 USDC profit

                v2FlashFeeBips: 30, // 0.3%
            };

            const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
                [
                    "tuple(uint8,address,bytes,uint256,uint8,address,bytes,uint256,address,uint256,uint16)"
                ],
                [[
                    params.dexTypeA,
                    params.routerA,
                    params.pathA,
                    params.minOutA,
                    params.dexTypeB,
                    params.routerB,
                    params.pathB,
                    params.minOutB,
                    params.profitToken,
                    params.minProfit,
                    params.v2FlashFeeBips,
                ]]
            );

            if (chain.name === "polygon") {
                // Aave flash loan
                const tx = await arb.aaveFlashArb(
                    chain.aavePool,
                    chain.tokens.USDC,
                    ethers.parseUnits("1000", 6), // borrow 1000 USDC
                    encodedParams
                );
                console.log(`[Polygon] Aave flashloan TX sent: ${tx.hash}`);
                await tx.wait();
                console.log(`[Polygon] TX confirmed.`);
            }

            if (chain.name === "bsc") {
                // V2 flash swap (Pancake)
                const tx = await arb.v2FlashArb(
                    chain.pairs.USDC_WBNB,   // must exist in chain.ts
                    chain.tokens.USDC,
                    ethers.parseUnits("1000", 18), // borrow amount
                    encodedParams
                );
                console.log(`[BSC] Pancake flashswap TX sent: ${tx.hash}`);
                await tx.wait();
                console.log(`[BSC] TX confirmed.`);
            }

        } catch (err: any) {
            console.error(`[${chain.name}] Error:`, err.message || err);
        }
    }, 15_000); // every 15s
}

start().catch(console.error);
