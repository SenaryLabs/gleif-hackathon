"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/banner';
import { Spinner } from '@/components/ui/spinner';
import { Network, X } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import QRCode to avoid SSR issues
const QRCode = dynamic(() => import('react-qrcode-logo').then(mod => mod.QRCode), { ssr: false });

const ISSUER_API = process.env.NEXT_PUBLIC_ISSUER_API || 'http://localhost:3001';

interface OOBIQRDisplayProps {
  /** Optional: Pre-fetched OOBI URL to display immediately */
  oobi?: string;
  /** Optional: Show button to toggle QR visibility */
  showToggleButton?: boolean;
  /** Optional: Custom title */
  title?: string;
  /** Optional: Custom description */
  description?: string;
  /** Optional: QR code size */
  qrSize?: number;
}

/**
 * Reusable component for displaying OOBI QR codes
 * Fetches server OOBI from /keriOobi endpoint if not provided
 */
export function OOBIQRDisplay({
  oobi: initialOOBI,
  showToggleButton = true,
  title = "Share Your OOBI",
  description = "Generate a QR code with your issuer's OOBI for others to scan and connect.",
  qrSize = 220,
}: OOBIQRDisplayProps) {
  const [serverOOBI, setServerOOBI] = useState<string>(initialOOBI || '');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState<boolean>(!!initialOOBI);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFetchOOBI = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${ISSUER_API}/keriOobi`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch OOBI: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data.data || data.data === 'undefined') {
        throw new Error('Invalid OOBI received from server');
      }
      setServerOOBI(data.data);
      setShowQR(true);
    } catch (e) {
      setError('Failed to fetch server OOBI: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(serverOOBI);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      setError('Failed to copy OOBI');
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Banner variant="destructive" dismissible onDismiss={() => setError('')}>
          {error}
        </Banner>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" />
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
      </div>

      {!showQR && showToggleButton && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleFetchOOBI}
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading && <Spinner size="sm" />}
          {loading ? 'Fetching OOBI...' : 'Show Connection QR'}
        </Button>
      )}

      {showQR && serverOOBI && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">📱 Scan to Connect</h4>
            <p className="text-xs text-blue-700">
              Others can scan this QR code to connect with your issuer identity.
            </p>
          </div>

          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-lg shadow-sm border relative">
              <QRCode
                value={serverOOBI}
                size={qrSize}
                fgColor="black"
                bgColor="white"
                qrStyle="squares"
                quietZone={10}
              />
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-slate-700">Server OOBI URL</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className={`h-7 px-2 text-[11px] ${copied ? 'bg-green-50 border-green-200 text-green-700' : ''}`}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="font-mono text-[10px] text-slate-600 break-all" title={serverOOBI}>{serverOOBI}</p>
          </div>

          {showToggleButton && (
            <div className="flex justify-between items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowQR(false)}
              >
                <X className="h-3 w-3 mr-1" />
                Hide QR Code
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleFetchOOBI}
                disabled={loading}
              >
                {loading ? <Spinner size="sm" className="mr-1" /> : null}
                Refresh
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Auto-fetch on mount if no initial OOBI and showToggleButton is false */}
      {!initialOOBI && !showToggleButton && !serverOOBI && !loading && (
        <div className="hidden">
          {(() => { handleFetchOOBI(); return null; })()}
        </div>
      )}
    </div>
  );
}
