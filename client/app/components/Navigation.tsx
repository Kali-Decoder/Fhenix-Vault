"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Layers3 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { formatUnits } from "viem";
import { arbSepolia, getChainById, getDefaultChain, getDefaultChainId, popularChains } from "../config/chains";
import { REWARD_TOKEN_ADDRESS, VAULT_KEEPER_ADDRESS } from "../config/vault_config";
import { useToastContext } from "../contexts/ToastContext";
import { useCofheClient } from "../hooks/useCofheClient";
import { useConfidentialTokenBalance } from "../hooks/useConfidentialTokenBalance";

export function Navigation() {
  const pathname = usePathname();
  const { showError, showInfo } = useToastContext();
  const { connected: cofheConnected, connecting: cofheConnecting, ensurePermitReady } = useCofheClient();
  const { symbol, decimals, balance, loading: balanceLoading } = useConfidentialTokenBalance(REWARD_TOKEN_ADDRESS);
  const { isConnected, address } = useAccount();
  const { connectAsync, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const defaultChainId = useMemo(() => getDefaultChainId(), []);
  const [activeChainId, setActiveChainId] = useState<number>(defaultChainId);
  const [isPermitLoading, setIsPermitLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const profileMobileRef = useRef<HTMLDivElement | null>(null);
  const explorerBase =
    getChainById(activeChainId)?.blockExplorers?.default.url ?? getDefaultChain().blockExplorers?.default.url ?? "";
  const activeChainName = getChainById(activeChainId)?.name ?? getDefaultChain().name;
  const formattedBalance =
    balance.value !== null ? Number(formatUnits(balance.value, decimals)).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    }) : "--";
  const statusLabel = cofheConnected ? "Connected" : cofheConnecting ? "Connecting" : "Offline";

  useEffect(() => {
    if (!profileOpen) return;
    const onClick = (event: MouseEvent) => {
      const inDesktop = profileRef.current?.contains(event.target as Node);
      const inMobile = profileMobileRef.current?.contains(event.target as Node);
      if (!inDesktop && !inMobile) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [profileOpen]);
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
          {/* Profile dropdown holds wallet stats + actions */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200 hover:border-zinc-500"
            >
              <span className="mr-2 inline-flex h-2 w-2 items-center justify-center rounded-full border border-zinc-700">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    cofheConnected ? "bg-emerald-400" : "bg-rose-500"
                  }`}
                />
              </span>
              Profile
            </button>
            {profileOpen ? (
              <div
                className="absolute right-0 mt-2 w-72 rounded-xl border border-zinc-800 bg-black/95 p-3 text-xs text-zinc-200 shadow-xl"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Address</span>
                  <span className="text-white">{isConnected ? "Connected" : "Disconnected"}</span>
                </div>
                <div className="mt-1 break-all text-[11px] text-zinc-400">
                  {address ?? "No wallet connected"}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-zinc-400">Network</span>
                  <span className="text-white">{activeChainName}</span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-zinc-400">CoFHE</span>
                  <span className={cofheConnected ? "text-white" : "text-zinc-500"}>{statusLabel}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-zinc-400">{symbol} Balance</span>
                  <span className="text-white">{balanceLoading ? "Loading" : formattedBalance}</span>
                </div>

                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    onClick={handlePermit}
                    disabled={!cofheConnected || isPermitLoading}
                    className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPermitLoading ? "Permit..." : "Permit"}
                  </button>
                  <a
                    href={`${explorerBase}/address/${VAULT_KEEPER_ADDRESS}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200 hover:border-zinc-500"
                  >
                    View Contract
                  </a>
                  <button
                    type="button"
                    onClick={() => handleChainChange(arbSepolia.id)}
                    className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200 hover:border-zinc-500"
                  >
                    Switch to Arbitrum
                  </button>
                  {isConnected ? (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200 hover:border-zinc-500"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="w-full rounded-lg bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-black hover:bg-zinc-200 disabled:opacity-60"
                    >
                      {isConnecting ? "Connecting..." : "Connect Wallet"}
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
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
        <div className="relative" ref={profileMobileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            className="shrink-0 rounded-lg border border-zinc-700 bg-black px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200 hover:border-zinc-500"
          >
            Profile
          </button>
          {profileOpen ? (
            <div
              className="absolute right-0 mt-2 w-72 rounded-xl border border-zinc-800 bg-black/95 p-3 text-xs text-zinc-200 shadow-xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Address</span>
                <span className="text-white">{isConnected ? "Connected" : "Disconnected"}</span>
              </div>
              <div className="mt-1 break-all text-[11px] text-zinc-400">
                {address ?? "No wallet connected"}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-zinc-400">Network</span>
                <span className="text-white">{activeChainName}</span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-zinc-400">CoFHE</span>
                <span className={cofheConnected ? "text-white" : "text-zinc-500"}>{statusLabel}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-zinc-400">{symbol} Balance</span>
                <span className="text-white">{balanceLoading ? "Loading" : formattedBalance}</span>
              </div>

              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={handlePermit}
                  disabled={!cofheConnected || isPermitLoading}
                  className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPermitLoading ? "Permit..." : "Permit"}
                </button>
                <a
                  href={`${explorerBase}/address/${VAULT_KEEPER_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200 hover:border-zinc-500"
                >
                  View Contract
                </a>
                <button
                  type="button"
                  onClick={() => handleChainChange(arbSepolia.id)}
                  className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200 hover:border-zinc-500"
                >
                  Switch to Arbitrum
                </button>
                {isConnected ? (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200 hover:border-zinc-500"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="w-full rounded-lg bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-black hover:bg-zinc-200 disabled:opacity-60"
                  >
                    {isConnecting ? "Connecting..." : "Connect Wallet"}
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
