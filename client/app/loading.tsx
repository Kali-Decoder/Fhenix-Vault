import Image from "next/image";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <Image src="/vault.gif" alt="Loading" width={260} height={260} priority unoptimized />
        <p className="text-xs uppercase tracking-[0.3em] text-gray-300">Loading...</p>
      </div>
    </div>
  );
}
