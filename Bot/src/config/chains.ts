export const CHAIN = {
    name: "polygon",
    chainId: 137
} as const;

export const RPC = {
    polygon: process.env.RPC_URL_POLYGON || ""
};
