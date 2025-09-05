export const CHAIN = {
    name: "polygon",
    chainId: 137
} as const;

// TEST
// export const RPC = {
//     polygon: process.env.RPC_URL_POLYGON || ""
// };
export const RPC = {
    polygon: process.env.RPC_URL_POLYGON || ""
};
