"use client";

import type { ReactNode } from "react";
import { formatPercentFromBps, formatToken, shortAddress, useVaultKeeper } from "../hooks/useVaultKeeper";

export default function ProfilePage() {
  const { account, isConnected, vaults, stats } = useVaultKeeper();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="rounded-2xl border border-card-border bg-card/80 p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">User Profile</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Your Vault Position</h1>
        <p className="mt-2 text-sm text-zinc-400">Wallet: {isConnected ? shortAddress(account) : "Not connected"}</p>
      </section>

      <section className="mt-6 rounded-2xl border border-card-border bg-card/80 p-5">
        <h2 className="text-lg font-semibold text-white">Summary</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <DataRow label="Connected Wallet" value={isConnected ? "Yes" : "No"} />
          <DataRow label="Vault Count" value={<span className="text-monad-purple">{stats.vaultCount.toString()}</span>} />
          <DataRow label="Reward Token" value={shortAddress(stats.rewardToken)} />
          <DataRow label="Owner" value={shortAddress(stats.owner)} />
        </dl>
      </section>

      <section className="mt-6 rounded-2xl border border-card-border bg-card/80 p-5">
        <h2 className="text-lg font-semibold text-white">Per Vault Position</h2>
        {vaults.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">No vaults available.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="px-3 py-2">Vault</th>
                  <th className="px-3 py-2">Token</th>
                  <th className="px-3 py-2">Your Deposit</th>
                  <th className="px-3 py-2">Pending Rewards</th>
                  <th className="px-3 py-2">Share</th>
                  <th className="px-3 py-2">Vault APY</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {vaults.map((vault) => (
                  <tr key={vault.id} className="border-b border-zinc-900 text-zinc-200">
                    <td className="px-3 py-3">
                      <span className="text-monad-purple">#{vault.id}</span> {vault.name}
                    </td>
                    <td className="px-3 py-3">{vault.tokenSymbol}</td>
                    <td className="px-3 py-3 text-monad-purple">{formatToken(vault.userDeposit, vault.tokenDecimals)}</td>
                    <td className="px-3 py-3 text-monad-purple">{formatToken(vault.userPendingRewards, vault.tokenDecimals)}</td>
                    <td className="px-3 py-3 text-monad-purple">{(Number(vault.userShareBps) / 100).toFixed(2)}%</td>
                    <td className="px-3 py-3 text-monad-purple">
                      {formatPercentFromBps(vault.minAPY)} - {formatPercentFromBps(vault.maxAPY)}
                    </td>
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

function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-black/35 px-3 py-2">
      <dt className="text-zinc-400">{label}</dt>
      <dd className="text-right text-white break-all">{value}</dd>
    </div>
  );
}
