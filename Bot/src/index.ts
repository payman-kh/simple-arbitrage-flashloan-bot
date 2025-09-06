import "dotenv/config";
import { ethers } from "ethers";
import { TOKENS, DECIMALS } from "./config/tokens.js";
import {PAIRS} from "./config/pairs.js";
import { V2_ROUTERS } from "./config/dexes.js";
import { AAVE } from "./config/aave.js";
import { encodeTwoLegParams } from "./utils/encoding.js";
import { provider, makeWallet } from "./services/provider.js";
import { findSinglePairArb } from "./services/scanner/scanner.js";
import { aaveFlashArbCall } from "./services/arbitrage.js";

console.log("ENV LOADED:", process.env.PRIVATE_KEY?.slice(0,10), process.env.RPC_URL_POLYGON);

// Basic safety config
const MIN_ABSOLUTE_PROFIT = "5";   // in base token units
/*
// todo: make the minimum dynamic
const gasCostInBase = estimateGasCost(provider, base); // gas in WETH or USDC
const flashLoanFee = (amount * 5n) / 10000n; // Aave fee = 0.05%
const buffer = (amount * 5n) / 10000n; // extra 0.05% safety margin

const minProfit = gasCostInBase + flashLoanFee + buffer;
* */

const TEST_NOT_BROADCAST = true;   // set false to actually send tx
const FLASH_FEE_BIPS_V2_DEFAULT = 30; // 0.30% for v2-style flash swaps (not used for Aave)

async function main() {
    //todo: make it dynamic for when looping through chains
    if (!process.env.RPC_URL_POLYGON) throw new Error("Missing RPC_URL_POLYGON");

    // wallet instance to sign the transactions
    const wallet = makeWallet();

    let bestOpp: {
        opp: Awaited<ReturnType<typeof findSinglePairArb>>; //type Opportunity
        base: keyof typeof TOKENS;
        quote: keyof typeof TOKENS;
    } | null = null;
    let bestProfit : bigint = 0n;

    // TODO: loop indefinitely with a cool-off period (so th bot runs 24/7)
    // 🔍 Scan both borrow-directions
    for (const { base, quote, amount } of PAIRS) {
        const opp = await findSinglePairArb(provider, base as any, quote as any, amount);
        if (!opp) continue;

        const gross = opp.expectedOut;
        const amtIn = opp.amountIn;
        const delta = gross - amtIn;

        // @ts-ignore
        console.log(`[SCAN] Borrow ${base}: ${ethers.formatUnits(amtIn, DECIMALS[base])} -> Δ ${ethers.formatUnits(delta, DECIMALS[base])} ${base}`);

        if (delta > bestProfit) {
            bestProfit = delta;
            // @ts-ignore
            bestOpp = { opp, base, quote };
        }
    }

    if (!bestOpp) {
        console.log("No arbitrage found in either direction.");
        return;
    }

    const { opp, base, quote } = bestOpp;
    // @ts-ignore
    const { buyOn, sellOn } = opp; // opp is defined

    if (!buyOn || !sellOn) {
        throw new Error("Invariant violated: missing buyOn/sellOn on opportunity");
    }

    // @ts-ignore
    const gross = opp.expectedOut;
    // @ts-ignore
    const amtIn = opp.amountIn;
    const delta = gross - amtIn;

    // @ts-ignore
    console.log(`[ARB] Best opportunity: borrow ${base}, ${opp.direction} ${opp.buyOn} -> ${opp.sellOn}`);
    console.log(` in:   ${ethers.formatUnits(amtIn, DECIMALS[base])} ${base}`);
    console.log(` out:  ${ethers.formatUnits(gross, DECIMALS[base])} ${base}`);
    console.log(` diff: ${ethers.formatUnits(delta, DECIMALS[base])} ${base}`);

    // Build params for the contract
    const pathA = [TOKENS[base], TOKENS[quote]];
    const pathB = [TOKENS[quote], TOKENS[base]];

    type RouterKey = keyof typeof V2_ROUTERS;
    const buyRouter = V2_ROUTERS[buyOn as RouterKey];
    const sellRouter = V2_ROUTERS[sellOn as RouterKey];


    // naive slippage: 0.3% buffer
    // todo: make the slippage buffer dynamic
    // @ts-ignore
    const minOutA = (opp.leg1Out * 997n) / 1000n;
    // @ts-ignore
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

    // Choose the flash-loan asset dynamically
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
