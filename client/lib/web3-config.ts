import { createConfig, http, injected } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";

export const wagmiConfig = createConfig({
  autoConnect: true,
  chains: [arbitrumSepolia],
  connectors: [injected()],
  transports: {
    [arbitrumSepolia.id]: http("https://sepolia-rollup.arbitrum.io/rpc"),
  },
});
