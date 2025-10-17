import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Principia Console',
  description: 'Principia institutional onboarding & diagnostics console',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans bg-[var(--background)] text-[var(--foreground)]`}>        
        <TopBar />
        <div className="app-shell">
          <Sidebar />
          <div className="app-main">
            <div className="app-content fade-in">
              {children}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
