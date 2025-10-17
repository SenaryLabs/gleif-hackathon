"use client";
import { useEffect } from 'react';
import { useConsoleStore } from '@/lib/consoleStore';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CardanoWalletPage() {
  const { cardanoWallet, detectCardanoWallet } = useConsoleStore();

  useEffect(() => {
    detectCardanoWallet();
  }, [detectCardanoWallet]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/console/connections" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="h3 mb-1">Cardano Wallet (CIP-30)</h2>
          <p className="text-sm text-muted-foreground">
            Detect and manage CIP-30 compliant Cardano wallet extensions
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <h3 className="h4">Wallet Detection</h3>
        </div>
        <div className="card-body space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Injection Status</span>
            <StatusBadge variant={cardanoWallet.injected ? 'success' : 'neutral'}>
              {cardanoWallet.injected ? 'Detected' : 'Not Found'}
            </StatusBadge>
          </div>

          {cardanoWallet.injected && cardanoWallet.name && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-green-900 mb-2">✅ Wallet Connected</h4>
              <div className="text-sm space-y-2">
                <div>
                  <p className="text-xs text-green-700 mb-1"><strong>Wallet Name:</strong></p>
                  <p className="font-mono text-sm">{cardanoWallet.name}</p>
                </div>
                {cardanoWallet.address && (
                  <div>
                    <p className="text-xs text-green-700 mb-1"><strong>Bech32 Address:</strong></p>
                    <p className="font-mono text-xs text-green-900 break-all bg-white p-2 rounded border border-green-300">
                      {cardanoWallet.address}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!cardanoWallet.injected && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-amber-900 mb-2">⚠️ No Wallet Detected</h4>
              <p className="text-xs text-amber-700 mb-3">
                Install a Cardano wallet extension (Nami, Eternl, Flint, etc.) to enable signing and transactions.
              </p>
              <div className="text-xs text-amber-600 space-y-1">
                <p><strong>Recommended Wallets:</strong></p>
                <ul className="list-disc list-inside ml-2">
                  <li>Eternl (eternl.io)</li>
                  <li>Nami (namiwallet.io)</li>
                  <li>Flint (flint-wallet.com)</li>
                  <li>Typhon (typhonwallet.io)</li>
                </ul>
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button variant="ghost" size="sm" onClick={detectCardanoWallet}>
              Refresh Detection
            </Button>
          </div>
        </div>
      </div>

      <div className="card card-muted">
        <div className="card-body text-sm text-muted-foreground">
          <strong>About CIP-30:</strong>
          <p className="mt-2">
            CIP-30 is the Cardano standard for dApp-wallet communication. Wallets that support 
            CIP-30 inject a <code className="text-xs bg-slate-200 px-1 rounded">window.cardano</code> API 
            that allows web applications to request wallet connections, sign transactions, and interact 
            with the Cardano blockchain.
          </p>
        </div>
      </div>
    </div>
  );
}
