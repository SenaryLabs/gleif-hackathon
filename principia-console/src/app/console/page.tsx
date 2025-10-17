"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Link2, Users, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

const consoleNavItems = [
  { href: '/console/connections', label: 'Connections', icon: Link2 },
  { href: '/console/contacts', label: 'Contacts', icon: Users },
  { href: '/console/verification', label: 'Verification', icon: ShieldCheck },
];

export default function ConsolePage() {
  const pathname = usePathname();
  
  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="h1">Console</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">Manage identity & wallet connections, resolve OOBIs to contacts, and verify wallet bindings + vLEI credential chains.</p>
      </div>

      {/* Sub-navigation */}
      <div className="nav-pills border-b border-[var(--border)] pb-3">
        {consoleNavItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link 
              key={item.href}
              href={item.href}
              className={clsx('nav-pill', isActive && 'active')}
            >
              <Icon size={16} className="mr-1.5" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <nav className="mt-2">
        <ul className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-md overflow-hidden bg-white">
          {consoleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    'flex items-start gap-3 px-4 py-3 group text-xs leading-tight hover:bg-slate-50 transition-colors',
                    isActive && 'bg-slate-50'
                  )}
                >
                  <Icon size={18} className={clsx('mt-[2px] text-slate-500 group-hover:text-slate-700', isActive && 'text-slate-700')} />
                  <span className="flex flex-col">
                    <span className="font-semibold tracking-wide text-slate-700 group-hover:text-slate-900 text-sm">{item.label}</span>
                    {item.label === 'Connections' && (
                      <span className="text-[11px] text-muted-foreground">Manage identity (Veridian) and Cardano wallet links</span>
                    )}
                    {item.label === 'Contacts' && (
                      <span className="text-[11px] text-muted-foreground">Resolve OOBIs → issuer directory entries</span>
                    )}
                    {item.label === 'Verification' && (
                      <span className="text-[11px] text-muted-foreground">Inspect wallet bindings & vLEI credential chains</span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
