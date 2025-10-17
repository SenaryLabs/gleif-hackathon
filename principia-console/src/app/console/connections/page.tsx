"use client";
import Link from 'next/link';
import { Link2, Wallet, Network } from 'lucide-react';

export default function ConnectionsPage() {
  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="h2 mb-1">Connections</h2>
        <p className="text-sm text-muted-foreground max-w-3xl">Manage wallet connections, resolve OOBIs, and configure network settings.</p>
      </div>
      <nav>
        <ul className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-md overflow-hidden bg-white">
          <li>
            <Link href="/console/connections/identity" className="flex items-start gap-3 px-4 py-3 group hover:bg-slate-50 transition-colors">
              <Link2 className="h-5 w-5 text-slate-500 group-hover:text-slate-700 mt-[2px]" />
              <span className="flex flex-col">
                <span className="font-semibold tracking-wide text-slate-700 group-hover:text-slate-900 text-sm">Identity Wallet</span>
                <span className="text-[11px] text-muted-foreground">Connect Veridian identity wallet (CIP-45 QR)</span>
              </span>
            </Link>
          </li>
          <li>
            <Link href="/console/connections/oobi" className="flex items-start gap-3 px-4 py-3 group hover:bg-slate-50 transition-colors">
              <Network className="h-5 w-5 text-slate-500 group-hover:text-slate-700 mt-[2px]" />
              <span className="flex flex-col">
                <span className="font-semibold tracking-wide text-slate-700 group-hover:text-slate-900 text-sm">OOBI Resolution</span>
                <span className="text-[11px] text-muted-foreground">Resolve Out-Of-Band Introductions → contacts</span>
              </span>
            </Link>
          </li>
          <li>
            <Link href="/console/connections/cardano" className="flex items-start gap-3 px-4 py-3 group hover:bg-slate-50 transition-colors">
              <Wallet className="h-5 w-5 text-slate-500 group-hover:text-slate-700 mt-[2px]" />
              <span className="flex flex-col">
                <span className="font-semibold tracking-wide text-slate-700 group-hover:text-slate-900 text-sm">Cardano Wallet</span>
                <span className="text-[11px] text-muted-foreground">Detect & link CIP-30 Cardano wallets</span>
              </span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
