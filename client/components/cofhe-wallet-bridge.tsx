"use client";

import { CofheProvider, useCofheAutoConnect } from "@cofhe/react";
import { ReactNode } from "react";
import { usePublicClient, useWalletClient } from "wagmi";

import { VaultKeeperPermitProvider } from "@/components/vaultkeeper/permit-provider";
import { cofheConfig } from "@/lib/cofhe-client";

export function CofheWalletBridge({ children }: { children: ReactNode }) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  return (
    <CofheProvider config={cofheConfig} publicClient={publicClient} walletClient={walletClient}>
      {publicClient && walletClient ? (
        <CofheAutoConnector publicClient={publicClient} walletClient={walletClient} />
      ) : null}
      <VaultKeeperPermitProvider>{children}</VaultKeeperPermitProvider>
    </CofheProvider>
  );
}

function CofheAutoConnector({
  publicClient,
  walletClient,
}: {
  publicClient: ReturnType<typeof usePublicClient>;
  walletClient: NonNullable<ReturnType<typeof useWalletClient>["data"]>;
}) {
  useCofheAutoConnect({ publicClient, walletClient });
  return null;
}
