"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Coins, Shield, Target, TrendingUp, Trophy, Users, Zap } from "lucide-react";

const features = [
  {
    icon: Coins,
    title: "Encrypted Positions",
    detail: "Balances, deposits, rewards, and TVL stay private on-chain using Fhenix FHE.",
  },
  {
    icon: TrendingUp,
    title: "Private Yield",
    detail: "Yield accrues and settles over encrypted data without revealing sensitive values.",
  },
  {
    icon: Shield,
    title: "Risk-Based Vaults",
    detail: "Choose low, medium, or high risk vaults without exposing portfolio behavior.",
  },
  {
    icon: Zap,
    title: "Confidential ERC-20",
    detail: "Encrypted transfers and approvals via FHE-enabled tokens and safe inputs.",
  },
  {
    icon: Users,
    title: "Frontend Crypto Pipeline",
    detail: "The UI encrypts inputs and decrypts outputs so only you can see your data.",
  },
  {
    icon: Target,
    title: "Composability + Safety",
    detail: "Confidential DeFi without sacrificing security, UX, or on-chain composability.",
  },
];

const steps = [
  {
    title: "Connect Wallet",
    detail: "Connect an EVM wallet on Base Sepolia or Arbitrum Sepolia.",
  },
  {
    title: "Encrypt Inputs",
    detail: "The frontend encrypts amounts with the Fhenix SDK before any transaction.",
  },
  {
    title: "Deposit Privately",
    detail: "Deposit into a risk-based vault while keeping balances fully confidential.",
  },
  {
    title: "Decrypt Your View",
    detail: "You see your balances and rewards; the chain keeps everything encrypted.",
  },
];

const overviewSections = [
  {
    title: "What It Does",
    detail:
      "VaultKeeper is a privacy-first DeFi yield platform built using Fhenix FHE. Users deposit into risk-based vaults, earn yield, and manage positions while financial data stays encrypted on-chain.",
  },
  {
    title: "The Problem It Solves",
    detail:
      "Most DeFi platforms are fully transparent, exposing balances and strategies. VaultKeeper enables confidential DeFi so users can participate without leaking sensitive financial behavior.",
  },
  {
    title: "Challenges We Faced",
    detail:
      "Adapting Solidity logic to FHE, handling encrypted data types, designing encryption-aware frontend flows, integrating token transfers with encrypted inputs, and debugging without plaintext visibility.",
  },
  {
    title: "Technologies We Used",
    detail:
      "Fhenix FHE (CoFHE + FHE.sol), Solidity 0.8.x, Hardhat + TypeScript, Next.js, Ethers.js/Wagmi, and the Fhenix JS SDK for encryption and decryption.",
  },
  {
    title: "How We Built It",
    detail:
      "We redesigned an ERC-20 vault system for FHE, replaced sensitive types with encrypted equivalents, and used FHE.add/sub/select for secure computation. The frontend now encrypts inputs and decrypts outputs.",
  },
  {
    title: "What We Learned",
    detail:
      "FHE contracts require a functional mindset, privacy is secure computation (not just hiding data), and the frontend becomes a critical cryptographic layer.",
  },
  {
    title: "What's Next",
    detail:
      "A full private dashboard with selective decryption, multiple confidential assets, cross-vault strategies, private governance, CoFHE gas optimizations, and real-user deployments.",
  },
];

