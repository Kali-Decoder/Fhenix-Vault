"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { WagmiAdapter } from "@cofhe/sdk/adapters";
import { getCofheClient } from "@/lib/cofhe-client";

type CofheCtx = {
  ready: boolean;
  client: ReturnType<typeof getCofheClient>;
};

const CofheReactContext = createContext<CofheCtx | null>(null);

export function CofheProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!isConnected || !address || !publicClient || !walletClient) {
        const client = getCofheClient();
        client?.disconnect();
        if (!cancelled) setReady(false);
        return;
      }

      try {
        const client = getCofheClient();
        if (!client) {
          if (!cancelled) setReady(false);
          return;
        }
        const { publicClient: pc, walletClient: wc } = await WagmiAdapter(
          // CoFHE adapter typings target a slightly different viem client shape than wagmi exports.
          walletClient as never,
          publicClient as never
        );
        await client.connect(pc as never, wc as never);
        await client.permits.getOrCreateSelfPermit();
        if (!cancelled) setReady(true);
      } catch {
        const client = getCofheClient();
        client?.disconnect();
        if (!cancelled) setReady(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isConnected, address, publicClient, walletClient]);

  const ctxValue = useMemo(
    () => ({
      ready,
      client: getCofheClient(),
    }),
    [ready]
  );

  return <CofheReactContext.Provider value={ctxValue}>{children}</CofheReactContext.Provider>;
}

export function useCofhe() {
  const ctx = useContext(CofheReactContext);
  if (!ctx) {
    throw new Error("useCofhe must be used within CofheProvider");
  }
  return ctx;
}
