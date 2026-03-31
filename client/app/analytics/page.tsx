"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ethers } from "ethers";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatPercentFromBps,
  formatToken,
  riskName,
  useVaultKeeper,
} from "../hooks/useVaultKeeper";
import { EncryptedValue } from "../components/EncryptedValue";
import { RevealValue } from "../components/RevealValue";
import { useCofheClient } from "../hooks/useCofheClient";

export default function AnalyticsPage() {
  const { vaults, stats, isConnected, isCorrectNetwork } = useVaultKeeper();
  const { decryptUint64 } = useCofheClient();
  const [tvlDisplay, setTvlDisplay] = useState<string>("••••");
  const [decryptedChartData, setDecryptedChartData] = useState<
    Array<{
      name: string;
      vaultName: string;
      tvl: number;
      minApy: number;
      maxApy: number;
      depositors: number;
    }>
  >([]);

  const totals = useMemo(() => {
    const totalDepositors = vaults.reduce((acc, v) => acc + Number(v.depositorCount), 0);
    const activeVaults = vaults.filter((v) => v.active).length;
    const byToken = new Map<string, { ctHashes: string[]; decimals: number; symbol: string }>();

    for (const vault of vaults) {
      const key = `${vault.tokenSymbol}-${vault.tokenDecimals}`;
      const prev = byToken.get(key);
      if (prev) {
        prev.ctHashes.push(vault.totalValueLocked);
      } else {
        byToken.set(key, {
          ctHashes: [vault.totalValueLocked],
          decimals: vault.tokenDecimals,
          symbol: vault.tokenSymbol,
        });
      }
    }

    return { totalDepositors, activeVaults, byToken };
  }, [vaults]);

  useEffect(() => {
    let cancelled = false;

    const loadTotals = async () => {
      if (!vaults.length || !isConnected || !isCorrectNetwork) {
        if (!cancelled) setTvlDisplay("0");
        return;
      }
      try {
        const entries = Array.from(totals.byToken.values());
        const parts = await Promise.all(
          entries.map(async (entry) => {
            let sum = 0n;
            for (const ctHash of entry.ctHashes) {
              const value = await decryptUint64(ctHash);
              sum += value;
            }
            return `${formatToken(sum, entry.decimals)} ${entry.symbol}`;
          })
        );
        if (!cancelled) {
          setTvlDisplay(parts.filter(Boolean).join(" + ") || "0");
        }
      } catch {
        if (!cancelled) setTvlDisplay("••••");
      }
    };

    loadTotals();
    return () => {
      cancelled = true;
    };
  }, [decryptUint64, isConnected, isCorrectNetwork, totals.byToken, vaults.length]);

  useEffect(() => {
    let cancelled = false;
    const loadChartData = async () => {
      if (vaults.length === 0 || !isConnected || !isCorrectNetwork) {
        if (!cancelled) setDecryptedChartData([]);
        return;
      }
      try {
        const next = await Promise.all(
          vaults.map(async (vault) => {
            const tvlPlain = await decryptUint64(vault.totalValueLocked);
            return {
              name: `${vault.id}-${vault.name}`,
              vaultName: `#${vault.id} ${vault.name}`,
              tvl: Number(ethers.formatUnits(tvlPlain, vault.tokenDecimals)),
              minApy: Number(vault.minAPY) / 100,
              maxApy: Number(vault.maxAPY) / 100,
              depositors: Number(vault.depositorCount),
            };
          })
        );
        if (!cancelled) setDecryptedChartData(next);
      } catch {
        if (!cancelled) setDecryptedChartData([]);
      }
    };

    loadChartData();
    return () => {
      cancelled = true;
    };
  }, [decryptUint64, isConnected, isCorrectNetwork, vaults]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="rounded-2xl border border-card-border bg-card/80 p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Protocol Analytics</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Analytics</h1>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Vault Count" value={stats.vaultCount.toString()} />
        <StatCard label="Active Vaults" value={String(totals.activeVaults)} />
        <StatCard label="Total Depositor Count" value={String(totals.totalDepositors)} />
        <StatCard label="Total TVL" value={<RevealValue value={tvlDisplay || "0"} />} />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <ChartCard title="TVL by Vault">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={decryptedChartData}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="tvl" name="TVL" stroke="#f4f4f5" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="APY by Vault">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={decryptedChartData}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="minApy" name="Min APY %" stroke="#d4d4d8" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="maxApy" name="Max APY %" stroke="#a1a1aa" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Depositors by Vault">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={decryptedChartData}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="depositors"
                name="Depositors"
                stroke="#e4e4e7"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="mt-6 rounded-2xl border border-card-border bg-card/80 p-5">
        <h2 className="text-lg font-semibold text-white">Vault Metrics</h2>
        {vaults.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">No vault metrics yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="px-3 py-2">Vault</th>
                  <th className="px-3 py-2">Risk</th>
                  <th className="px-3 py-2">APY Range</th>
                  <th className="px-3 py-2">Token</th>
                  <th className="px-3 py-2">TVL</th>
                  <th className="px-3 py-2">Depositor Count</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {vaults.map((vault) => (
                  <tr key={vault.id} className="border-b border-zinc-900 text-zinc-200">
                    <td className="px-3 py-3">
                      <span className="text-monad-purple">#{vault.id}</span> {vault.name}
                    </td>
                    <td className="px-3 py-3">{riskName(vault.riskLevel)}</td>
                    <td className="px-3 py-3 text-monad-purple">
                      {formatPercentFromBps(vault.minAPY)} - {formatPercentFromBps(vault.maxAPY)}
                    </td>
                    <td className="px-3 py-3">{vault.tokenSymbol}</td>
                    <td className="px-3 py-3 text-monad-purple">
                      <EncryptedValue
                        ctHash={vault.totalValueLocked}
                        decimals={vault.tokenDecimals}
                        suffix={vault.tokenSymbol}
                      />
                    </td>
                    <td className="px-3 py-3 text-monad-purple">{vault.depositorCount.toString()}</td>
                    <td className="px-3 py-3">
                      <span className={vault.active ? "text-white" : "text-zinc-400"}>
                        {vault.active ? "Active" : "Paused"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-card-border bg-card/80 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-monad-purple break-all sm:text-4xl">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-card-border bg-card/80 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-300">{title}</h2>
      <div className="mt-4 rounded-lg border border-zinc-800 bg-black/35 p-2">{children}</div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-black/90 px-3 py-2 text-xs text-zinc-200">
      <p className="mb-1 font-semibold text-white">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name}>
          {entry.name}: <span className="text-monad-purple">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}
