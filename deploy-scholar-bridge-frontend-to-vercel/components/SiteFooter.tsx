'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';

export function SiteFooter() {
  const pathname = usePathname();

  if (pathname === '/login') return null;

  return (
    <footer className="mt-12 border-t border-neutral-200 bg-white py-6 text-center text-xs text-neutral-500">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <div className="flex items-center gap-3 text-left">
          <div className="h-11 w-11 shrink-0 rounded-xl bg-white p-1 shadow-xs ring-1 ring-neutral-200">
            <Image
              src="/mits-gwalior-logo.png"
              alt="MITS Gwalior emblem"
              width={44}
              height={44}
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <p className="font-semibold text-neutral-800">ScholarBridge · MITS Gwalior</p>
            <p className="mt-0.5">Madhav Institute of Technology &amp; Science</p>
          </div>
        </div>
        <p>Ideas grow through collaboration.</p>
      </div>
    </footer>
  );
}
