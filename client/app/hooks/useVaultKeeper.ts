"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { allChains, getChainById, getDefaultChain } from "../config/chains";
import { ERC20_ABI, REWARD_TOKEN_ADDRESS, VAULT_KEEPER_ABI, VAULT_KEEPER_ADDRESS } from "../config/vault_config";
import { useToastContext } from "../contexts/ToastContext";

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  removeListener: (event: string, cb: (...args: unknown[]) => void) => void;
};

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
  totalValueLocked: bigint;
  tokenAddress: string;
  active: boolean;
  depositorCount: bigint;
  tokenSymbol: string;
  tokenDecimals: number;
  userDeposit: bigint;
  userPendingRewards: bigint;
  userRewardsClaimed: bigint;
  userShareBps: bigint;
  userTokenBalance: bigint;
};

const ZERO = BigInt(0);
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

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
    const parsed = Number(ethers.formatUnits(value, decimals));
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

export function useVaultKeeper() {
  const { showError, showInfo, showSuccess } = useToastContext();

  const [account, setAccount] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [stats, setStats] = useState<ContractStats>(EMPTY_STATS);
  const [vaults, setVaults] = useState<VaultData[]>([]);
  const [selectedVaultId, setSelectedVaultId] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ethereum =
    typeof window !== "undefined" ? ((window as Window & { ethereum?: Eip1193Provider }).ethereum ?? null) : null;

  const defaultChain = useMemo(() => getDefaultChain(), []);
  const activeChain = useMemo(
    () => (chainId ? getChainById(chainId) ?? defaultChain : defaultChain),
    [chainId, defaultChain]
  );
  const isCorrectNetwork = chainId !== null && !!getChainById(chainId);
  const isAdmin = !!account && !!stats.owner && account.toLowerCase() === stats.owner.toLowerCase();
  const explorerBase = activeChain?.blockExplorers?.default.url ?? defaultChain.blockExplorers?.default.url ?? "";
  const supportedNetworksLabel = allChains.map((chain) => chain.name).join(" or ");

  const selectedVault = useMemo(
    () => vaults.find((v) => v.id === selectedVaultId) ?? null,
    [selectedVaultId, vaults]
  );

  const connectWallet = useCallback(async () => {
    if (!ethereum) {
      showError("Install MetaMask or another EVM wallet.");
      return;
    }

    try {
      const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wallet connection failed.";
      showError(message);
    }
  }, [ethereum, showError]);

  const switchToDefaultNetwork = useCallback(async () => {
    if (!ethereum) {
      showError("Wallet provider not available.");
      return;
    }

    const chainHex = `0x${defaultChain.id.toString(16)}`;
    try {
      await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainHex }] });
    } catch (switchError) {
      const err = switchError as { code?: number };
      if (err.code !== 4902) {
        const message = switchError instanceof Error ? switchError.message : "Network switch failed.";
        showError(message);
        return;
      }

      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainHex,
            chainName: defaultChain.name,
            nativeCurrency: defaultChain.nativeCurrency,
            rpcUrls: defaultChain.rpcUrls.default.http,
            blockExplorerUrls: [explorerBase],
          },
        ],
      });
    }
  }, [defaultChain, ethereum, explorerBase, showError]);

  const loadWalletState = useCallback(async () => {
    if (!ethereum) return;

    try {
      const accounts = (await ethereum.request({ method: "eth_accounts" })) as string[];
      const chainHex = (await ethereum.request({ method: "eth_chainId" })) as string;
      setChainId(Number.parseInt(chainHex, 16));

      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
      } else {
        setAccount("");
        setIsConnected(false);
      }
    } catch {
      showError("Unable to read wallet state.");
    }
  }, [ethereum, showError]);

  const refreshAll = useCallback(async () => {
    if (!ethereum) return;

    setIsRefreshing(true);
    try {
      const provider = new ethers.BrowserProvider(ethereum as ethers.Eip1193Provider);
      const vaultKeeper = new ethers.Contract(VAULT_KEEPER_ADDRESS, VAULT_KEEPER_ABI, provider);

      const [owner, rewardToken, vaultCount] = await Promise.all([
        vaultKeeper.owner() as Promise<string>,
        vaultKeeper.rewardToken() as Promise<string>,
        vaultKeeper.vaultCount() as Promise<bigint>,
      ]);

      setStats({ owner, rewardToken, vaultCount });

      const count = Number(vaultCount);
      const nextVaults: VaultData[] = [];

      for (let i = 0; i < count; i++) {
        const [vaultRaw, depositorCount] = await Promise.all([
          vaultKeeper.vaults(i) as Promise<{
            name: string;
            riskLevel: bigint;
            minAPY: bigint;
            maxAPY: bigint;
            totalValueLocked: bigint;
            tokenAddress: string;
            active: boolean;
          }>,
          vaultKeeper.getDepositorCount(i) as Promise<bigint>,
        ]);

        let tokenSymbol = "TOKEN";
        let tokenDecimals = 18;
        let userTokenBalance = ZERO;

        if (vaultRaw.tokenAddress !== ZERO_ADDRESS) {
          const token = new ethers.Contract(vaultRaw.tokenAddress, ERC20_ABI, provider);
          const [symbol, decimals, walletBal] = await Promise.all([
            token.symbol() as Promise<string>,
            token.decimals() as Promise<number>,
            account ? (token.balanceOf(account) as Promise<bigint>) : Promise.resolve(ZERO),
          ]);

          tokenSymbol = symbol;
          tokenDecimals = Number(decimals);
          userTokenBalance = walletBal;
        }

        let userDeposit = ZERO;
        let userPendingRewards = ZERO;
        let userShareBps = ZERO;
        let userRewardsClaimed = ZERO;

        if (account) {
          const [userDepositData, pendingRewards, shareBps, claimedRewards] = await Promise.all([
            vaultKeeper.userDeposits(i, account) as Promise<{ amount: bigint; timestamp: bigint }>,
            vaultKeeper.getPendingRewards(i, account) as Promise<bigint>,
            vaultKeeper.getUserShare(i, account) as Promise<bigint>,
            vaultKeeper.rewardsClaimed(i, account) as Promise<bigint>,
          ]);
          userDeposit = userDepositData.amount;
          userPendingRewards = pendingRewards;
          userShareBps = shareBps;
          userRewardsClaimed = claimedRewards;
        }

        nextVaults.push({
          id: i,
          name: vaultRaw.name,
          riskLevel: Number(vaultRaw.riskLevel),
          minAPY: vaultRaw.minAPY,
          maxAPY: vaultRaw.maxAPY,
          totalValueLocked: vaultRaw.totalValueLocked,
          tokenAddress: vaultRaw.tokenAddress,
          active: vaultRaw.active,
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
  }, [account, ethereum, selectedVaultId, showError]);

  useEffect(() => {
    loadWalletState();
  }, [loadWalletState]);

  useEffect(() => {
    if (!ethereum) return;

    const onAccountsChanged = (accounts: unknown) => {
      const list = Array.isArray(accounts) ? (accounts as string[]) : [];
      if (list.length > 0) {
        setAccount(list[0]);
        setIsConnected(true);
      } else {
        setAccount("");
        setIsConnected(false);
      }
    };

    const onChainChanged = (value: unknown) => {
      const chainHex = typeof value === "string" ? value : "0x0";
      setChainId(Number.parseInt(chainHex, 16));
    };

    ethereum.on("accountsChanged", onAccountsChanged);
    ethereum.on("chainChanged", onChainChanged);

    return () => {
      ethereum.removeListener("accountsChanged", onAccountsChanged);
      ethereum.removeListener("chainChanged", onChainChanged);
    };
  }, [ethereum]);

  useEffect(() => {
    if (!ethereum) return;
    refreshAll();
    const timer = setInterval(() => {
      refreshAll();
    }, 12000);
    return () => clearInterval(timer);
  }, [ethereum, refreshAll]);

  const runWrite = useCallback(
    async (fn: (signer: ethers.Signer) => Promise<void>, successText: string) => {
      if (!ethereum) {
        showError("Wallet provider not available.");
        return;
      }
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
        const provider = new ethers.BrowserProvider(ethereum as ethers.Eip1193Provider);
        const signer = await provider.getSigner();
        await fn(signer);
        showSuccess(successText);
        await refreshAll();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Transaction failed.";
        showError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [account, ethereum, isCorrectNetwork, refreshAll, showError, showInfo, showSuccess, supportedNetworksLabel]
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

      await runWrite(async (signer) => {
        const amount = ethers.parseUnits(amountHuman, selectedVault.tokenDecimals);
        const vaultKeeper = new ethers.Contract(VAULT_KEEPER_ADDRESS, VAULT_KEEPER_ABI, signer);
        const token = new ethers.Contract(selectedVault.tokenAddress, ERC20_ABI, signer);

        const allowance = (await token.allowance(account, VAULT_KEEPER_ADDRESS)) as bigint;
        if (allowance < amount) {
          const approveTx = await token.approve(VAULT_KEEPER_ADDRESS, amount);
          await approveTx.wait();
        }

        const tx = await vaultKeeper.deposit(BigInt(selectedVault.id), amount);
        await tx.wait();
      }, "Deposit successful.");
    },
    [account, runWrite, selectedVault, showInfo]
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

      await runWrite(async (signer) => {
        const amount = ethers.parseUnits(amountHuman, selectedVault.tokenDecimals);
        const vaultKeeper = new ethers.Contract(VAULT_KEEPER_ADDRESS, VAULT_KEEPER_ABI, signer);
        const tx = await vaultKeeper.withdraw(BigInt(selectedVault.id), amount);
        await tx.wait();
      }, "Withdraw successful.");
    },
    [runWrite, selectedVault, showInfo]
  );

  const claimRewards = useCallback(async (vaultId?: number) => {
    const targetVaultId = vaultId ?? selectedVault?.id;
    if (targetVaultId === undefined) {
      showInfo("Create or select a vault first.");
      return;
    }

    await runWrite(async (signer) => {
      const vaultKeeper = new ethers.Contract(VAULT_KEEPER_ADDRESS, VAULT_KEEPER_ABI, signer);
      const tx = await vaultKeeper.claimRewards(BigInt(targetVaultId));
      await tx.wait();
    }, "Rewards claimed.");
  }, [runWrite, selectedVault, showInfo]);

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

      if (targetVault.userPendingRewards <= ZERO) {
        showInfo("No rewards to compound yet.");
        return;
      }

      await runWrite(async (signer) => {
        const vaultKeeper = new ethers.Contract(VAULT_KEEPER_ADDRESS, VAULT_KEEPER_ABI, signer);
        const reward = (await vaultKeeper.getPendingRewards(BigInt(targetVaultId), account)) as bigint;
        if (reward <= ZERO) {
          throw new Error("No rewards to compound.");
        }

        const token = new ethers.Contract(targetVault.tokenAddress, ERC20_ABI, signer);
        const claimTx = await vaultKeeper.claimRewards(BigInt(targetVaultId));
        await claimTx.wait();

        const allowance = (await token.allowance(account, VAULT_KEEPER_ADDRESS)) as bigint;
        if (allowance < reward) {
          const approveTx = await token.approve(VAULT_KEEPER_ADDRESS, reward);
          await approveTx.wait();
        }

        const depositTx = await vaultKeeper.deposit(BigInt(targetVaultId), reward);
        await depositTx.wait();
      }, "Yield compounded.");
    },
    [account, runWrite, selectedVault, showInfo, stats.rewardToken, vaults]
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
      if (!ethers.isAddress(address)) {
        showInfo("Enter a valid reward token address.");
        return;
      }

      await runWrite(async (signer) => {
        const vaultKeeper = new ethers.Contract(VAULT_KEEPER_ADDRESS, VAULT_KEEPER_ABI, signer);
        const tx = await vaultKeeper.setRewardToken(address);
        await tx.wait();
      }, "Reward token updated.");
    },
    [runWrite, showInfo]
  );

  const createVault = useCallback(
    async (payload: { name: string; riskLevel: string; minAPY: string; maxAPY: string; tokenAddress: string }) => {
      if (!payload.name.trim()) {
        showInfo("Enter vault name.");
        return;
      }
      const tokenAddress = payload.tokenAddress.trim() || REWARD_TOKEN_ADDRESS;
      if (!ethers.isAddress(tokenAddress)) {
        showInfo("Enter a valid vault token address.");
        return;
      }

      await runWrite(async (signer) => {
        const vaultKeeper = new ethers.Contract(VAULT_KEEPER_ADDRESS, VAULT_KEEPER_ABI, signer);
        const tx = await vaultKeeper.createVault(
          payload.name.trim(),
          BigInt(payload.riskLevel),
          BigInt(payload.minAPY),
          BigInt(payload.maxAPY),
          tokenAddress
        );
        await tx.wait();
      }, "Vault created.");
    },
    [runWrite, showInfo]
  );

  const updateApy = useCallback(
    async (payload: { vaultId: string; minAPY: string; maxAPY: string }) => {
      if (!payload.vaultId) {
        showInfo("Enter vault ID.");
        return;
      }

      await runWrite(async (signer) => {
        const vaultKeeper = new ethers.Contract(VAULT_KEEPER_ADDRESS, VAULT_KEEPER_ABI, signer);
        const tx = await vaultKeeper.updateAPY(BigInt(payload.vaultId), BigInt(payload.minAPY), BigInt(payload.maxAPY));
        await tx.wait();
      }, "APY updated.");
    },
    [runWrite, showInfo]
  );

  const toggleVaultActive = useCallback(
    async (vaultId: number) => {
      await runWrite(async (signer) => {
        const vaultKeeper = new ethers.Contract(VAULT_KEEPER_ADDRESS, VAULT_KEEPER_ABI, signer);
        const tx = await vaultKeeper.toggleVaultActive(BigInt(vaultId));
        await tx.wait();
      }, `Vault ${vaultId} status updated.`);
    },
    [runWrite]
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

      await runWrite(async (signer) => {
        const amountRaw = ethers.parseUnits(payload.amount, vault.tokenDecimals);
        const vaultKeeper = new ethers.Contract(VAULT_KEEPER_ADDRESS, VAULT_KEEPER_ABI, signer);
        const tx = await vaultKeeper.emergencyWithdraw(BigInt(vault.id), amountRaw);
        await tx.wait();
      }, "Emergency withdrawal complete.");
    },
    [runWrite, showInfo, vaults]
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
