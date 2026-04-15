import { createCofheClient, createCofheConfig } from "@cofhe/sdk/web";
import { chains } from "@cofhe/sdk/chains";

export const cofheConfig = createCofheConfig({
  supportedChains: [chains.arbSepolia],
});

let cofheClient: ReturnType<typeof createCofheClient> | null = null;

export function getCofheClient() {
  if (!cofheClient) {
    cofheClient = createCofheClient(cofheConfig);
  }
  return cofheClient;
}
