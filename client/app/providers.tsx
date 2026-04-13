"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { ToastProvider } from "./contexts/ToastContext";
import { ToastContainer } from "./components/Toast";
import { useToastContext } from "./contexts/ToastContext";
import { ContractTxNotifier } from "./components/ContractTxNotifier";
import { CofheProvider } from "@/contexts/cofhe-provider";
import { wagmiConfig } from "@/lib/web3-config";

function ToastContainerWrapper() {
  const { toasts, removeToast } = useToastContext();
  return <ToastContainer toasts={toasts} onClose={removeToast} />;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <CofheProvider>
          <ToastProvider>
            {children}
            <ContractTxNotifier />
            <ToastContainerWrapper />
          </ToastProvider>
        </CofheProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
