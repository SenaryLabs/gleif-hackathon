"use client";
import { Logo } from '@/components/console/Logo';

export function TopBar() {
  return (
    <div className="topbar topbar-shadow h-[48px]">
      <div className="topbar-inner py-0 px-0 h-full">
        <div className="w-full h-full flex items-center justify-between pr-6 pl-4">
          <div className="flex items-center h-full">
            <Logo />
          </div>
          <div className="text-[11px] text-muted-foreground text-right leading-tight hidden md:block">
            GLEIF vLEI Hackathon 2025: Digital Assets & Financial Infrastructures
          </div>
        </div>
      </div>
    </div>
  );
}

export default TopBar;
