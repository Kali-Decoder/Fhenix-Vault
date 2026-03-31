"use client";

import { useCallback, useRef } from "react";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import { useAccount } from "wagmi";
import { useCofhe } from "@/contexts/cofhe-provider";
import { useToastContext } from "../contexts/ToastContext";

type InEuint64 = {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: `0x${string}`;
};

export function useCofheClient() {
  const { showError } = useToastContext();
  const { ready, client } = useCofhe();
  const { address } = useAccount();
  const permitReadyRef = useRef(false);

  const ensurePermitReady = useCallback(async () => {
    if (!client || !ready || !client.connected) {
      throw new Error("CoFHE client not connected.");
    }
    if (!address) {
      throw new Error("Connect wallet to create a permit.");
    }
    if (!permitReadyRef.current) {
      await client.permits.getOrCreateSelfPermit();
      permitReadyRef.current = true;
    }
  }, [address, client, ready]);

  const encryptUint64 = useCallback(
    async (value: bigint) => {
      if (!client || !ready || !client.connected) {
        throw new Error("CoFHE client not connected.");
      }
      const [encrypted] = await client.encryptInputs([Encryptable.uint64(value)]).execute();
      return encrypted as InEuint64;
    },
    [client, ready]
  );

  const decryptUint64 = useCallback(
    async (ctHash: string) => {
      try {
        if (!client || !ready || !client.connected) {
          throw new Error("CoFHE client not connected.");
        }
        if (!ctHash) {
          return 0n;
        }
        await ensurePermitReady();
        const value = await client.decryptForView(ctHash, FheTypes.Uint64).execute();
        return value as bigint;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Decryption failed.";
        showError(message);
        throw error;
      }
    },
    [client, ensurePermitReady, ready, showError]
  );

  const connected = !!client && ready && client.connected;
  const connecting = !!client && !ready;

  return {
    connected,
    connecting,
    encryptUint64,
    decryptUint64,
    ensurePermitReady,
  };
}
