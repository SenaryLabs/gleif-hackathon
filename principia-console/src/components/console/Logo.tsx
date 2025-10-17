"use client";
import { PrincipiaLogo } from '@/components/PrincipiaLogo';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 select-none ${className || ''}`}>      
      <PrincipiaLogo className="h-8 w-auto" />
    </div>
  );
}

export default Logo;