export default function Home() {
  const [heroLogoSrc, setHeroLogoSrc] = useState("/vault.gif");

  return (
    <div className="min-h-screen overflow-x-hidden">
      <section className="relative z-10 flex min-h-[92vh] flex-col items-center justify-center px-4 pb-28 pt-20 text-center">
        <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
          <div className="space-y-6">
            <div className="relative flex items-center justify-center">
              <img
                src={heroLogoSrc}
                alt="VaultKeepr.fun"
                onError={() => setHeroLogoSrc("/loadr.gif")}
                className="h-auto w-[280px] object-contain sm:w-[420px] md:w-[560px] lg:w-[720px]"
              />
            </div>
            <p className="text-3xl font-light tracking-wide text-zinc-300 md:text-4xl">
              Private DeFi Yield on Fhenix FHE
            </p>
          </div>

          <p className="mx-auto max-w-3xl text-xl leading-relaxed text-zinc-400">
            VaultKeeper is a privacy-first yield platform where balances, deposits, rewards, and TVL remain encrypted
            on-chain. Earn yield without exposing your financial data.
          </p>

          <div className="flex flex-col items-center justify-center gap-5 pt-6 sm:flex-row">
            <Link
              href="/vaults"
              className="group relative bg-white px-10 py-4 text-lg font-bold text-black transition-all hover:scale-105 hover:bg-zinc-200"
            >
              <span className="relative flex items-center gap-2">
                Open Vaults
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <Link
              href="/analytics"
              className="group border border-zinc-500 bg-black px-10 py-4 text-lg font-semibold text-white transition-all hover:scale-105 hover:bg-zinc-900"
            >
              <span className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                View Analytics
              </span>
            </Link>
          </div>

          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 pt-14 md:grid-cols-4">
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-monad-purple">4</div>
              <div className="text-sm text-zinc-400">Core Modules</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-monad-purple">100</div>
              <div className="text-sm text-zinc-400">USDT Faucet Amount</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-monad-purple">3</div>
              <div className="text-sm text-zinc-400">Risk Segments</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-monad-purple">24/7</div>
              <div className="text-sm text-zinc-400">On-Chain Access</div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-5xl font-bold text-white">Why VaultKeeper?</h2>
            <p className="mx-auto max-w-2xl text-xl text-zinc-400">
              Traditional DeFi exposes every balance and strategy. VaultKeeper keeps financial data confidential while
              preserving security and composability.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="border border-card-border bg-card/80 p-6 transition hover:border-white/60">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center bg-zinc-900">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-white">{feature.title}</h3>
                  <p className="leading-relaxed text-zinc-400">{feature.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-y border-card-border bg-black/30 px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-5xl font-bold text-white">How It Works</h2>
            <p className="mx-auto max-w-2xl text-xl text-zinc-400">
              FHE-powered flows: encrypt on the frontend, compute on-chain, decrypt only for you.
            </p>
          </div>
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, idx) => (
              <div key={step.title} className="border border-card-border bg-card/70 p-5">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center border border-zinc-400 text-lg font-bold text-monad-purple">
                  {idx + 1}
                </div>
                <h3 className="mb-2 text-xl font-bold text-white">{step.title}</h3>
                <p className="text-zinc-400">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-5xl font-bold text-white">Project Overview</h2>
            <p className="mx-auto max-w-3xl text-xl text-zinc-400">
              The why, how, and what's next for VaultKeeper's confidential DeFi stack.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {overviewSections.map((section) => (
              <div key={section.title} className="border border-card-border bg-card/80 p-6">
                <h3 className="mb-3 text-2xl font-bold text-white">{section.title}</h3>
                <p className="leading-relaxed text-zinc-400">{section.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-4 py-24">
        <div className="mx-auto max-w-5xl border border-card-border bg-card/80 p-8">
          <h2 className="mb-8 text-center text-4xl font-bold text-white">Go To Modules</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Link href="/vaults" className="border border-zinc-800 bg-black/35 p-5 text-white transition hover:border-white">
              <p className="text-xl font-semibold">Vaults</p>
              <p className="mt-2 text-sm text-zinc-400">Deposit, withdraw, and claim yield with encrypted balances.</p>
            </Link>
            <Link href="/profile" className="border border-zinc-800 bg-black/35 p-5 text-white transition hover:border-white">
              <p className="text-xl font-semibold">Profile</p>
              <p className="mt-2 text-sm text-zinc-400">View your decrypted balances, positions, and rewards.</p>
            </Link>
            <Link href="/admin" className="border border-zinc-800 bg-black/35 p-5 text-white transition hover:border-white">
              <p className="text-xl font-semibold">Admin</p>
              <p className="mt-2 text-sm text-zinc-400">Manage vaults and APY without exposing user balances.</p>
            </Link>
            <Link href="/analytics" className="border border-zinc-800 bg-black/35 p-5 text-white transition hover:border-white">
              <p className="text-xl font-semibold">Analytics</p>
              <p className="mt-2 text-sm text-zinc-400">Track system metrics while sensitive data stays encrypted.</p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
