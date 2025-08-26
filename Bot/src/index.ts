import "dotenv/config";
import { ethers } from "ethers";
import { provider, makeWallet } from "./services/provider.js";
import { findSinglePairArb } from "./services/scanner.js";
import { TOKENS, DECIMALS } from "./config/tokens.js";
import { V2_ROUTERS } from "./config/dexes.js";
import { AAVE } from "./config/aave.js";
import { encodeTwoLegParams } from "./utils/encoding.js";
import { aaveFlashArbCall } from "./services/arbitrage.js";

// Basic safety config
const MIN_ABSOLUTE_PROFIT = "5";   // in base token units
const TEST_NOT_BROADCAST = true;   // set false to actually send tx
const FLASH_FEE_BIPS_V2_DEFAULT = 30; // 0.30% for v2-style flash swaps (not used for Aave)

// Which pairs + trial sizes to check
const PAIRS = [
    { base: "USDC", quote: "WETH", amount: "1000" }, // borrow 1,000 USDC
    { base: "WETH", quote: "USDC", amount: "1" }     // borrow 1 WETH
] as const;

async function main() {
    if (!process.env.RPC_URL_POLYGON) throw new Error("Missing RPC_URL_POLYGON");
    const wallet = makeWallet();

    let bestOpp: {
        opp: Awaited<ReturnType<typeof findSinglePairArb>>;
        base: keyof typeof TOKENS;
        quote: keyof typeof TOKENS;
    } | null = null;
    let bestProfit = 0n;

    // 🔍 Scan both borrow directions
    for (const { base, quote, amount } of PAIRS) {
        const opp = await findSinglePairArb(provider, base as any, quote as any, amount);
        if (!opp) continue;

        const gross = opp.expectedOut;
        const amtIn = opp.amountIn;
        const delta = gross - amtIn;

        console.log(`[SCAN] Borrow ${base}: ${ethers.formatUnits(amtIn, DECIMALS[base])} -> Δ ${ethers.formatUnits(delta, DECIMALS[base])} ${base}`);

        if (delta > bestProfit) {
            bestProfit = delta;
            bestOpp = { opp, base, quote };
        }
    }

    if (!bestOpp) {
        console.log("No arbitrage found in either direction.");
        return;
    }

    const { opp, base, quote } = bestOpp;
    const gross = opp.expectedOut;
    const amtIn = opp.amountIn;
    const delta = gross - amtIn;

    console.log(`[ARB] Best opportunity: borrow ${base}, ${opp.direction} ${opp.buyOn} -> ${opp.sellOn}`);
    console.log(` in:  ${ethers.formatUnits(amtIn, DECIMALS[base])} ${base}`);
    console.log(` out: ${ethers.formatUnits(gross, DECIMALS[base])} ${base}`);
    console.log(` diff:${ethers.formatUnits(delta, DECIMALS[base])} ${base}`);

    // Build params for contract
    const pathA = [TOKENS[base], TOKENS[quote]];
    const pathB = [TOKENS[quote], TOKENS[base]];
    const buyRouter = V2_ROUTERS[opp.buyOn];
    const sellRouter = V2_ROUTERS[opp.sellOn];

    // naive slippage: 0.3% buffer
    const minOutA = (opp.leg1Out * 997n) / 1000n;
    const minOutB = (opp.leg2Out * 997n) / 1000n;

    const params = encodeTwoLegParams(
        {
            dexTypeA: 2,
            routerA: buyRouter,
            pathA,
            minOutA: ethers.formatUnits(minOutA, DECIMALS[quote]),
            dexTypeB: 2,
            routerB: sellRouter,
            pathB,
            minOutB: ethers.formatUnits(minOutB, DECIMALS[base]),
            profitToken: TOKENS[base],
            minProfit: MIN_ABSOLUTE_PROFIT,
            v2FlashFeeBips: FLASH_FEE_BIPS_V2_DEFAULT
        },
        {
            minOutA: DECIMALS[quote],
            minOutB: DECIMALS[base],
            minProfit: DECIMALS[base]
        }
    );

    // Choose flash-loan asset dynamically
    const aavePool = AAVE.poolV3;
    const asset = TOKENS[base];
    const amount = amtIn;

    if (TEST_NOT_BROADCAST) {
        console.log("[DRY-RUN] Would call aaveFlashArb with:", {
            aavePool,
            asset,
            amount: amount.toString(),
            params
        });
    } else {
        const tx = await aaveFlashArbCall(wallet, { aavePool, asset, amount, params });
        console.log("Sent aaveFlashArb tx:", tx.hash);
        const rec = await tx.wait();
        console.log("Mined:", rec?.transactionHash);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
