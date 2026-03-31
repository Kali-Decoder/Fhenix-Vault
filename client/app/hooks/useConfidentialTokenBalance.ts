"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { type Abi, zeroAddress } from "viem";
import { useCofheClient } from "./useCofheClient";
import { ERC20_ABI } from "../config/vault_config";

type BalanceState = {
  value: bigint | null;
  loading: boolean;
  error: string | null;
};

export function useConfidentialTokenBalance(tokenAddress?: string) {
  const { address, isConnected } = useAccount();
  const { decryptUint64, connected } = useCofheClient();

  const enabled = isConnected && !!address && !!tokenAddress && tokenAddress !== zeroAddress;

  const { data: symbolRaw } = useReadContract({
    address: (tokenAddress ?? zeroAddress) as `0x${string}`,
    abi: ERC20_ABI as unknown as Abi,
    functionName: "symbol",
    query: { enabled },
  });

  const { data: decimalsRaw } = useReadContract({
    address: (tokenAddress ?? zeroAddress) as `0x${string}`,
    abi: ERC20_ABI as unknown as Abi,
    functionName: "decimals",
    query: { enabled },
  });

  const { data: ciphertextRaw, isLoading: ctLoading } = useReadContract({
    address: (tokenAddress ?? zeroAddress) as `0x${string}`,
    abi: ERC20_ABI as unknown as Abi,
    functionName: "confidentialBalanceOf",
    args: [address ?? zeroAddress],
    query: { enabled },
  });

  const ciphertext = useMemo(() => {
    if (!ciphertextRaw) return null;
    if (typeof ciphertextRaw === "string") return ciphertextRaw;
    return null;
  }, [ciphertextRaw]);

  const [balance, setBalance] = useState<BalanceState>({
    value: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!enabled || !connected || !ciphertext) {
        if (!cancelled) {
          setBalance({ value: null, loading: false, error: null });
        }
        return;
      }
      if (!cancelled) {
        setBalance({ value: null, loading: true, error: null });
      }
      try {
        const value = await decryptUint64(ciphertext as `0x${string}`);
        if (!cancelled) {
          setBalance({ value, loading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setBalance({
            value: null,
            loading: false,
            error: err instanceof Error ? err.message : "Failed to decrypt token balance",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ciphertext, connected, decryptUint64, enabled]);

  return {
    symbol: (symbolRaw as string | undefined) ?? "TOKEN",
    decimals: (decimalsRaw as number | undefined) ?? 6,
    balance,
    loading: ctLoading || balance.loading,
  };
}
