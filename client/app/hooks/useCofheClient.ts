"use client";

import { useCallback, useRef } from "react";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import { useAccount, useChainId } from "wagmi";
import { useToastContext } from "../contexts/ToastContext";
import { useCofhe } from "@/contexts/cofhe-provider";

type InEuint64 = {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: `0x${string}`;
};

export function useCofheClient() {
  const { showError } = useToastContext();
  const { client } = useCofhe();
  const { address } = useAccount();
  const chainId = useChainId();
  const permitReadyRef = useRef(false);

  const ensurePermitReady = useCallback(async () => {
    if (!client || !client.connected) {
      throw new Error("CoFHE client not connected.");
    }
    if (!address) {
      throw new Error("Connect wallet to create a permit.");
    }
    if (!chainId) {
      throw new Error("Chain id unavailable.");
    }
    if (!permitReadyRef.current) {
      await client.permits.getOrCreateSelfPermit(chainId, address, { issuer: address });
      permitReadyRef.current = true;
    }
  }, [address, chainId, client]);

  const encryptUint64 = useCallback(
    async (value: bigint, accountOverride?: string) => {
      if (!client || !client.connected) {
        throw new Error("CoFHE client not connected.");
      }
      const builder = client.encryptInputs([Encryptable.uint64(value)]);
      if (chainId) {
        builder.setChainId(chainId);
      }
      if (accountOverride) {
        builder.setAccount(accountOverride);
      } else if (address) {
        builder.setAccount(address);
      }
      const [encrypted] = await builder.execute();
      return encrypted as InEuint64;
    },
    [address, chainId, client]
  );

  const decryptUint64 = useCallback(
    async (ctHash: string) => {
      try {
        if (!client || !client.connected) {
          throw new Error("CoFHE client not connected.");
        }
        if (!ctHash) {
          return 0n;
        }
        await ensurePermitReady();
        if (!chainId || !address) {
          throw new Error("Wallet not ready.");
        }
        const value = await client
          .decryptForView(ctHash, FheTypes.Uint64)
          .setChainId(chainId)
          .setAccount(address)
          .withPermit()
          .execute();
        return value as bigint;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Decryption failed.";
        showError(message);
        throw error;
      }
    },
    [address, chainId, client, ensurePermitReady, showError]
  );

  return {
    connected: Boolean(client?.connected),
    connecting: Boolean(client?.connecting),
    encryptUint64,
    decryptUint64,
    ensurePermitReady,
  };
}
