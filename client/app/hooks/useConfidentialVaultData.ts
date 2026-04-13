"use client";

import { useEffect, useMemo, useState } from "react";
import { useCofheClient as useCofheClientSDK, useCofheConnection } from "@cofhe/react";
import { FheTypes } from "@cofhe/sdk";
import { useAccount, useReadContract } from "wagmi";
import { type Abi, zeroAddress } from "viem";
import { ERC20_ABI, VAULT_KEEPER_ABI, VAULT_KEEPER_ADDRESS } from "../config/vault_config";

type DecryptState = {
  value: bigint | null;
  decrypting: boolean;
  error: string | null;
};

function useDecryptUint64(ctHash: unknown, enabled: boolean) {
  const client = useCofheClientSDK();
  const { connected } = useCofheConnection();
  const [state, setState] = useState<DecryptState>({
    value: null,
    decrypting: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!enabled || !connected || !client || !ctHash) {
        if (!cancelled) {
          setState({ value: null, decrypting: false, error: null });
        }
        return;
      }
      const ct = typeof ctHash === "string" ? ctHash : null;
      if (!ct) {
        if (!cancelled) {
          setState({ value: null, decrypting: false, error: "Invalid ciphertext." });
        }
        return;
      }
      if (!cancelled) {
        setState({ value: null, decrypting: true, error: null });
      }
      try {
        const v = await client.decryptForView(ct as `0x${string}`, FheTypes.Uint64).execute();
        if (!cancelled) {
          setState({ value: v as bigint, decrypting: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            value: null,
            decrypting: false,
            error: err instanceof Error ? err.message : "Could not decrypt value",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ctHash, enabled, connected, client]);

  return state;
}

function extractCtHash(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "ctHash" in value) {
    return (value as { ctHash: string }).ctHash;
  }
  return null;
}

export function useConfidentialVaultData(vaultId?: number, tokenAddress?: string) {
  const { address, isConnected } = useAccount();

  const enabled =
    isConnected &&
    !!address &&
    vaultId !== undefined &&
    VAULT_KEEPER_ADDRESS !== zeroAddress;

  const vaultArgs = useMemo(() => [BigInt(vaultId ?? 0)], [vaultId]);
  const userArgs = useMemo(() => [BigInt(vaultId ?? 0), address ?? zeroAddress], [vaultId, address]);

  const { data: vaultRaw, isLoading: vaultLoading } = useReadContract({
    address: VAULT_KEEPER_ADDRESS as `0x${string}`,
    abi: VAULT_KEEPER_ABI as unknown as Abi,
    functionName: "vaults",
    args: vaultArgs,
    query: { enabled },
  });

  const { data: userDepositRaw, isLoading: depositLoading } = useReadContract({
    address: VAULT_KEEPER_ADDRESS as `0x${string}`,
    abi: VAULT_KEEPER_ABI as unknown as Abi,
    functionName: "getUserDeposit",
    args: userArgs,
    query: { enabled },
  });

  const { data: pendingRewardsRaw, isLoading: pendingLoading } = useReadContract({
    address: VAULT_KEEPER_ADDRESS as `0x${string}`,
    abi: VAULT_KEEPER_ABI as unknown as Abi,
    functionName: "getPendingRewards",
    args: userArgs,
    query: { enabled },
  });

  const { data: userShareRaw, isLoading: shareLoading } = useReadContract({
    address: VAULT_KEEPER_ADDRESS as `0x${string}`,
    abi: VAULT_KEEPER_ABI as unknown as Abi,
    functionName: "getUserShare",
    args: userArgs,
    query: { enabled },
  });

  const { data: rewardsClaimedRaw, isLoading: claimedLoading } = useReadContract({
    address: VAULT_KEEPER_ADDRESS as `0x${string}`,
    abi: VAULT_KEEPER_ABI as unknown as Abi,
    functionName: "rewardsClaimed",
    args: userArgs,
    query: { enabled },
  });

  const { data: tokenBalanceRaw, isLoading: tokenBalanceLoading } = useReadContract({
    address: (tokenAddress ?? zeroAddress) as `0x${string}`,
    abi: ERC20_ABI as unknown as Abi,
    functionName: "confidentialBalanceOf",
    args: [address ?? zeroAddress],
    query: { enabled: enabled && !!tokenAddress && tokenAddress !== zeroAddress },
  });

  const vaultTvlCt =
    Array.isArray(vaultRaw) && vaultRaw.length > 4 ? extractCtHash(vaultRaw[4]) : extractCtHash(vaultRaw as unknown);
  const userDepositCt = Array.isArray(userDepositRaw)
    ? extractCtHash(userDepositRaw[0])
    : extractCtHash((userDepositRaw as { amount?: unknown } | null)?.amount);

  const vaultTvl = useDecryptUint64(vaultTvlCt, enabled);
  const userDeposit = useDecryptUint64(userDepositCt, enabled);
  const pendingRewards = useDecryptUint64(extractCtHash(pendingRewardsRaw), enabled);
  const userShare = useDecryptUint64(extractCtHash(userShareRaw), enabled);
  const rewardsClaimed = useDecryptUint64(extractCtHash(rewardsClaimedRaw), enabled);

  const tokenBalance = useDecryptUint64(extractCtHash(tokenBalanceRaw), enabled);

  const loading =
    vaultLoading ||
    depositLoading ||
    pendingLoading ||
    shareLoading ||
    claimedLoading ||
    tokenBalanceLoading ||
    tokenBalance.decrypting ||
    vaultTvl.decrypting ||
    userDeposit.decrypting ||
    pendingRewards.decrypting ||
    userShare.decrypting ||
    rewardsClaimed.decrypting;

  return {
    loading,
    tokenBalance: tokenBalance.value,
    vaultTvl,
    userDeposit,
    pendingRewards,
    userShare,
    rewardsClaimed,
  };
}
