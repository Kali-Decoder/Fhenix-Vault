import { Chain } from "viem";

export type AppChain = Chain & {
  explorerApiUrl?: string;
};

const baseSepoliaRpc =
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const arbSepoliaRpc =
  process.env.NEXT_PUBLIC_ARB_SEPOLIA_RPC_URL ||
  process.env.ARB_SEPOLIA_RPC_URL ||
  "https://sepolia-rollup.arbitrum.io/rpc";

export const baseSepolia: AppChain = {
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Sepolia Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [baseSepoliaRpc],
    },
    public: {
      http: [baseSepoliaRpc],
    },
  },
  blockExplorers: {
    default: {
      name: "BaseScan",
      url: "https://sepolia.basescan.org",
    },
  },
  testnet: true,
};

export const arbSepolia: AppChain = {
  id: 421614,
  name: "Arbitrum Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Sepolia Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [arbSepoliaRpc],
    },
    public: {
      http: [arbSepoliaRpc],
    },
  },
  blockExplorers: {
    default: {
      name: "Arbiscan",
      url: "https://sepolia.arbiscan.io",
    },
  },
  testnet: true,
};

export const allChains: AppChain[] = [baseSepolia, arbSepolia];
export const mainnetChains: AppChain[] = [];
export const testnetChains: AppChain[] = [baseSepolia, arbSepolia];
export const popularChains: AppChain[] = [baseSepolia, arbSepolia];

export const getChainById = (chainId: number): AppChain | undefined => {
  return allChains.find((chain) => chain.id === chainId);
};

export const getDefaultChainId = () => {
  const envValue = process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || process.env.DEFAULT_CHAIN_ID || "";
  const parsed = Number(envValue);
  return Number.isFinite(parsed) ? parsed : baseSepolia.id;
};

export const getDefaultChain = () => {
  return getChainById(getDefaultChainId()) ?? baseSepolia;
};

export const getChainDisplayName = (chain: AppChain): string => {
  return chain.name;
};
