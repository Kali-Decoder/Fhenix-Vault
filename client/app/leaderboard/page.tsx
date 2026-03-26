"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCcw, Trophy, Wallet } from "lucide-react";
import { ethers } from "ethers";
import { VAULT_KEEPER_ABI, VAULT_KEEPER_ADDRESS } from "../config/vault_config";
import { shortAddress, useVaultKeeper } from "../hooks/useVaultKeeper";

const POINTS_PER_USDT = 0.35;

type LeaderboardEntry = {
  address: string;
  totalDeposited: bigint;
  points: number;
};

export default function LeaderboardPage() {
  const {
    isConnected,
    isCorrectNetwork,
    connectWallet,
    switchToDefaultNetwork,
    vaults,
  } = useVaultKeeper();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hasAutoLoaded = useRef(false);

  const usdtVaults = useMemo(() => vaults.filter((vault) => vault.tokenSymbol === "USDT"), [vaults]);
  const usdtDecimals = usdtVaults[0]?.tokenDecimals ?? 6;

  const loadLeaderboard = useCallback(async () => {
    if (!isConnected || !isCorrectNetwork) return;

    const ethereum =
      typeof window !== "undefined" ? ((window as Window & { ethereum?: ethers.Eip1193Provider }).ethereum ?? null) : null;
    if (!ethereum) {
      setError("Wallet provider not available.");
      return;
    }

    if (usdtVaults.length === 0) {
      setEntries([]);
      setLastUpdated(new Date());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(ethereum);
      const vaultKeeper = new ethers.Contract(VAULT_KEEPER_ADDRESS, VAULT_KEEPER_ABI, provider);
      const totals = new Map<string, bigint>();

      for (const vault of usdtVaults) {
        const count = (await vaultKeeper.getDepositorCount(BigInt(vault.id))) as bigint;
        const countNum = Number(count);

        for (let i = 0; i < countNum; i += 1) {
          const depositor = (await vaultKeeper.vaultDepositors(BigInt(vault.id), BigInt(i))) as string;
          const deposit = (await vaultKeeper.userDeposits(BigInt(vault.id), depositor)) as {
            amount: bigint;
            timestamp: bigint;
          };

          const prev = totals.get(depositor) ?? BigInt(0);
          totals.set(depositor, prev + deposit.amount);
        }
      }

      const nextEntries = Array.from(totals.entries())
        .map(([address, totalDeposited]) => {
          const amount = Number(ethers.formatUnits(totalDeposited, usdtDecimals));
          return {
            address,
            totalDeposited,
            points: amount * POINTS_PER_USDT,
          };
        })
        .sort((a, b) => Number(b.totalDeposited - a.totalDeposited));

      setEntries(nextEntries);
      setLastUpdated(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load leaderboard.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, isCorrectNetwork, usdtVaults, usdtDecimals]);

  useEffect(() => {
    if (!isConnected || !isCorrectNetwork || hasAutoLoaded.current) return;
    if (vaults.length === 0) return;
    hasAutoLoaded.current = true;
    loadLeaderboard();
  }, [isConnected, isCorrectNetwork, loadLeaderboard, vaults.length]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="rounded-2xl border border-card-border bg-card/80 p-6 shadow-2xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Leaderboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Top USDT Depositors</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Points earned: <span className="text-monad-purple">{POINTS_PER_USDT}</span> per{" "}
              <span className="text-monad-purple">1</span> USDT deposited across all USDT vaults.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!isConnected ? (
              <button
                onClick={connectWallet}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
              >
                <Wallet className="h-4 w-4" /> Connect Wallet
              </button>
            ) : !isCorrectNetwork ? (
              <button
                onClick={switchToDefaultNetwork}
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Switch Network
              </button>
            ) : (
              <button
                onClick={loadLeaderboard}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Refresh
              </button>
            )}
          </div>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-card-border bg-card/80 p-5">
        {error && (
          <div className="rounded-lg border border-white/30 bg-white/5 px-4 py-3 text-sm text-zinc-200">
            {error}
          </div>
        )}

        {usdtVaults.length === 0 ? (
          <p className="text-sm text-zinc-400">No USDT vaults found yet.</p>
        ) : entries.length === 0 && !isLoading ? (
          <p className="text-sm text-zinc-400">No deposits recorded yet.</p>
        ) : (
          <div className="mt-2 overflow-hidden rounded-xl border border-zinc-800">
            <table className="w-full text-left text-sm text-zinc-200">
              <thead className="bg-black/60 text-xs uppercase tracking-[0.12em] text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Depositor</th>
                  <th className="px-4 py-3">Total USDT</th>
                  <th className="px-4 py-3">Points</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => {
                  const amount = Number(ethers.formatUnits(entry.totalDeposited, usdtDecimals));
                  return (
                    <tr key={entry.address} className="border-t border-zinc-900/60 hover:bg-black/40">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2">
                          {index < 3 ? (
                            <Trophy className="h-4 w-4 text-white" />
                          ) : (
                            <span className="text-monad-purple">#{index + 1}</span>
                          )}
                          <span className="text-monad-purple">{index + 1}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-300">{shortAddress(entry.address)}</td>
                      <td className="px-4 py-3 text-monad-purple">
                        {amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </td>
                      <td className="px-4 py-3 text-monad-purple">
                        {entry.points.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {lastUpdated && (
          <p className="mt-3 text-xs text-zinc-500">Last updated: {lastUpdated.toLocaleString()}</p>
        )}
      </section>
    </div>
  );
}
