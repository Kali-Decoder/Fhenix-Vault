import { createCofheConfig } from "@cofhe/react";
import { arbSepolia as cofheArbSepolia } from "@cofhe/sdk/chains";

export const cofheConfig = createCofheConfig({
  environment: "react",
  supportedChains: [cofheArbSepolia],
  react: {
    enableShieldUnshield: false,
    autogeneratePermits: true,
    shareablePermits: false,
    position: "bottom-right",
    initialTheme: "dark",
  },
});
