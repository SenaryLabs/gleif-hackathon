"use client";
import { useEffect, useState, useRef } from 'react';
import { useCardano } from '@cardano-foundation/cardano-connect-with-wallet';
import { NetworkType } from '@cardano-foundation/cardano-connect-with-wallet-core';
import { Spinner } from '@/components/ui/spinner';
import { Shield } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import QRCode to avoid SSR issues
const QRCode = dynamic(() => import('react-qrcode-logo').then(mod => mod.QRCode), { ssr: false });

interface CIP45ConnectionProps {
  /** Application name to display in wallet */
  appName: string;
  /** Callback when identity is connected with KERI AID */
  onConnected: (aid: string, walletName: string) => void;
  /** Callback when wallet is disconnected */
  onDisconnected?: () => void;
  /** Optional: Custom title */
  title?: string;
  /** Optional: Custom description */
  description?: string;
  /** Optional: QR code size */
  qrSize?: number;
  /** Optional: Show logo in QR */
  showLogo?: boolean;
}

/**
 * Reusable CIP-45 Identity Wallet Connection Component
 * Handles QR generation, WebRTC connection, and KERI AID retrieval
 */
export function CIP45Connection({
  appName,
  onConnected,
  onDisconnected,
  title = "Scan with Veridian Wallet",
  description = "Open your Veridian wallet app and scan this QR code to establish a secure CIP-45 WebRTC connection.",
  qrSize = 250,
  showLogo = true,
}: CIP45ConnectionProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  const {
    dAppConnect,
    meerkatAddress,
    initDappConnect,
  } = useCardano({
    limitNetwork: NetworkType.TESTNET,
  });

  useEffect(() => {
    if (!hasInitialized.current && dAppConnect.current === null && typeof window !== 'undefined') {
      hasInitialized.current = true;
      console.log('🔧 Initializing CIP-45 connection...');
      setIsConnecting(true);
      
      const verifyConnection = (
        walletInfo: { name: string; address: string; oobi: string },
        callback: (granted: boolean, autoconnect: boolean) => void,
      ) => {
        console.log('🔐 Wallet requesting connection:', walletInfo);
        callback(true, true);
      };

      const onApiInject = async (name: string) => {
        console.log('🔌 Wallet API injected:', name);
        const api = window.cardano && (window.cardano as any)[name];
        if (api) {
          try {
            const enabledApi = await api.enable();
            const keriIdentifier = await (enabledApi as any).experimental.getKeriIdentifier();
            
            setIsConnecting(false);
            setError(null);
            onConnected(keriIdentifier.id, name);
            
            console.log('✅ Identity wallet connected:', {
              name,
              aid: keriIdentifier.id,
              oobi: keriIdentifier.oobi,
            });
          } catch (err) {
            console.error('❌ Failed to enable wallet API:', err);
            setError(`Failed to enable wallet: ${err}`);
            setIsConnecting(false);
          }
        }
      };

      const onApiEject = (name: string): void => {
        console.log('🔌 Wallet API ejected:', name);
        setIsConnecting(false);
        if (onDisconnected) {
          onDisconnected();
        }
      };

      const onP2PConnect = (connectionData: unknown): void => {
        console.log('🌐 P2P connection established:', connectionData);
      };

      initDappConnect(
        appName,
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
  }, [dAppConnect, initDappConnect, appName, onConnected, onDisconnected]);

  if (!meerkatAddress) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Spinner size="lg" />
        <p className="text-sm text-muted-foreground">Initializing secure connection...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          {title}
        </h4>
        <p className="text-xs text-blue-700">{description}</p>
      </div>

      <div className="flex justify-center">
        <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-primary/20">
          <QRCode
            value={meerkatAddress}
            size={qrSize}
            fgColor="black"
            bgColor="white"
            qrStyle="squares"
            logoImage={showLogo ? "/logo.png" : undefined}
            logoWidth={showLogo ? 50 : undefined}
            logoHeight={showLogo ? 50 : undefined}
            logoOpacity={showLogo ? 1 : undefined}
            quietZone={10}
          />
        </div>
      </div>

      {isConnecting && (
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <Spinner size="sm" />
          <span className="text-sm">Waiting for wallet to scan QR code...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-slate-50 p-3 rounded border border-slate-200">
        <p className="text-xs font-medium text-slate-700 mb-2">Connection Address:</p>
        <p className="font-mono text-[10px] text-slate-600 break-all">{meerkatAddress}</p>
      </div>
    </div>
  );
}
