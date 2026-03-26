"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Toast, ToastType } from "@/app/components/Toast";
import type { CSSProperties } from "react";

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string | React.ReactNode, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string | React.ReactNode, duration?: number) => void;
  showError: (message: string | React.ReactNode, duration?: number) => void;
  showInfo: (message: string | React.ReactNode, duration?: number) => void;
  showWarning: (message: string | React.ReactNode, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confettiBursts, setConfettiBursts] = useState<Array<{ id: string }>>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const triggerConfetti = useCallback(() => {
    const id = Math.random().toString(36).substring(2, 9);
    setConfettiBursts((prev) => [...prev, { id }]);
    setTimeout(() => {
      setConfettiBursts((prev) => prev.filter((burst) => burst.id !== id));
    }, 2200);
  }, []);

  const showToast = useCallback(
    (message: string | React.ReactNode, type: ToastType = "info", duration?: number) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = {
        id,
        message,
        type,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  const showSuccess = useCallback(
    (message: string | React.ReactNode, duration?: number) => {
      showToast(message, "success", duration);
      triggerConfetti();
    },
    [showToast, triggerConfetti]
  );

  const showError = useCallback(
    (message: string | React.ReactNode, duration?: number) => {
      showToast(message, "error", duration);
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string | React.ReactNode, duration?: number) => {
      showToast(message, "info", duration);
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string | React.ReactNode, duration?: number) => {
      showToast(message, "warning", duration);
    },
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        showSuccess,
        showError,
        showInfo,
        showWarning,
        removeToast,
      }}
    >
      {children}
      <ConfettiLayer bursts={confettiBursts} />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToastContext must be used within a ToastProvider");
  }
  return context;
}

function ConfettiLayer({ bursts }: { bursts: Array<{ id: string }> }) {
  if (bursts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden">
      {bursts.map((burst) => (
        <ConfettiBurst key={burst.id} />
      ))}
    </div>
  );
}

function ConfettiBurst() {
  const colors = ["#876dff", "#f59e0b", "#10b981", "#ef4444", "#3b82f6"];
  const pieces = Array.from({ length: 45 }).map((_, idx) => {
    const left = Math.random() * 100;
    const drift = `${Math.round(Math.random() * 180 - 90)}px`;
    const rot = `${Math.round(Math.random() * 720 - 360)}deg`;
    const delay = `${Math.round(Math.random() * 250)}ms`;
    const duration = `${1100 + Math.round(Math.random() * 900)}ms`;
    const size = 4 + Math.round(Math.random() * 5);
    const background = colors[idx % colors.length];

    const style: CSSProperties = {
      left: `${left}%`,
      top: "-8vh",
      width: `${size}px`,
      height: `${size + 2}px`,
      background,
      animationName: "confetti-fall",
      animationTimingFunction: "linear",
      animationFillMode: "forwards",
      animationDelay: delay,
      animationDuration: duration,
      ["--drift" as string]: drift,
      ["--rot" as string]: rot,
    };

    return <span key={idx} className="absolute opacity-90" style={style} />;
  });

  return <>{pieces}</>;
}
