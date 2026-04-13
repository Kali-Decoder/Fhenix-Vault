"use client";

import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";

import { ThemeProvider } from "@/components/theme-provider";
import { wagmiConfig } from "@/lib/web3-config";
import { ToastProvider } from "@/app/contexts/ToastContext";
import { ToastContainer } from "@/app/components/Toast";
import { useToastContext } from "@/app/contexts/ToastContext";
import { ContractTxNotifier } from "@/app/components/ContractTxNotifier";

const CofheWalletBridge = dynamic(
  () => import("@/components/cofhe-wallet-bridge").then((module) => module.CofheWalletBridge),
  {
    ssr: false,
  }
);

function ToastContainerWrapper() {
  const { toasts, removeToast } = useToastContext();
  return <ToastContainer toasts={toasts} onClose={removeToast} />;
}

function AutoSwitchToArbSepolia() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  useEffect(() => {
    if (!isConnected) return;
    if (chainId === arbitrumSepolia.id) return;
    void switchChainAsync({ chainId: arbitrumSepolia.id }).catch(() => {});
  }, [chainId, isConnected, switchChainAsync]);

  return null;
}

export function Web3Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light">
      <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
        <QueryClientProvider client={queryClient}>
          <CofheWalletBridge>
            <ToastProvider>
              <AutoSwitchToArbSepolia />
              {children}
              <ContractTxNotifier />
              <ToastContainerWrapper />
            </ToastProvider>
          </CofheWalletBridge>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
