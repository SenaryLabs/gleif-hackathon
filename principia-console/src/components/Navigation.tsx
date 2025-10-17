"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, UserCheck, Link as LinkIcon, Settings, LayoutDashboard, Layers } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/onboarding', label: 'Onboarding', icon: UserCheck },
  { href: '/wallet-binding', label: 'Wallet Binding', icon: LinkIcon },
  { href: '/console', label: 'Console', icon: Layers },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="navbar sticky top-0 z-40">
      <div className="container-lg flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-foreground text-sm tracking-tight">
            <span className="inline-block w-2 h-2 rounded-full bg-primary shadow-sm" />
            Principia Console
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={clsx('nav-link', active && 'active')}> 
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden lg:block text-xs text-tertiary">CMD + K</div>
          <button className="btn btn-outline text-xs">Sign In</button>
        </div>
      </div>
    </header>
  );
}

export default Navigation;
