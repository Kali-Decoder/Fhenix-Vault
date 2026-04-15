import { Ethers6Adapter } from "@cofhe/sdk/adapters";
import type { CofheClient } from "@cofhe/sdk";
import { createCofheClient, createCofheConfig } from "@cofhe/sdk/node";
import { arbSepolia, baseSepolia, hardhat } from "@cofhe/sdk/chains";

export async function getCofheClientForEthers6(params: {
  // Intentionally structural types to avoid requiring `ethers` as a direct dependency for script compilation.
  provider: { send: (method: string, params?: unknown[]) => Promise<unknown> };
  signer: { getAddress: () => Promise<string> };
}): Promise<CofheClient> {
  const config = createCofheConfig({
    supportedChains: [arbSepolia, baseSepolia, hardhat],
  });

  const client = createCofheClient(config);
  const { publicClient, walletClient } = await Ethers6Adapter(params.provider, params.signer);
  await client.connect(publicClient, walletClient);
  return client;
}
