"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type RevealValueProps = {
  value: string;
  className?: string;
};

export function RevealValue({ value, className }: RevealValueProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <span className={isVisible ? "text-monad-purple" : "text-zinc-500"}>
        {isVisible ? value : "••••"}
      </span>
      <button
        type="button"
        onClick={() => setIsVisible((prev) => !prev)}
        className="inline-flex items-center justify-center border border-zinc-700 bg-black px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-zinc-200 hover:border-zinc-500"
        aria-label={isVisible ? "Hide value" : "Reveal value"}
      >
        {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}
