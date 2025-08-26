import { ethers } from "ethers";

// TwoLegArbParams struct encoder:
// Keep field order in sync with Solidity.
export function encodeTwoLegParams(p: {
    dexTypeA: number;
    routerA: string;
    pathA: string[] | string;   // V2: address[], V3: bytes (hex)
    minOutA: string;            // as decimal string in out token units
    dexTypeB: number;
    routerB: string;
    pathB: string[] | string;
    minOutB: string;
    profitToken: string;
    minProfit: string;
    v2FlashFeeBips: number;
}, decimals: { minOutA: number; minOutB: number; minProfit: number }) {

    const coder = ethers.AbiCoder.defaultAbiCoder();

    // V2 expects path as address[] in bytes via abi.encode(...)
    const pathAEncoded = Array.isArray(p.pathA)
        ? coder.encode(["address[]"], [p.pathA])
        : p.pathA;

    const pathBEncoded = Array.isArray(p.pathB)
        ? coder.encode(["address[]"], [p.pathB])
        : p.pathB;

    const encoded = coder.encode(
        [
            "tuple(uint8,address,bytes,uint256,uint8,address,bytes,uint256,address,uint256,uint16)"
        ],
        [[
            p.dexTypeA,
            p.routerA,
            pathAEncoded,
            ethers.parseUnits(p.minOutA, decimals.minOutA),
            p.dexTypeB,
            p.routerB,
            pathBEncoded,
            ethers.parseUnits(p.minOutB, decimals.minOutB),
            p.profitToken,
            ethers.parseUnits(p.minProfit, decimals.minProfit),
            p.v2FlashFeeBips
        ]]
    );

    return encoded;
}
