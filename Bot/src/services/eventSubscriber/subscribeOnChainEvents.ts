import { ethers } from "ethers";
import { LP_EVENTS, UNISWAP_V2_EVENTS_ABI, UNISWAP_V3_EVENTS_ABI } from "./events.js";
import { Pair } from "../../config/pairs.js";

type OnEventCallback = (eventName: keyof typeof LP_EVENTS, eventData: any) => Promise<void> | void;

export type SubscribeParams = {
    provider: ethers.AbstractProvider;
    pair: Pair;
    dexNames: string[];
    onEvent: OnEventCallback;
};

/**
 * Subscribes to on-chain liquidity pool events for a given pair.
 * Supports Uniswap V2-style and V3-style pools.
 */
export async function subscribeOnChainEvents({
     provider,
     pair,
     dexNames,
     onEvent,
 }: SubscribeParams) {
    // Loop through all dexes we care about
    for (const dex of dexNames) {
        let abi: string[];
        let contractAddress: string | undefined;

        if (dex.toLowerCase().includes("v2")) {
            abi = UNISWAP_V2_EVENTS_ABI;
            contractAddress = pair.addresses[dex]; // Pair config must map dexName -> poolAddress
        } else if (dex.toLowerCase().includes("v3")) {
            abi = UNISWAP_V3_EVENTS_ABI;
            contractAddress = pair.addresses[dex];
        } else {
            console.warn(`[subscribeOnChainEvents] Unsupported DEX type: ${dex}`);
            continue;
        }

        if (!contractAddress) {
            console.warn(`[subscribeOnChainEvents] No address found for pair ${pair.symbol} on ${dex}`);
            continue;
        }

        // Make contract
        const contract = new ethers.Contract(contractAddress, abi, provider);

        // Subscribe to events
        abi.forEach((eventFragment) => {
            const eventName = eventFragment.split(" ")[1].split("(")[0]; // crude parse, e.g. "Swap"

            contract.on(eventName, async (...args) => {
                const event = args[args.length - 1]; // last arg is the event object
                try {
                    await onEvent(eventName as keyof typeof LP_EVENTS, {
                        dex,
                        pair: pair.symbol,
                        args,
                        event,
                    });
                } catch (err) {
                    console.error(`[subscribeOnChainEvents] Error in onEvent handler for ${eventName}`, err);
                }
            });
        });

        console.log(`[subscribeOnChainEvents] Subscribed to ${pair.symbol} on ${dex}`);
    }
}
