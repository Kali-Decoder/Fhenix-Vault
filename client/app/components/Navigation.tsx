"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Layers3 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { getChainById, getDefaultChain, getDefaultChainId, popularChains } from "../config/chains";
import { VAULT_KEEPER_ADDRESS } from "../config/vault_config";
import { useToastContext } from "../contexts/ToastContext";
import { useCofheClient } from "../hooks/useCofheClient";

export function Navigation() {
  const pathname = usePathname();
  const { showError, showInfo } = useToastContext();
  const { connected: cofheConnected, connecting: cofheConnecting, ensurePermitReady } = useCofheClient();
  const { isConnected } = useAccount();
  const { connectAsync, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const defaultChainId = useMemo(() => getDefaultChainId(), []);
  const [activeChainId, setActiveChainId] = useState<number>(defaultChainId);
  const [isPermitLoading, setIsPermitLoading] = useState(false);
  const explorerBase =
    getChainById(activeChainId)?.blockExplorers?.default.url ?? getDefaultChain().blockExplorers?.default.url ?? "";
  const navItems = [
    { href: "/vaults", label: "Vaults" },
    { href: "/profile", label: "Profile" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/admin", label: "Admin" },
    { href: "/analytics", label: "Analytics" },
  ];

  useEffect(() => {
    const ethereum =
      typeof window !== "undefined" ? ((window as Window & { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown>; on: (event: string, cb: (...args: unknown[]) => void) => void; removeListener: (event: string, cb: (...args: unknown[]) => void) => void } }).ethereum ?? null) : null;
    if (!ethereum) return;

    const loadChain = async () => {
      try {
        const chainHex = (await ethereum.request({ method: "eth_chainId" })) as string;
        setActiveChainId(Number.parseInt(chainHex, 16));
      } catch {
        setActiveChainId(defaultChainId);
      }
    };

    const onChainChanged = (value: unknown) => {
      const chainHex = typeof value === "string" ? value : "0x0";
      setActiveChainId(Number.parseInt(chainHex, 16));
    };

    loadChain();
    ethereum.on("chainChanged", onChainChanged);
    return () => {
      ethereum.removeListener("chainChanged", onChainChanged);
    };
  }, [defaultChainId]);

  const handleChainChange = async (nextId: number) => {
    const ethereum =
      typeof window !== "undefined" ? ((window as Window & { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum ?? null) : null;
    if (!ethereum) {
      showError("Install MetaMask or another EVM wallet to switch networks.");
      return;
    }

    const currentId = activeChainId;
    setActiveChainId(nextId);
    const chain = getChainById(nextId);
    if (!chain) {
      showError("Unsupported network.");
      setActiveChainId(currentId);
      return;
    }

    const chainHex = `0x${nextId.toString(16)}`;
    try {
      await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainHex }] });
      showInfo(`Switched to ${chain.name}.`);
    } catch (switchError) {
      const err = switchError as { code?: number };
      if (err.code !== 4902) {
        const message = switchError instanceof Error ? switchError.message : "Network switch failed.";
        showError(message);
        setActiveChainId(currentId);
        return;
      }

      try {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: chainHex,
              chainName: chain.name,
              nativeCurrency: chain.nativeCurrency,
              rpcUrls: chain.rpcUrls.default.http,
              blockExplorerUrls: chain.blockExplorers?.default?.url ? [chain.blockExplorers.default.url] : [],
            },
          ],
        });
        showInfo(`Added ${chain.name} to wallet.`);
      } catch (addError) {
        const message = addError instanceof Error ? addError.message : "Adding network failed.";
        showError(message);
        setActiveChainId(currentId);
      }
    }
  };

  const handlePermit = async () => {
    if (isPermitLoading) return;
    setIsPermitLoading(true);
    try {
      await ensurePermitReady();
      showInfo("Permit ready.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Permit setup failed.";
      showError(message);
    } finally {
      setIsPermitLoading(false);
    }
  };

  const handleConnect = async () => {
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
  };

  const handleDisconnect = () => {
    disconnect();
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-card-border bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2 text-white">
          <Layers3 className="h-5 w-5 text-white" />
          <span className="text-sm font-semibold tracking-[0.12em] uppercase">VaultKeepr.fun</span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <a
            href={`${explorerBase}/address/${VAULT_KEEPER_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white"
          >
            View Contract
          </a>
          <label className="sr-only" htmlFor="chain-switch">
            Switch network
          </label>
          <select
            id="chain-switch"
            value={activeChainId}
            onChange={(event) => handleChainChange(Number(event.target.value))}
            className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200 hover:border-zinc-500 focus:outline-none focus:border-white"
          >
            {popularChains.map((chain) => (
              <option key={chain.id} value={chain.id}>
                {chain.name}
              </option>
            ))}
          </select>
          <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-black px-3 py-2 text-xs uppercase tracking-[0.12em] text-zinc-200">
            <span className={cofheConnected ? "text-white" : cofheConnecting ? "text-zinc-400" : "text-zinc-500"}>
              CoFHE: {cofheConnected ? "Connected" : cofheConnecting ? "Connecting" : "Offline"}
            </span>
          </div>
          <button
            type="button"
            onClick={handlePermit}
            disabled={!cofheConnected || isPermitLoading}
            className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPermitLoading ? "Permit..." : "Permit"}
          </button>
          {isConnected ? (
            <button
              type="button"
              onClick={handleDisconnect}
              className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200 hover:border-zinc-500"
            >
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              className="rounded-lg bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-black hover:bg-zinc-200 disabled:opacity-60"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-4 pb-3 md:hidden">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${
                active ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        <label className="sr-only" htmlFor="chain-switch-mobile">
          Switch network
        </label>
        <select
          id="chain-switch-mobile"
          value={activeChainId}
          onChange={(event) => handleChainChange(Number(event.target.value))}
          className="shrink-0 rounded-lg border border-zinc-700 bg-black px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200 hover:border-zinc-500 focus:outline-none focus:border-white"
        >
          {popularChains.map((chain) => (
            <option key={chain.id} value={chain.id}>
              {chain.name}
            </option>
          ))}
        </select>
        <div className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-black px-3 py-2 text-xs uppercase tracking-[0.12em] text-zinc-200">
          <span className={cofheConnected ? "text-white" : cofheConnecting ? "text-zinc-400" : "text-zinc-500"}>
            CoFHE: {cofheConnected ? "Connected" : cofheConnecting ? "Connecting" : "Offline"}
          </span>
        </div>
        <button
          type="button"
          onClick={handlePermit}
          disabled={!cofheConnected || isPermitLoading}
          className="shrink-0 rounded-lg border border-zinc-700 bg-black px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPermitLoading ? "Permit..." : "Permit"}
        </button>
        {isConnected ? (
          <button
            type="button"
            onClick={handleDisconnect}
            className="shrink-0 rounded-lg border border-zinc-700 bg-black px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200 hover:border-zinc-500"
          >
            Disconnect
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConnect}
            disabled={isConnecting}
            className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-black hover:bg-zinc-200 disabled:opacity-60"
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
      </div>
    </nav>
  );
}
