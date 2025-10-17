"use client";
import { useEffect, useState, useRef } from 'react';
import { useCardano } from '@cardano-foundation/cardano-connect-with-wallet';
import { NetworkType } from '@cardano-foundation/cardano-connect-with-wallet-core';
import { useConsoleStore } from '@/lib/consoleStore';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/banner';
import { Spinner } from '@/components/ui/spinner';
import { Link2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import QRCode to avoid SSR issues
const QRCode = dynamic(() => import('react-qrcode-logo').then(mod => mod.QRCode), { ssr: false });

export default function IdentityWalletPage() {
  const { identityWallet, setIdentityWalletStatus, setIdentityDetails } = useConsoleStore();
  const [error, setError] = useState<string | null>(null);
  const [keriAID, setKeriAID] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  const {
    dAppConnect,
    meerkatAddress,
    initDappConnect,
    disconnect,
  } = useCardano({
    limitNetwork: NetworkType.TESTNET,
  });

  // Initialize CIP-45 connection
  useEffect(() => {
    if (!hasInitialized.current && dAppConnect.current === null && typeof window !== 'undefined') {
      hasInitialized.current = true;
      console.log('🔧 Initializing CIP-45 connection...');
      
      const verifyConnection = (
        walletInfo: { name: string; address: string; oobi: string },
        callback: (granted: boolean, autoconnect: boolean) => void,
      ) => {
        console.log('🔐 Wallet requesting connection:', walletInfo);
        // Auto-accept the connection
        callback(true, true);
      };

      const onApiInject = async (name: string) => {
        console.log('🔌 Wallet API injected:', name);
        const api = window.cardano && (window.cardano as any)[name];
        if (api) {
          try {
            const enabledApi = await api.enable();
            const keriIdentifier = await (enabledApi as any).experimental.getKeriIdentifier();
            
            setKeriAID(keriIdentifier.id);
            setIdentityDetails({
              status: 'connected',
              aid: keriIdentifier.id,
              name: name,
            });
            setError(null);
            
            console.log('✅ Identity wallet connected:', {
              name,
              aid: keriIdentifier.id,
              oobi: keriIdentifier.oobi,
            });
          } catch (err) {
            console.error('❌ Failed to enable wallet API:', err);
            setError(`Failed to enable wallet: ${err}`);
            setIdentityWalletStatus('error', 'Failed to enable wallet API');
          }
        }
      };

      const onApiEject = (name: string): void => {
        console.log('🔌 Wallet API ejected:', name);
        setKeriAID(null);
        setIdentityDetails({
          status: 'disconnected',
          aid: undefined,
          name: undefined,
        });
      };

      const onP2PConnect = (connectionData: unknown): void => {
        console.log('🌐 P2P connection established:', connectionData);
        setIdentityWalletStatus('pending');
      };

      initDappConnect(
        'Principia Console - Identity Wallet',
        window.location.href,
        verifyConnection,
        onApiInject,
        onApiEject,
        [
          "wss://tracker.webtorrent.dev:443/announce",
          "wss://dev.btt.cf-identity-wallet.metadata.dev.cf-deployments.org"
        ],
        onP2PConnect,
      );
    }
  }, [dAppConnect, initDappConnect]);

  const handleDisconnect = () => {
    setError(null);
    setKeriAID(null);
    disconnect();
    setIdentityWalletStatus('disconnected');
  };

  const getStatusVariant = () => {
    switch (identityWallet.status) {
      case 'connected': return 'success';
      case 'pending': return 'pending';
      case 'error': return 'error';
      default: return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/console/connections" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="h3 mb-1">Identity Wallet (Veridian)</h2>
          <p className="text-sm text-muted-foreground">
            Connect your KERI identity wallet via CIP-45 WebRTC connection
          </p>
        </div>
      </div>

      {error && (
        <Banner variant="destructive" dismissible onDismiss={() => setError(null)}>
          {error}
        </Banner>
      )}

      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          <h3 className="h4">Connection Status</h3>
        </div>
        <div className="card-body space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <StatusBadge variant={getStatusVariant()}>
              {identityWallet.status.charAt(0).toUpperCase() + identityWallet.status.slice(1)}
            </StatusBadge>
          </div>

          {identityWallet.error && (
            <div className="text-xs text-destructive">{identityWallet.error}</div>
          )}

          {identityWallet.lastAttempt && (
            <div className="text-xs text-muted-foreground">
              Last attempt: {new Date(identityWallet.lastAttempt).toLocaleString()}
            </div>
          )}

          {keriAID && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-green-900 mb-2">✅ Identity Connected</h4>
              <div className="text-xs space-y-1">
                <p><strong>KERI AID:</strong></p>
                <p className="font-mono text-green-700 break-all">{keriAID}</p>
              </div>
            </div>
          )}

          {!keriAID && meerkatAddress && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-amber-900 mb-2">📱 Scan QR Code with Veridian Wallet</h4>
                <p className="text-xs text-amber-700">
                  Open your Veridian wallet app and scan this QR code to establish a secure CIP-45 WebRTC connection.
                </p>
              </div>

              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <QRCode
                    value={meerkatAddress}
                    size={250}
                    fgColor="black"
                    bgColor="white"
                    qrStyle="squares"
                    logoImage="/logo.png"
                    logoWidth={50}
                    logoHeight={50}
                    logoOpacity={1}
                    quietZone={10}
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs space-y-1">
                <p><strong>Connection Address:</strong></p>
                <p className="font-mono text-slate-600 break-all">{meerkatAddress}</p>
              </div>
            </div>
          )}

          <div className="pt-2 flex gap-2">
            {identityWallet.status === 'connected' && keriAID ? (
              <Button variant="outline" size="sm" onClick={handleDisconnect}>
                Disconnect
              </Button>
            ) : (
              <div className="text-sm text-muted-foreground">
                {identityWallet.status === 'pending' && <Spinner size="sm" className="inline mr-2" />}
                {meerkatAddress ? 'Waiting for wallet to scan QR code...' : 'Initializing connection...'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card card-muted">
        <div className="card-body text-sm text-muted-foreground">
          <strong>CIP-45 Connection Flow:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>QR code is automatically generated when page loads</li>
            <li>Open your Veridian wallet and scan the QR code</li>
            <li>Accept the connection request in your wallet</li>
            <li>Your KERI identity (AID) will be established automatically</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
