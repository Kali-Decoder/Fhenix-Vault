"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { formatToken } from "../hooks/useVaultKeeper";
import { useCofheClient } from "../hooks/useCofheClient";

type EncryptedValueProps = {
  ctHash?: string | null;
  decimals?: number;
  suffix?: string;
  formatValue?: (value: bigint) => string;
  className?: string;
};

export function EncryptedValue({
  ctHash,
  decimals,
  suffix,
  formatValue,
  className,
}: EncryptedValueProps) {
  const { decryptUint64 } = useCofheClient();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [value, setValue] = useState<bigint | null>(null);

  const displayValue = useMemo(() => {
    if (!isVisible) return "••••";
    if (value === null) return "…";
    const formatted = formatValue
      ? formatValue(value)
      : decimals !== undefined
        ? formatToken(value, decimals)
        : value.toString();
    return suffix ? `${formatted} ${suffix}` : formatted;
  }, [decimals, formatValue, isVisible, suffix, value]);

  const handleToggle = async () => {
    if (isVisible) {
      setIsVisible(false);
      return;
    }
    if (!ctHash) {
      setValue(0n);
      setIsVisible(true);
      return;
    }
    if (value !== null) {
      setIsVisible(true);
      return;
    }
    setIsLoading(true);
    try {
      const decrypted = await decryptUint64(ctHash);
      setValue(decrypted);
      setIsVisible(true);
    } catch {
      setIsVisible(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <span className={isVisible ? "text-monad-purple" : "text-zinc-500"}>{displayValue}</span>
      <button
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center justify-center border border-zinc-700 bg-black px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-zinc-200 hover:border-zinc-500"
        aria-label={isVisible ? "Hide decrypted value" : "Decrypt value"}
        disabled={isLoading}
      >
        {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}
