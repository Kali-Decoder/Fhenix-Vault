"use client";

import { useEffect, useRef } from "react";
import { getDefaultChain } from "../config/chains";
import { VAULT_KEEPER_ADDRESS } from "../config/vault_config";
import { useToastContext } from "../contexts/ToastContext";

type ExplorerAddress = {
  hash?: string;
};

type ExplorerTx = {
  hash?: string;
  method?: string;
  from?: ExplorerAddress;
  to?: ExplorerAddress;
};

type ExplorerResponse = {
  items?: ExplorerTx[];
};

function shortHash(value: string) {
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function shortAddress(value?: string) {
  if (!value) return "unknown";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function ContractTxNotifier() {
  const { showInfo } = useToastContext();
  const seenHashesRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const explorerApiUrl = getDefaultChain().explorerApiUrl;

  useEffect(() => {
    if (!explorerApiUrl) return;
    let isDisposed = false;

    const pollTransactions = async () => {
      try {
        const url = `${explorerApiUrl}/addresses/${VAULT_KEEPER_ADDRESS}/transactions`;
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) return;

        const data = (await response.json()) as ExplorerResponse;
        const items = Array.isArray(data.items) ? data.items : [];

        const incoming = items.filter((tx) => typeof tx.hash === "string" && tx.hash.length > 0) as Array<
          ExplorerTx & { hash: string }
        >;

        if (!initializedRef.current) {
          for (const tx of incoming) {
            seenHashesRef.current.add(tx.hash);
          }
          initializedRef.current = true;
          return;
        }

        const newTxs = incoming.filter((tx) => !seenHashesRef.current.has(tx.hash)).slice(0, 3).reverse();

        for (const tx of incoming) {
          seenHashesRef.current.add(tx.hash);
        }

        if (isDisposed || newTxs.length === 0) return;

        for (const tx of newTxs) {
          const from = shortAddress(tx.from?.hash);
          const to = shortAddress(tx.to?.hash);
          const method = tx.method?.trim() || "transaction";
          showInfo(`VaultKeepr tx: ${shortHash(tx.hash)} • ${method} • ${from} -> ${to}`, 6500);
        }
      } catch {
        // Keep polling silent if explorer API is temporarily unavailable.
      }
    };

    pollTransactions();
    const timer = setInterval(pollTransactions, 12000);

    return () => {
      isDisposed = true;
      clearInterval(timer);
    };
  }, [explorerApiUrl, showInfo]);

  return null;
}
