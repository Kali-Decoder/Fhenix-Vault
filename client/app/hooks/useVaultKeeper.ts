"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits, type Abi } from "viem";
import { useAccount, useChainId, useConnect, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { allChains, getChainById, getDefaultChain } from "../config/chains";
import { ERC20_ABI, REWARD_TOKEN_ADDRESS, VAULT_KEEPER_ABI, VAULT_KEEPER_ADDRESS } from "../config/vault_config";
import { useToastContext } from "../contexts/ToastContext";
import { useCofheClient } from "./useCofheClient";

export type ContractStats = {
  owner: string;
  rewardToken: string;
  vaultCount: bigint;
};

export type VaultData = {
  id: number;
  name: string;
  riskLevel: number;
  minAPY: bigint;
  maxAPY: bigint;
  totalValueLocked: string;
  tokenAddress: string;
  active: boolean;
  depositorCount: bigint;
  tokenSymbol: string;
  tokenDecimals: number;
  userDeposit: string;
  userPendingRewards: string;
  userRewardsClaimed: string;
  userShareBps: string;
  userTokenBalance: bigint;
};

const ZERO = 0n;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_CT_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
const DEFAULT_TOKEN_DECIMALS = 6;

const EMPTY_STATS: ContractStats = {
  owner: "",
  rewardToken: ZERO_ADDRESS,
  vaultCount: ZERO,
};

export function shortAddress(value: string) {
  if (!value || value === ZERO_ADDRESS) return "-";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function formatToken(value: bigint, decimals: number, digits = 4) {
  try {
    const parsed = Number(formatUnits(value, decimals));
    if (!Number.isFinite(parsed)) return "0";
    return parsed.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    });
  } catch {
    return "0";
  }
}

export function formatPercentFromBps(bps: bigint, digits = 2) {
  const value = Number(bps) / 100;
  return `${value.toFixed(digits)}%`;
}

export function riskName(risk: number) {
  if (risk === 0) return "Low";
  if (risk === 1) return "Medium";
  if (risk === 2) return "High";
  return `Unknown (${risk})`;
}

function getVaultField<T>(vaultRaw: unknown, key: string, index: number, fallback: T): T {
  if (vaultRaw && typeof vaultRaw === "object" && key in (vaultRaw as Record<string, unknown>)) {
    return (vaultRaw as Record<string, T>)[key];
  }
  if (Array.isArray(vaultRaw) && typeof vaultRaw[index] !== "undefined") {
    return vaultRaw[index] as T;
  }
  return fallback;
}

