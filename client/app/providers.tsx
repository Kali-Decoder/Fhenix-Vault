"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { ToastProvider } from "./contexts/ToastContext";
import { ToastContainer } from "./components/Toast";
import { useToastContext } from "./contexts/ToastContext";
import { ContractTxNotifier } from "./components/ContractTxNotifier";
import { CofheProvider } from "@/contexts/cofhe-provider";

function ToastContainerWrapper() {
  const { toasts, removeToast } = useToastContext();
  return <ToastContainer toasts={toasts} onClose={removeToast} />;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [wagmiConfig] = useState(() =>
    createConfig({
      chains: [arbitrumSepolia],
      connectors: [injected()],
      transports: {
        [arbitrumSepolia.id]: http(),
      },
    })
  );

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
