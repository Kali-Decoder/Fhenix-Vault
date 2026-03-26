"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, ExternalLink, Loader2, Wallet, X } from "lucide-react";
import {
  formatPercentFromBps,
  formatToken,
  riskName,
  shortAddress,
  useVaultKeeper,
} from "../hooks/useVaultKeeper";
import { VAULT_KEEPER_ADDRESS } from "../config/vault_config";

export default function VaultsPage() {
  const {
    account,
    isConnected,
    isCorrectNetwork,
    explorerBase,
    vaults,
    selectedVault,
    selectedVaultId,
    setSelectedVaultId,
    stats,
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
  } = useVaultKeeper();

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [depositModalVaultId, setDepositModalVaultId] = useState<number | null>(null);
  const [withdrawModalVaultId, setWithdrawModalVaultId] = useState<number | null>(null);
  const [claimModalVaultId, setClaimModalVaultId] = useState<number | null>(null);
  const [compoundModalVaultId, setCompoundModalVaultId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [sortBy, setSortBy] = useState<"none" | "apr-desc" | "apr-asc" | "tvl-desc" | "tvl-asc">("none");
  const [isVaultDrawerOpen, setIsVaultDrawerOpen] = useState(false);

  const depositModalVault = vaults.find((v) => v.id === depositModalVaultId) ?? null;
  const withdrawModalVault = vaults.find((v) => v.id === withdrawModalVaultId) ?? null;
  const claimModalVault = vaults.find((v) => v.id === claimModalVaultId) ?? null;
  const compoundModalVault = vaults.find((v) => v.id === compoundModalVaultId) ?? null;

  const openDepositModal = (vaultId: number) => {
    setSelectedVaultId(vaultId);
    setIsVaultDrawerOpen(true);
    setDepositAmount("");
    setDepositModalVaultId(vaultId);
  };

  const openWithdrawModal = (vaultId: number) => {
    setSelectedVaultId(vaultId);
    setIsVaultDrawerOpen(true);
    setWithdrawAmount("");
    setWithdrawModalVaultId(vaultId);
  };

  const openClaimModal = (vaultId: number) => {
    setSelectedVaultId(vaultId);
    setIsVaultDrawerOpen(true);
    setClaimModalVaultId(vaultId);
  };

  const openCompoundModal = (vaultId: number) => {
    setSelectedVaultId(vaultId);
    setIsVaultDrawerOpen(true);
    setCompoundModalVaultId(vaultId);
  };

  const selectVault = (vaultId: number) => {
    setSelectedVaultId(vaultId);
    setIsVaultDrawerOpen(true);
  };

  const filteredVaults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = vaults.filter((vault) => {
      const matchesName = q.length === 0 || vault.name.toLowerCase().includes(q);
      const matchesRisk =
        riskFilter === "all" ||
        (riskFilter === "low" && vault.riskLevel === 0) ||
        (riskFilter === "medium" && vault.riskLevel === 1) ||
        (riskFilter === "high" && vault.riskLevel === 2);
      return matchesName && matchesRisk;
    });

    if (sortBy === "apr-desc") {
      list.sort((a, b) => Number(b.maxAPY) - Number(a.maxAPY));
    } else if (sortBy === "apr-asc") {
      list.sort((a, b) => Number(a.maxAPY) - Number(b.maxAPY));
    } else if (sortBy === "tvl-desc") {
      list.sort((a, b) => (a.totalValueLocked > b.totalValueLocked ? -1 : a.totalValueLocked < b.totalValueLocked ? 1 : 0));
    } else if (sortBy === "tvl-asc") {
      list.sort((a, b) => (a.totalValueLocked < b.totalValueLocked ? -1 : a.totalValueLocked > b.totalValueLocked ? 1 : 0));
    }

    return list;
  }, [riskFilter, searchTerm, sortBy, vaults]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="rounded-2xl border border-card-border bg-card/80 p-6 shadow-2xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Vault Operations</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Vaults</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Contract: {shortAddress(VAULT_KEEPER_ADDRESS)}
              <a
                href={`${explorerBase}/address/${VAULT_KEEPER_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-zinc-200 hover:text-white"
              >
                Explorer <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isConnected ? (
              <div className="rounded-lg border border-white/30 bg-white/5 px-3 py-2 text-xs text-zinc-200">
                {shortAddress(account)}
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
              >
                <Wallet className="h-4 w-4" /> Connect Wallet
              </button>
            )}

            {!isCorrectNetwork && (
              <button
                onClick={switchToDefaultNetwork}
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/10"
              >
                <AlertTriangle className="h-4 w-4" /> Switch Network
              </button>
            )}

            <button
              onClick={refreshAll}
              disabled={isRefreshing}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={mintMockUsdt}
              disabled={!isConnected || !isCorrectNetwork || isSubmitting}
              className="rounded-lg border border-white/30 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Mint USDT
            </button>
          </div>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-card-border bg-card/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Available Vaults</h2>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200 hover:border-zinc-500"
          >
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid gap-3 rounded-lg border border-zinc-800 bg-black/35 p-3 md:grid-cols-4">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by vault name"
              className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white"
            />

            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as "all" | "low" | "medium" | "high")}
              className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white"
            >
              <option value="all">Risk: All</option>
              <option value="low">Risk: Low</option>
              <option value="medium">Risk: Medium</option>
              <option value="high">Risk: High</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "none" | "apr-desc" | "apr-asc" | "tvl-desc" | "tvl-asc")
              }
              className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white"
            >
              <option value="none">Sort: None</option>
              <option value="apr-desc">APR: High to Low</option>
              <option value="apr-asc">APR: Low to High</option>
              <option value="tvl-desc">TVL: High to Low</option>
              <option value="tvl-asc">TVL: Low to High</option>
            </select>

            <button
              onClick={() => {
                setSearchTerm("");
                setRiskFilter("all");
                setSortBy("none");
              }}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500"
            >
              Reset
            </button>
          </div>
        )}

        {filteredVaults.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">No vaults created yet.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {filteredVaults.map((vault) => (
              <div
                key={vault.id}
                onClick={() => selectVault(vault.id)}
                className={`rounded-lg border p-4 text-left transition ${
                  selectedVaultId === vault.id
                    ? "border-white/60 bg-white/5"
                    : "border-zinc-800 bg-black/35 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">
                    <span className="text-monad-purple">#{vault.id}</span> {vault.name}
                  </p>
                  <span className={`text-xs ${vault.active ? "text-white" : "text-zinc-400"}`}>
                    {vault.active ? "Active" : "Paused"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-md border border-zinc-700 bg-black/40 px-2 py-1 text-zinc-200">
                    Risk: {riskName(vault.riskLevel)}
                  </span>
                  <span className="rounded-md border border-zinc-700 bg-black/40 px-2 py-1 text-zinc-200">
                    APY: {formatPercentFromBps(vault.minAPY)} - {formatPercentFromBps(vault.maxAPY)}
                  </span>
                  <span className="rounded-md border border-zinc-700 bg-black/40 px-2 py-1 text-zinc-200">
                    Token: {vault.tokenSymbol}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <ConfigItem
                    label="TVL"
                    value={`${formatToken(vault.totalValueLocked, vault.tokenDecimals)} ${vault.tokenSymbol}`}
                  />
                  <ConfigItem label="Depositors" value={vault.depositorCount.toString()} />
                  <ConfigItem
                    label="Your Deposit"
                    value={`${formatToken(vault.userDeposit, vault.tokenDecimals)} ${vault.tokenSymbol}`}
                  />
                  <ConfigItem
                    label="Your Pending Yield"
                    value={`${formatToken(vault.userPendingRewards, vault.tokenDecimals)} ${vault.tokenSymbol}`}
                  />
                </div>
                <p className="mt-2 break-all text-[11px] text-zinc-400">
                  Token Address: <span className="font-mono text-zinc-300">{vault.tokenAddress}</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => openDepositModal(vault.id)}
                    disabled={!vault.active || isSubmitting}
                    className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Deposit {vault.tokenSymbol}
                  </button>
                  <button
                    onClick={() => openWithdrawModal(vault.id)}
                    disabled={isSubmitting}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Withdraw {vault.tokenSymbol}
                  </button>
                  <button
                    onClick={() => openClaimModal(vault.id)}
                    disabled={isSubmitting}
                    className="rounded-lg border border-white/30 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Claim Rewards
                  </button>
                  <button
                    onClick={() => openCompoundModal(vault.id)}
                    disabled={isSubmitting}
                    className="rounded-lg border border-white/30 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Compound
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div
        onClick={() => setIsVaultDrawerOpen(false)}
        className={`fixed inset-0 z-40 bg-black/70 transition-opacity duration-300 ${
          isVaultDrawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-card-border bg-card/95 p-5 shadow-2xl transition-transform duration-300 ${
          isVaultDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Selected Vault</p>
            <h2 className="text-lg font-semibold text-white">
              {selectedVault ? (
                <>
                  <span className="text-monad-purple">#{selectedVault.id}</span> {selectedVault.name}
                </>
              ) : (
                "No vault selected"
              )}
            </h2>
          </div>
          <button
            onClick={() => setIsVaultDrawerOpen(false)}
            className="border border-zinc-700 p-2 text-zinc-300 hover:border-zinc-500 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {selectedVault ? (
          <div className="mt-5 space-y-3">
            <DataRow label="Token" value={selectedVault.tokenSymbol} />
            <DataRow label="Risk" value={riskName(selectedVault.riskLevel)} />
            <DataRow label="APY" value={`${formatPercentFromBps(selectedVault.minAPY)} - ${formatPercentFromBps(selectedVault.maxAPY)}`} />
            <DataRow label="Status" value={selectedVault.active ? "Active" : "Paused"} />
            <DataRow
              label="TVL"
              value={`${formatToken(selectedVault.totalValueLocked, selectedVault.tokenDecimals)} ${selectedVault.tokenSymbol}`}
            />
            <DataRow label="Depositors" value={selectedVault.depositorCount.toString()} />
            <DataRow
              label="Your Deposit"
              value={`${formatToken(selectedVault.userDeposit, selectedVault.tokenDecimals)} ${selectedVault.tokenSymbol}`}
            />
            <DataRow
              label="Pending Rewards"
              value={`${formatToken(selectedVault.userPendingRewards, selectedVault.tokenDecimals)} ${selectedVault.tokenSymbol}`}
            />
            <DataRow
              label={`Wallet ${selectedVault.tokenSymbol}`}
              value={`${formatToken(selectedVault.userTokenBalance, selectedVault.tokenDecimals)} ${selectedVault.tokenSymbol}`}
            />
            <p className="break-all border border-zinc-800 bg-black/35 px-3 py-2 text-xs text-zinc-400">
              Token Address: <span className="font-mono text-zinc-300">{selectedVault.tokenAddress}</span>
            </p>

            <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-3">
              <button
                onClick={() => openDepositModal(selectedVault.id)}
                disabled={!selectedVault.active || isSubmitting}
                className="bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Deposit
              </button>
              <button
                onClick={() => openWithdrawModal(selectedVault.id)}
                disabled={isSubmitting}
                className="border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Withdraw
              </button>
              <button
                onClick={() => openClaimModal(selectedVault.id)}
                disabled={isSubmitting}
                className="border border-white/30 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Claim
              </button>
              <button
                onClick={() => openCompoundModal(selectedVault.id)}
                disabled={isSubmitting}
                className="border border-white/30 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Compound
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-5 text-sm text-zinc-400">Select a vault from the list to view details.</p>
        )}
      </aside>

      {depositModalVault && (
        <Modal title={`Deposit ${depositModalVault.tokenSymbol}`} onClose={() => setDepositModalVaultId(null)}>
          <p className="text-sm text-zinc-300">
            Your {depositModalVault.tokenSymbol} balance:{" "}
            <span className="font-semibold text-monad-purple">
              {formatToken(depositModalVault.userTokenBalance, depositModalVault.tokenDecimals)} {depositModalVault.tokenSymbol}
            </span>
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {depositModalVault.tokenSymbol === "USDT"
              ? "Your USDT wallet balance is shown above."
              : `Use your ${depositModalVault.tokenSymbol} wallet balance for this deposit.`}
          </p>
          <input
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="0.0"
            className="mt-4 w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white"
          />
          <button
            onClick={async () => {
              await deposit(depositAmount);
              setDepositAmount("");
              setDepositModalVaultId(null);
            }}
            disabled={isSubmitting}
            className="mt-4 w-full rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : `Approve + Deposit ${depositModalVault.tokenSymbol}`}
          </button>
        </Modal>
      )}

      {withdrawModalVault && (
        <Modal title={`Withdraw ${withdrawModalVault.tokenSymbol}`} onClose={() => setWithdrawModalVaultId(null)}>
          <p className="text-sm text-zinc-300">
            Available to withdraw:{" "}
            <span className="font-semibold text-monad-purple">
              {formatToken(withdrawModalVault.userDeposit, withdrawModalVault.tokenDecimals)} {withdrawModalVault.tokenSymbol}
            </span>
          </p>
          <input
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="0.0"
            className="mt-4 w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white"
          />
          <button
            onClick={async () => {
              await withdraw(withdrawAmount);
              setWithdrawAmount("");
              setWithdrawModalVaultId(null);
            }}
            disabled={isSubmitting}
            className="mt-4 w-full rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : `Withdraw ${withdrawModalVault.tokenSymbol}`}
          </button>
        </Modal>
      )}

      {claimModalVault && (
        <Modal title={`Claim ${claimModalVault.tokenSymbol} Yield`} onClose={() => setClaimModalVaultId(null)}>
          <p className="text-sm text-zinc-300">
            Claimable amount:{" "}
            <span className="font-semibold text-monad-purple">
              {formatToken(claimModalVault.userPendingRewards, claimModalVault.tokenDecimals)} {claimModalVault.tokenSymbol}
            </span>
          </p>
          <p className="mt-2 text-sm text-zinc-300">
            Claimed yield so far:{" "}
            <span className="font-semibold text-monad-purple">
              {formatToken(claimModalVault.userRewardsClaimed, claimModalVault.tokenDecimals)} {claimModalVault.tokenSymbol}
            </span>
          </p>
          <p className="mt-2 text-xs text-zinc-400">
            Vault APY: {formatPercentFromBps(claimModalVault.minAPY)} - {formatPercentFromBps(claimModalVault.maxAPY)}
          </p>

          <button
            onClick={async () => {
              await claimRewards(claimModalVault.id);
              setClaimModalVaultId(null);
            }}
            disabled={isSubmitting}
            className="mt-4 w-full rounded-lg border border-white/30 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : `Claim ${claimModalVault.tokenSymbol}`}
          </button>
        </Modal>
      )}

      {compoundModalVault && (
        <Modal title={`Compound ${compoundModalVault.tokenSymbol} Yield`} onClose={() => setCompoundModalVaultId(null)}>
          <p className="text-sm text-zinc-300">
            Compounding claims your {compoundModalVault.tokenSymbol} yield and deposits it back into the same vault.
            Your balance grows, so future yield is calculated on a larger amount.
          </p>
          <p className="mt-2 text-xs text-zinc-400">
            This works only when the reward token matches the vault token.
          </p>
          <div className="mt-4 rounded-lg border border-zinc-800 bg-black/35 px-3 py-2 text-xs text-zinc-300">
            <p>
              Pending yield:{" "}
              <span className="font-semibold text-monad-purple">
                {formatToken(compoundModalVault.userPendingRewards, compoundModalVault.tokenDecimals)}{" "}
                {compoundModalVault.tokenSymbol}
              </span>
            </p>
            <p className="mt-1 text-zinc-400">
              Reward token: <span className="font-mono text-zinc-300">{shortAddress(stats.rewardToken)}</span>
            </p>
          </div>
          <button
            onClick={async () => {
              await compoundRewards(compoundModalVault.id);
              setCompoundModalVaultId(null);
            }}
            disabled={isSubmitting}
            className="mt-4 w-full rounded-lg border border-white/30 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : `Compound ${compoundModalVault.tokenSymbol}`}
          </button>
        </Modal>
      )}
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-black/35 px-3 py-2">
      <dt className="text-zinc-400">{label}</dt>
      <dd className="text-right text-monad-purple">{value}</dd>
    </div>
  );
}

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-black/30 px-2 py-2">
      <p className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">{label}</p>
      <p className="mt-1 text-xs text-monad-purple">{value}</p>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl border border-card-border bg-card/95 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-sm text-zinc-400 hover:text-white">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
