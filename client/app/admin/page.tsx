"use client";

import { useState, type ReactNode } from "react";
import { REWARD_TOKEN_ADDRESS } from "../config/vault_config";
import { shortAddress, useVaultKeeper } from "../hooks/useVaultKeeper";

export default function AdminPage() {
  const {
    isAdmin,
    isConnected,
    isSubmitting,
    vaults,
    stats,
    createVault,
    updateApy,
    mintMockUsdt,
    setRewardToken,
    toggleVaultActive,
    emergencyWithdraw,
  } = useVaultKeeper();

  const [showSetRewardModal, setShowSetRewardModal] = useState(false);
  const [showCreateVaultModal, setShowCreateVaultModal] = useState(false);
  const [showUpdateApyModal, setShowUpdateApyModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const [rewardTokenInput, setRewardTokenInput] = useState(REWARD_TOKEN_ADDRESS);
  const [useDefaultVaultToken, setUseDefaultVaultToken] = useState(true);
  const [createVaultForm, setCreateVaultForm] = useState({
    name: "",
    riskLevel: "0",
    minAPY: "500",
    maxAPY: "800",
    tokenAddress: REWARD_TOKEN_ADDRESS,
  });
  const [updateApyForm, setUpdateApyForm] = useState({ vaultId: "0", minAPY: "", maxAPY: "" });
  const [emergencyForm, setEmergencyForm] = useState({ vaultId: "0", amount: "" });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="rounded-2xl border border-card-border bg-card/80 p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Owner Controls</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Admin Actions</h1>
        <p className="mt-2 text-sm text-zinc-400">Owner: {shortAddress(stats.owner)}</p>
      </section>

      {!isConnected && (
        <section className="mt-6 rounded-2xl border border-white/30 bg-white/5 p-5 text-sm text-zinc-200">
          Connect owner wallet to access admin operations.
        </section>
      )}

      {isConnected && !isAdmin && (
        <section className="mt-6 rounded-2xl border border-white/30 bg-white/5 p-5 text-sm text-zinc-200">
          Connected wallet is not the contract owner. Admin actions are disabled.
        </section>
      )}

      {isAdmin && (
        <>
          <section className="mt-6 rounded-2xl border border-white/40 bg-white/5 p-5">
            <h2 className="text-lg font-semibold text-white">Admin Operations</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <button
                onClick={() => setShowSetRewardModal(true)}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
              >
                Set Reward Token
              </button>
              <button
                onClick={mintMockUsdt}
                disabled={isSubmitting}
                className="rounded-lg border border-white/30 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60"
              >
                Mint FHE-USDT
              </button>
              <button
                onClick={() => setShowCreateVaultModal(true)}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
              >
                Create Vault
              </button>
              <button
                onClick={() => setShowUpdateApyModal(true)}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
              >
                Update APY
              </button>
              <button
                onClick={() => setShowEmergencyModal(true)}
                className="rounded-lg border border-white/30 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Emergency Withdraw
              </button>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-card-border bg-card/80 p-5">
            <h2 className="text-lg font-semibold text-white">Vault Status Control</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {vaults.map((vault) => (
                <div key={vault.id} className="rounded-lg border border-zinc-800 bg-black/35 p-3">
                  <p className="text-sm text-white">
                    Vault <span className="text-monad-purple">#{vault.id}</span> {vault.name}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">Active: {String(vault.active)}</p>
                  <button
                    onClick={() => toggleVaultActive(vault.id)}
                    disabled={isSubmitting}
                    className="mt-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:border-zinc-500 disabled:opacity-60"
                  >
                    Toggle Active
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {showSetRewardModal && (
        <Modal title="Set Reward Token" onClose={() => setShowSetRewardModal(false)}>
          <FormField label="Reward Token Address">
            <input
              value={rewardTokenInput}
              onChange={(e) => setRewardTokenInput(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white"
            />
          </FormField>
          <button
            onClick={async () => {
              await setRewardToken(rewardTokenInput);
              setShowSetRewardModal(false);
            }}
            disabled={isSubmitting}
            className="mt-4 w-full rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-60"
          >
            Save
          </button>
        </Modal>
      )}

      {showCreateVaultModal && (
        <Modal title="Create Vault" onClose={() => setShowCreateVaultModal(false)}>
          <div className="space-y-3">
            <FormField label="Name">
              <input
                value={createVaultForm.name}
                onChange={(e) => setCreateVaultForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white"
              />
            </FormField>
            <FormField label="Risk Level">
              <select
                value={createVaultForm.riskLevel}
                onChange={(e) => setCreateVaultForm((p) => ({ ...p, riskLevel: e.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white"
              >
                <option value="0">Low</option>
                <option value="1">Medium</option>
                <option value="2">High</option>
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Min APY (bps)">
                <input
                  value={createVaultForm.minAPY}
                  onChange={(e) => setCreateVaultForm((p) => ({ ...p, minAPY: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white"
                />
              </FormField>
              <FormField label="Max APY (bps)">
                <input
                  value={createVaultForm.maxAPY}
                  onChange={(e) => setCreateVaultForm((p) => ({ ...p, maxAPY: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white"
                />
              </FormField>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={useDefaultVaultToken}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setUseDefaultVaultToken(next);
                    setCreateVaultForm((p) => ({
                      ...p,
                      tokenAddress: next ? REWARD_TOKEN_ADDRESS : "",
                    }));
                  }}
                  className="h-4 w-4 rounded border-zinc-600 bg-black text-white focus:ring-white"
                />
                Use default USDT token
              </label>
              <FormField label="Token Address">
                <input
                  value={createVaultForm.tokenAddress}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setCreateVaultForm((p) => ({ ...p, tokenAddress: nextValue }));
                    if (useDefaultVaultToken && nextValue !== REWARD_TOKEN_ADDRESS) {
                      setUseDefaultVaultToken(false);
                    }
                  }}
                  disabled={useDefaultVaultToken}
                  className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white disabled:cursor-not-allowed disabled:bg-zinc-900/40"
                />
              </FormField>
            </div>
          </div>

          <button
            onClick={async () => {
              await createVault(createVaultForm);
              setShowCreateVaultModal(false);
            }}
            disabled={isSubmitting}
            className="mt-4 w-full rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-60"
          >
            Create Vault
          </button>
        </Modal>
      )}

      {showUpdateApyModal && (
        <Modal title="Update APY" onClose={() => setShowUpdateApyModal(false)}>
          <div className="space-y-3">
            <FormField label="Vault ID">
              <input
                value={updateApyForm.vaultId}
                onChange={(e) => setUpdateApyForm((p) => ({ ...p, vaultId: e.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white"
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Min APY (bps)">
                <input
                  value={updateApyForm.minAPY}
                  onChange={(e) => setUpdateApyForm((p) => ({ ...p, minAPY: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white"
                />
              </FormField>
              <FormField label="Max APY (bps)">
                <input
                  value={updateApyForm.maxAPY}
                  onChange={(e) => setUpdateApyForm((p) => ({ ...p, maxAPY: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white"
                />
              </FormField>
            </div>
          </div>
          <button
            onClick={async () => {
              await updateApy(updateApyForm);
              setShowUpdateApyModal(false);
            }}
            disabled={isSubmitting}
            className="mt-4 w-full rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-60"
          >
            Update APY
          </button>
        </Modal>
      )}

      {showEmergencyModal && (
        <Modal title="Emergency Withdraw" onClose={() => setShowEmergencyModal(false)}>
          <div className="space-y-3">
            <FormField label="Vault ID">
              <input
                value={emergencyForm.vaultId}
                onChange={(e) => setEmergencyForm((p) => ({ ...p, vaultId: e.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white"
              />
            </FormField>
            <FormField label="Amount (human units)">
              <input
                value={emergencyForm.amount}
                onChange={(e) => setEmergencyForm((p) => ({ ...p, amount: e.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white"
              />
            </FormField>
          </div>
          <button
            onClick={async () => {
              await emergencyWithdraw(emergencyForm);
              setShowEmergencyModal(false);
            }}
            disabled={isSubmitting}
            className="mt-4 w-full rounded-lg border border-white/30 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60"
          >
            Withdraw
          </button>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-card-border bg-card/95 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-sm text-zinc-400 hover:text-white">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-zinc-300">{label}</span>
      {children}
    </label>
  );
}
