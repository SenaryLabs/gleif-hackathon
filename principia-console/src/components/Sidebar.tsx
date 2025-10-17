"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Briefcase, ShieldCheck, Link as LinkIcon, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';

// Navigation structure grouped by sections for consistent rendering
interface NavItem {
  href: string;
  label: string;
  icon: any; // lucide icons are functional components
}
interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    id: 'onboarding',
    label: 'Onboarding',
    items: [
      { href: '/', label: 'Home', icon: LayoutDashboard },
      { href: '/onboarding', label: 'Onboarding', icon: Briefcase },
      { href: '/wallet-binding', label: 'Wallet Binding', icon: Wallet },
      { href: '/console', label: 'Console', icon: ShieldCheck },
    ],
  },
  {
    id: 'issuance',
    label: 'Issuance',
    items: [
      { href: '/bond-issuance', label: 'Bond Issuance', icon: LinkIcon },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  // When collapsed, show only icons and a tooltip via title attribute
  return (
    <aside className={clsx('sidebar pt-2 transition-all duration-200', collapsed && 'w-[72px]')}>
      <div className={clsx('flex items-center justify-between px-4 pb-2', collapsed && 'px-3')}>
        <div className={clsx('font-semibold text-xs tracking-wide text-muted-foreground uppercase', collapsed && 'sr-only')}>Navigation</div>
        <button
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed(c => !c)}
          className="btn btn-ghost p-1 h-7 w-7 flex items-center justify-center"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
      {navSections.map(section => (
        <div key={section.id} className="mb-4">
          <div className={clsx('px-4 mb-1 text-[10px] tracking-wide uppercase font-semibold text-tertiary opacity-70', collapsed && 'sr-only')}>
            {section.label}
          </div>
          <nav className="sidebar-nav">
            {section.items.map(item => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx('sidebar-link group', active && 'active', collapsed && 'justify-center px-3')}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={16} className={clsx('shrink-0', active && 'text-primary')} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {active && <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
      <div className={clsx('mt-auto sidebar-footer', collapsed && 'px-2 text-center')}>© {new Date().getFullYear()} Principia</div>
    </aside>
  );
}

export default Sidebar;
