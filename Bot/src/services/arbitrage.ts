import { ethers } from "ethers";
import { getArbitrageContract } from "./contract.js";

export async function aaveFlashArbCall(
    signer: ethers.Signer,
    {
        aavePool,
        asset,
        amount,
        params
    }: { aavePool: string; asset: string; amount: bigint; params: string }
) {
    const arb = getArbitrageContract(signer);
    const tx = await arb.aaveFlashArb(aavePool, asset, amount, params, { gasLimit: 2_000_000 });
    return tx;
}
