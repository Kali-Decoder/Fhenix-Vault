"use client";

import { useCallback, useRef } from "react";
import { useCofheClient as useCofheClientSDK, useCofheConnection } from "@cofhe/react";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import { useAccount } from "wagmi";
import { useToastContext } from "../contexts/ToastContext";

type InEuint64 = {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: `0x${string}`;
};

export function useCofheClient() {
  const { showError } = useToastContext();
  const client = useCofheClientSDK();
  const { connected, connecting } = useCofheConnection();
  const { address } = useAccount();
  const permitReadyRef = useRef(false);

  const ensurePermitReady = useCallback(async () => {
    if (!client || !connected) {
      throw new Error("CoFHE client not connected.");
    }
    if (!address) {
      throw new Error("Connect wallet to create a permit.");
    }
    if (!permitReadyRef.current) {
      await client.permits.getOrCreateSelfPermit();
      permitReadyRef.current = true;
    }
  }, [address, client, connected]);

  const encryptUint64 = useCallback(
    async (value: bigint, accountOverride?: string) => {
      if (!client || !connected) {
        throw new Error("CoFHE client not connected.");
      }
      const builder = client.encryptInputs([Encryptable.uint64(value)]);
      if (accountOverride) {
        builder.setAccount(accountOverride);
      }
      const [encrypted] = await builder.execute();
      return encrypted as InEuint64;
    },
    [client, connected]
  );

  const decryptUint64 = useCallback(
    async (ctHash: string) => {
      try {
        if (!client || !connected) {
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
    [client, connected, ensurePermitReady, showError]
  );

  return {
    connected,
    connecting,
    encryptUint64,
    decryptUint64,
    ensurePermitReady,
  };
}
