"use client";

import { ReactNode } from "react";

import { VaultKeeperPermitProvider } from "@/components/vaultkeeper/permit-provider";
import { CofheProvider } from "@/contexts/cofhe-provider";

export function CofheWalletBridge({ children }: { children: ReactNode }) {
  return (
    <CofheProvider>
      <VaultKeeperPermitProvider>{children}</VaultKeeperPermitProvider>
    </CofheProvider>
  );
}
