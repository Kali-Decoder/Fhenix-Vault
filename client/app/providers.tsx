"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ToastProvider } from "./contexts/ToastContext";
import { ToastContainer } from "./components/Toast";
import { useToastContext } from "./contexts/ToastContext";
import { ContractTxNotifier } from "./components/ContractTxNotifier";

function ToastContainerWrapper() {
  const { toasts, removeToast } = useToastContext();
  return <ToastContainer toasts={toasts} onClose={removeToast} />;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
        <ContractTxNotifier />
        <ToastContainerWrapper />
      </ToastProvider>
    </QueryClientProvider>
  );
}
