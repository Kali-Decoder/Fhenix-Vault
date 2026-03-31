import { createCofheClient, createCofheConfig } from "@cofhe/sdk/web";
import { chains } from "@cofhe/sdk/chains";

type CofheClient = ReturnType<typeof createCofheClient>;

let cofheClient: CofheClient | null = null;

export function getCofheClient() {
  if (typeof window === "undefined") return null;
  if (!cofheClient) {
    const config = createCofheConfig({
      supportedChains: [chains.arbSepolia],
    });
    cofheClient = createCofheClient(config);
  }
  return cofheClient;
}