export function useVaultKeeper() {
  const { showError, showInfo, showSuccess } = useToastContext();
  const { decryptUint64, encryptUint64, connected: cofheConnected } = useCofheClient();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectAsync, connectors } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [stats, setStats] = useState<ContractStats>(EMPTY_STATS);
  const [vaults, setVaults] = useState<VaultData[]>([]);
  const [selectedVaultId, setSelectedVaultId] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const account = address ?? "";

  const defaultChain = useMemo(() => getDefaultChain(), []);
  const activeChain = useMemo(
    () => (chainId ? getChainById(chainId) ?? defaultChain : defaultChain),
    [chainId, defaultChain]
  );
  const isCorrectNetwork = !!chainId && !!getChainById(chainId);
  const isAdmin = !!account && !!stats.owner && account.toLowerCase() === stats.owner.toLowerCase();
  const explorerBase = activeChain?.blockExplorers?.default.url ?? defaultChain.blockExplorers?.default.url ?? "";
  const supportedNetworksLabel = allChains.map((chain) => chain.name).join(" or ");

  const selectedVault = useMemo(
    () => vaults.find((v) => v.id === selectedVaultId) ?? null,
    [selectedVaultId, vaults]
  );

  const connectWallet = useCallback(async () => {
    const connector = connectors[0];
    if (!connector) {
      showError("Wallet connector not available.");
      return;
    }
    try {
      await connectAsync({ connector });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wallet connection failed.";
      showError(message);
    }
  }, [connectAsync, connectors, showError]);

  const switchToDefaultNetwork = useCallback(async () => {
    try {
      await switchChainAsync({ chainId: defaultChain.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network switch failed.";
      showError(message);
    }
  }, [defaultChain.id, showError, switchChainAsync]);

  const readNonView = useCallback(
    async (functionName: string, args: readonly unknown[]) => {
      if (!publicClient) {
        throw new Error("Public client unavailable.");
      }
      const { result } = await publicClient.simulateContract({
        address: VAULT_KEEPER_ADDRESS as `0x${string}`,
        abi: VAULT_KEEPER_ABI as unknown as Abi,
        functionName,
        args,
        account: (account || ZERO_ADDRESS) as `0x${string}`,
      });
      return result as string;
    },
    [account, publicClient]
  );

  const refreshAll = useCallback(async () => {
    if (!publicClient) return;

    setIsRefreshing(true);
    try {
      const [owner, rewardToken, vaultCount] = await Promise.all([
        publicClient.readContract({
          address: VAULT_KEEPER_ADDRESS as `0x${string}`,
          abi: VAULT_KEEPER_ABI as unknown as Abi,
          functionName: "owner",
        }) as Promise<string>,
        publicClient.readContract({
          address: VAULT_KEEPER_ADDRESS as `0x${string}`,
          abi: VAULT_KEEPER_ABI as unknown as Abi,
          functionName: "rewardToken",
        }) as Promise<string>,
        publicClient.readContract({
          address: VAULT_KEEPER_ADDRESS as `0x${string}`,
          abi: VAULT_KEEPER_ABI as unknown as Abi,
          functionName: "vaultCount",
        }) as Promise<bigint>,
      ]);

      setStats({ owner, rewardToken, vaultCount });

      const count = Number(vaultCount);
      const nextVaults: VaultData[] = [];

      for (let i = 0; i < count; i++) {
        const [vaultRaw, depositorCount] = await Promise.all([
          publicClient.readContract({
            address: VAULT_KEEPER_ADDRESS as `0x${string}`,
            abi: VAULT_KEEPER_ABI as unknown as Abi,
            functionName: "vaults",
            args: [BigInt(i)],
          }) as Promise<unknown>,
          publicClient.readContract({
            address: VAULT_KEEPER_ADDRESS as `0x${string}`,
            abi: VAULT_KEEPER_ABI as unknown as Abi,
            functionName: "getDepositorCount",
            args: [BigInt(i)],
          }) as Promise<bigint>,
        ]);

        const tokenAddress = getVaultField<string>(vaultRaw, "tokenAddress", 5, ZERO_ADDRESS);
        let tokenSymbol = "TOKEN";
        let tokenDecimals = DEFAULT_TOKEN_DECIMALS;
        let userTokenBalance = ZERO;

        if (tokenAddress !== ZERO_ADDRESS) {
          const [symbol, decimals, walletBalCt] = await Promise.all([
            publicClient.readContract({
              address: tokenAddress as `0x${string}`,
              abi: ERC20_ABI as unknown as Abi,
              functionName: "symbol",
            }) as Promise<string>,
            publicClient.readContract({
              address: tokenAddress as `0x${string}`,
              abi: ERC20_ABI as unknown as Abi,
              functionName: "decimals",
            }) as Promise<number>,
            account
              ? (publicClient.readContract({
                  address: tokenAddress as `0x${string}`,
                  abi: ERC20_ABI as unknown as Abi,
                  functionName: "confidentialBalanceOf",
                  args: [account as `0x${string}`],
                }) as Promise<string>)
              : Promise.resolve(ZERO_CT_HASH),
          ]);

          tokenSymbol = symbol;
          tokenDecimals = decimals;

          if (account && cofheConnected && walletBalCt && walletBalCt !== ZERO_CT_HASH) {
            try {
              userTokenBalance = await decryptUint64(walletBalCt as `0x${string}`);
            } catch {
              userTokenBalance = ZERO;
            }
          }
        }

        let userDeposit = ZERO_CT_HASH;
        let userPendingRewards = ZERO_CT_HASH;
        let userShareBps = ZERO_CT_HASH;
        let userRewardsClaimed = ZERO_CT_HASH;

        if (account) {
          const [userDepositData, pendingRewards, shareBps, claimedRewards] = await Promise.all([
            publicClient.readContract({
              address: VAULT_KEEPER_ADDRESS as `0x${string}`,
              abi: VAULT_KEEPER_ABI as unknown as Abi,
              functionName: "getUserDeposit",
              args: [BigInt(i), account as `0x${string}`],
            }) as Promise<unknown>,
            readNonView("getPendingRewards", [BigInt(i), account as `0x${string}`]),
            readNonView("getUserShare", [BigInt(i), account as `0x${string}`]),
            publicClient.readContract({
              address: VAULT_KEEPER_ADDRESS as `0x${string}`,
              abi: VAULT_KEEPER_ABI as unknown as Abi,
              functionName: "rewardsClaimed",
              args: [BigInt(i), account as `0x${string}`],
            }) as Promise<string>,
          ]);

          if (Array.isArray(userDepositData)) {
            userDeposit = (userDepositData[0] as string) ?? ZERO_CT_HASH;
          } else if (userDepositData && typeof userDepositData === "object" && "amount" in userDepositData) {
            userDeposit = (userDepositData as { amount: string }).amount ?? ZERO_CT_HASH;
          }
          userPendingRewards = pendingRewards;
          userShareBps = shareBps;
          userRewardsClaimed = claimedRewards;
        }

        nextVaults.push({
          id: i,
          name: getVaultField<string>(vaultRaw, "name", 0, ""),
          riskLevel: Number(getVaultField<bigint>(vaultRaw, "riskLevel", 1, 0n)),
          minAPY: getVaultField<bigint>(vaultRaw, "minAPY", 2, 0n),
          maxAPY: getVaultField<bigint>(vaultRaw, "maxAPY", 3, 0n),
          totalValueLocked: getVaultField<string>(vaultRaw, "totalValueLocked", 4, ZERO_CT_HASH),
          tokenAddress,
          active: Boolean(getVaultField<boolean>(vaultRaw, "active", 6, false)),
          depositorCount,
          tokenSymbol,
          tokenDecimals,
          userDeposit,
          userPendingRewards,
          userRewardsClaimed,
          userShareBps,
          userTokenBalance,
        });
      }

      setVaults(nextVaults);
      if (nextVaults.length === 0) setSelectedVaultId(0);
      if (nextVaults.length > 0 && !nextVaults.find((v) => v.id === selectedVaultId)) {
        setSelectedVaultId(nextVaults[0].id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch contract data.";
      showError(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [account, cofheConnected, decryptUint64, publicClient, readNonView, selectedVaultId, showError]);

  useEffect(() => {
    refreshAll();
    const timer = setInterval(() => {
      refreshAll();
    }, 12000);
    return () => clearInterval(timer);
  }, [refreshAll]);

  const runWrite = useCallback(
    async (fn: () => Promise<void>, successText: string) => {
      if (!account) {
        showInfo("Connect wallet first.");
        return;
      }
      if (!isCorrectNetwork) {
        showError(`Switch wallet network to ${supportedNetworksLabel}.`);
        return;
      }
      if (!publicClient) {
        showError("Public client not available.");
        return;
      }

      setIsSubmitting(true);
      try {
        await fn();
        showSuccess(successText);
        await refreshAll();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Transaction failed.";
        showError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [account, isCorrectNetwork, publicClient, refreshAll, showError, showInfo, showSuccess, supportedNetworksLabel]
  );

  const waitForTx = useCallback(
    async (hash: `0x${string}`) => {
      if (!publicClient) return;
      await publicClient.waitForTransactionReceipt({ hash });
    },
    [publicClient]
  );

  const deposit = useCallback(
    async (amountHuman: string) => {
      if (!selectedVault) {
        showInfo("Create or select a vault first.");
        return;
      }
      if (!selectedVault.active) {
        showInfo("Selected vault is not active.");
        return;
      }
      if (selectedVault.tokenAddress === ZERO_ADDRESS) {
        showInfo("Selected vault token address is not set.");
        return;
      }
      if (!amountHuman || Number(amountHuman) <= 0) {
        showInfo("Enter a valid deposit amount.");
        return;
      }

      await runWrite(async () => {
        const amount = parseUnits(amountHuman, selectedVault.tokenDecimals);
        const tokenAddress = selectedVault.tokenAddress as `0x${string}`;

        try {
          const operatorUntil = Math.floor(Date.now() / 1000) + 60 * 60;
          const operatorHash = await writeContractAsync({
            address: tokenAddress,
            abi: ERC20_ABI as unknown as Abi,
            functionName: "setOperator",
            args: [VAULT_KEEPER_ADDRESS, operatorUntil],
          });
          await waitForTx(operatorHash);
        } catch {
          const allowance = (await publicClient!.readContract({
            address: tokenAddress,
            abi: ERC20_ABI as unknown as Abi,
            functionName: "allowance",
            args: [account as `0x${string}`, VAULT_KEEPER_ADDRESS],
          })) as bigint;
          if (allowance < amount) {
            const approveHash = await writeContractAsync({
              address: tokenAddress,
              abi: ERC20_ABI as unknown as Abi,
              functionName: "approve",
              args: [VAULT_KEEPER_ADDRESS, amount],
            });
            await waitForTx(approveHash);
          }
        }

        const encrypted = await encryptUint64(amount);
        const hash = await writeContractAsync({
          address: VAULT_KEEPER_ADDRESS as `0x${string}`,
          abi: VAULT_KEEPER_ABI as unknown as Abi,
          functionName: "deposit",
          args: [BigInt(selectedVault.id), encrypted],
        });
        await waitForTx(hash);
      }, "Deposit successful.");
    },
    [account, encryptUint64, publicClient, runWrite, selectedVault, showInfo, waitForTx, writeContractAsync]
  );

  const withdraw = useCallback(
    async (amountHuman: string) => {
      if (!selectedVault) {
        showInfo("Create or select a vault first.");
        return;
      }
      if (!amountHuman || Number(amountHuman) <= 0) {
        showInfo("Enter a valid withdraw amount.");
        return;
      }

      await runWrite(async () => {
        const amount = parseUnits(amountHuman, selectedVault.tokenDecimals);
        const encrypted = await encryptUint64(amount);
        const hash = await writeContractAsync({
          address: VAULT_KEEPER_ADDRESS as `0x${string}`,
          abi: VAULT_KEEPER_ABI as unknown as Abi,
          functionName: "withdraw",
          args: [BigInt(selectedVault.id), encrypted],
        });
        await waitForTx(hash);
      }, "Withdraw successful.");
    },
    [encryptUint64, runWrite, selectedVault, showInfo, waitForTx, writeContractAsync]
  );

  const claimRewards = useCallback(
    async (vaultId?: number) => {
      const targetVaultId = vaultId ?? selectedVault?.id;
      if (targetVaultId === undefined) {
        showInfo("Create or select a vault first.");
        return;
      }

      await runWrite(async () => {
        const hash = await writeContractAsync({
          address: VAULT_KEEPER_ADDRESS as `0x${string}`,
          abi: VAULT_KEEPER_ABI as unknown as Abi,
          functionName: "claimRewards",
          args: [BigInt(targetVaultId)],
        });
        await waitForTx(hash);
      }, "Rewards claimed.");
    },
    [runWrite, selectedVault, showInfo, waitForTx, writeContractAsync]
  );

  const compoundRewards = useCallback(
    async (vaultId?: number) => {
      const targetVaultId = vaultId ?? selectedVault?.id;
      if (targetVaultId === undefined) {
        showInfo("Create or select a vault first.");
        return;
      }

      const targetVault = vaults.find((vault) => vault.id === targetVaultId);
      if (!targetVault) {
        showInfo("Vault not found.");
        return;
      }

      if (stats.rewardToken === ZERO_ADDRESS) {
        showInfo("Reward token is not set.");
        return;
      }

      if (targetVault.tokenAddress.toLowerCase() !== stats.rewardToken.toLowerCase()) {
        showInfo("Compounding is available only when the reward token matches the vault token.");
        return;
      }

      const pendingPlain = await decryptUint64(targetVault.userPendingRewards);
      if (pendingPlain <= ZERO) {
        showInfo("No rewards to compound yet.");
        return;
      }

      await runWrite(async () => {
        const rewardCt = (await readNonView("getPendingRewards", [
          BigInt(targetVaultId),
          account as `0x${string}`,
        ])) as string;
        const reward = await decryptUint64(rewardCt);
        if (reward <= ZERO) {
          throw new Error("No rewards to compound.");
        }

        const claimHash = await writeContractAsync({
          address: VAULT_KEEPER_ADDRESS as `0x${string}`,
          abi: VAULT_KEEPER_ABI as unknown as Abi,
          functionName: "claimRewards",
          args: [BigInt(targetVaultId)],
        });
        await waitForTx(claimHash);

        const allowance = (await publicClient!.readContract({
          address: targetVault.tokenAddress as `0x${string}`,
          abi: ERC20_ABI as unknown as Abi,
          functionName: "allowance",
          args: [account as `0x${string}`, VAULT_KEEPER_ADDRESS],
        })) as bigint;
        if (allowance < reward) {
          const approveHash = await writeContractAsync({
            address: targetVault.tokenAddress as `0x${string}`,
            abi: ERC20_ABI as unknown as Abi,
            functionName: "approve",
            args: [VAULT_KEEPER_ADDRESS, reward],
          });
          await waitForTx(approveHash);
        }

        const encrypted = await encryptUint64(reward);
        const depositHash = await writeContractAsync({
          address: VAULT_KEEPER_ADDRESS as `0x${string}`,
          abi: VAULT_KEEPER_ABI as unknown as Abi,
          functionName: "deposit",
          args: [BigInt(targetVaultId), encrypted],
        });
        await waitForTx(depositHash);
      }, "Yield compounded.");
    },
    [
      account,
      decryptUint64,
      encryptUint64,
      publicClient,
      readNonView,
      runWrite,
      selectedVault,
      showInfo,
      stats.rewardToken,
      vaults,
      waitForTx,
      writeContractAsync,
    ]
  );

  const mintMockUsdt = useCallback(async () => {
    if (!account) {
      showInfo("Connect wallet first.");
      return;
    }
    if (!isCorrectNetwork) {
      showError(`Switch wallet network to ${supportedNetworksLabel}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/faucet/usdt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: account }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Mock USDT faucet failed.");
      }

      showSuccess("Received 100 mock USDT from faucet.");
      await refreshAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mock USDT faucet failed.";
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [account, isCorrectNetwork, refreshAll, showError, showInfo, showSuccess, supportedNetworksLabel]);

  const setRewardToken = useCallback(
    async (address: string) => {
      if (!address || address.length !== 42) {
        showInfo("Enter a valid reward token address.");
        return;
      }

      await runWrite(async () => {
        const hash = await writeContractAsync({
          address: VAULT_KEEPER_ADDRESS as `0x${string}`,
          abi: VAULT_KEEPER_ABI as unknown as Abi,
          functionName: "setRewardToken",
          args: [address as `0x${string}`],
        });
        await waitForTx(hash);
      }, "Reward token updated.");
    },
    [runWrite, showInfo, waitForTx, writeContractAsync]
  );

  const createVault = useCallback(
    async (payload: { name: string; riskLevel: string; minAPY: string; maxAPY: string; tokenAddress: string }) => {
      if (!payload.name.trim()) {
        showInfo("Enter vault name.");
        return;
      }
      const tokenAddress = payload.tokenAddress.trim() || REWARD_TOKEN_ADDRESS;
      if (!tokenAddress || tokenAddress.length !== 42) {
        showInfo("Enter a valid vault token address.");
        return;
      }

      await runWrite(async () => {
        const hash = await writeContractAsync({
          address: VAULT_KEEPER_ADDRESS as `0x${string}`,
          abi: VAULT_KEEPER_ABI as unknown as Abi,
          functionName: "createVault",
          args: [
            payload.name.trim(),
            BigInt(payload.riskLevel),
            BigInt(payload.minAPY),
            BigInt(payload.maxAPY),
            tokenAddress as `0x${string}`,
          ],
        });
        await waitForTx(hash);
      }, "Vault created.");
    },
    [runWrite, showInfo, waitForTx, writeContractAsync]
  );

  const updateApy = useCallback(
    async (payload: { vaultId: string; minAPY: string; maxAPY: string }) => {
      if (!payload.vaultId) {
        showInfo("Enter vault ID.");
        return;
      }

      await runWrite(async () => {
        const hash = await writeContractAsync({
          address: VAULT_KEEPER_ADDRESS as `0x${string}`,
          abi: VAULT_KEEPER_ABI as unknown as Abi,
          functionName: "updateAPY",
          args: [BigInt(payload.vaultId), BigInt(payload.minAPY), BigInt(payload.maxAPY)],
        });
        await waitForTx(hash);
      }, "APY updated.");
    },
    [runWrite, showInfo, waitForTx, writeContractAsync]
  );

  const toggleVaultActive = useCallback(
    async (vaultId: number) => {
      await runWrite(async () => {
        const hash = await writeContractAsync({
          address: VAULT_KEEPER_ADDRESS as `0x${string}`,
          abi: VAULT_KEEPER_ABI as unknown as Abi,
          functionName: "toggleVaultActive",
          args: [BigInt(vaultId)],
        });
        await waitForTx(hash);
      }, `Vault ${vaultId} status updated.`);
    },
    [runWrite, waitForTx, writeContractAsync]
  );

  const emergencyWithdraw = useCallback(
    async (payload: { vaultId: string; amount: string }) => {
      const vault = vaults.find((v) => v.id === Number(payload.vaultId));
      if (!vault) {
        showInfo("Invalid vault for emergency withdraw.");
        return;
      }
      if (!payload.amount || Number(payload.amount) <= 0) {
        showInfo("Enter a valid amount.");
        return;
      }

      await runWrite(async () => {
        const amountRaw = parseUnits(payload.amount, vault.tokenDecimals);
        const hash = await writeContractAsync({
          address: VAULT_KEEPER_ADDRESS as `0x${string}`,
          abi: VAULT_KEEPER_ABI as unknown as Abi,
          functionName: "emergencyWithdraw",
          args: [BigInt(vault.id), amountRaw],
        });
        await waitForTx(hash);
      }, "Emergency withdrawal complete.");
    },
    [runWrite, showInfo, vaults, waitForTx, writeContractAsync]
  );

  return {
    account,
    isConnected,
    chainId,
    isCorrectNetwork,
    isAdmin,
    stats,
    vaults,
    selectedVault,
    selectedVaultId,
    setSelectedVaultId,
    explorerBase,
    isRefreshing,
    isSubmitting,
    connectWallet,
    switchToDefaultNetwork,
    refreshAll,
    deposit,
    withdraw,
    claimRewards,
    compoundRewards,
    mintMockUsdt,
    setRewardToken,
    createVault,
    updateApy,
    toggleVaultActive,
    emergencyWithdraw,
  };
}
