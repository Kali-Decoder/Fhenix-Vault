"use client";

import { ValidationUtils } from "@cofhe/sdk/permits";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { useCofhe } from "@/contexts/cofhe-provider";

type VaultKeeperPermitContextValue = {
  hasPermit: boolean;
  isPermitValid: boolean;
  permitHash?: string;
  permitCount: number;
  isPermitInitializing: boolean;
  permitError: string | null;
  requestPermitCreation: () => void;
};

const VaultKeeperPermitContext = createContext<VaultKeeperPermitContextValue | null>(null);

function getStorageKey(chainId: number | undefined, address: string | undefined) {
  return `vaultkeeper_active_permit_hash_${chainId ?? "unknown"}_${(address ?? "unknown").toLowerCase()}`;
}

export function VaultKeeperPermitProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, chainId } = useAccount();
  const { client: cofheClient } = useCofhe();
  const [isCreatingPermit, setIsCreatingPermit] = useState(false);
  const [permitError, setPermitError] = useState<string | null>(null);
  const autoRequestedRef = useRef(false);
  const [permitsTick, setPermitsTick] = useState(0);

  const requestPermitCreation = useCallback(async () => {
    if (!isConnected || !address || !chainId) return;

    setPermitError(null);
    setIsCreatingPermit(true);

    try {
      const permit = await cofheClient.permits.getOrCreateSelfPermit(chainId, address, { issuer: address });
      if (permit?.hash) cofheClient.permits.selectActivePermit(permit.hash, chainId, address);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown permit creation error";
      setPermitError(message);
    } finally {
      setIsCreatingPermit(false);
    }
  }, [address, chainId, cofheClient.permits, isConnected]);

  useEffect(() => {
    return cofheClient.permits.subscribe(() => setPermitsTick((x) => x + 1));
  }, [cofheClient.permits]);

  const activePermitHash = useMemo(() => {
    if (!isConnected || !address || !chainId) return undefined;
    return cofheClient.permits.getActivePermitHash(chainId, address);
  }, [address, chainId, cofheClient.permits, isConnected, permitsTick]);

  const activePermit = useMemo(() => {
    if (!activePermitHash) return undefined;
    return cofheClient.permits.getPermit(activePermitHash, chainId, address);
  }, [activePermitHash, address, chainId, cofheClient.permits]);

  const allPermits = useMemo(() => {
    if (!isConnected || !address || !chainId) return [];
    return Object.values(cofheClient.permits.getPermits(chainId, address));
  }, [address, chainId, cofheClient.permits, isConnected, permitsTick]);

  useEffect(() => {
    if (!isConnected || !address) return;
    if (!activePermitHash || !chainId) return;

    window.localStorage.setItem(getStorageKey(chainId, address), activePermitHash);
  }, [activePermitHash, address, chainId, isConnected]);

  useEffect(() => {
    if (!isConnected || !address || !chainId) return;
    if (activePermitHash) return;
    if (!allPermits.length) return;

    const storageKey = getStorageKey(chainId, address);
    const savedHash = window.localStorage.getItem(storageKey);
    const match = savedHash ? allPermits.find((permit) => permit.hash === savedHash) : undefined;

    cofheClient.permits.selectActivePermit(match?.hash ?? allPermits[0].hash, chainId, address);
  }, [activePermitHash, address, allPermits, chainId, cofheClient.permits, isConnected]);

  useEffect(() => {
    if (!isConnected || !address) {
      autoRequestedRef.current = false;
      setPermitError(null);
      return;
    }

    if (activePermitHash || allPermits.length > 0) return;
    if (autoRequestedRef.current) return;

    autoRequestedRef.current = true;
    void requestPermitCreation();
  }, [activePermitHash, address, allPermits.length, isConnected, requestPermitCreation]);

  const value = useMemo<VaultKeeperPermitContextValue>(
    () => ({
      hasPermit: Boolean(activePermitHash),
      isPermitValid: activePermit ? ValidationUtils.isValid(activePermit).valid : false,
      permitHash: activePermitHash,
      permitCount: allPermits.length,
      isPermitInitializing: Boolean(
        isCreatingPermit || (isConnected && !activePermitHash && allPermits.length === 0)
      ),
      permitError,
      requestPermitCreation: () => {
        void requestPermitCreation();
      },
    }),
    [
      activePermit,
      activePermitHash,
      allPermits.length,
      isConnected,
      isCreatingPermit,
      permitError,
      requestPermitCreation,
    ]
  );

  return <VaultKeeperPermitContext.Provider value={value}>{children}</VaultKeeperPermitContext.Provider>;
}

export function useVaultKeeperPermit() {
  const context = useContext(VaultKeeperPermitContext);
  if (!context) {
    throw new Error("useVaultKeeperPermit must be used inside VaultKeeperPermitProvider");
  }

  return context;
}
