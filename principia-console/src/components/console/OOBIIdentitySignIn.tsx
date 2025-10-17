"use client";
import { useState } from 'react';
import { useConsoleStore } from '@/lib/consoleStore';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/banner';
import { Spinner } from '@/components/ui/spinner';
import { OOBIQRDisplay } from './OOBIQRDisplay';
import { Shield, QrCode, KeyRound, ArrowRight } from 'lucide-react';

const ISSUER_API = process.env.NEXT_PUBLIC_ISSUER_API || 'http://localhost:3001';

/**
 * Extract AID from OOBI URL
 * OOBI format: https://host/oobi/{AID}/agent/{agent_id}?name=...
 * Returns just the AID portion
 */
function extractAIDFromOOBI(oobi: string): string {
  try {
    const url = new URL(oobi);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Find 'oobi' in path and get the next part which is the AID
    const oobiIndex = pathParts.indexOf('oobi');
    if (oobiIndex !== -1 && pathParts[oobiIndex + 1]) {
      return pathParts[oobiIndex + 1];
    }
  } catch (e) {
    console.warn('Failed to parse OOBI URL:', e);
  }
  return oobi; // fallback to original if parsing fails
}

/**
 * Extract name from OOBI URL query parameter
 * OOBI format: https://host/oobi/{AID}/agent/{agent_id}?name=...
 * Returns the name value if present
 */
function extractNameFromOOBI(oobi: string): string | undefined {
  try {
    const url = new URL(oobi);
    return url.searchParams.get('name') || undefined;
  } catch (e) {
    console.warn('Failed to parse OOBI URL for name:', e);
  }
  return undefined;
}

interface OOBIIdentitySignInProps {
  /** Callback when identity is successfully resolved and signed in */
  onSignIn: (identityData: {
    aid: string;
    alias: string;
    organizationName?: string;
    vlei?: {
      acquired: boolean;
      role?: string;
      lei?: string;
    };
  }) => void;
  /** Optional: Show QR code for server OOBI */
  showServerOOBI?: boolean;
}

/**
 * OOBI-based Identity Sign-In Component
 * User provides their wallet's OOBI URL to "sign in" to the console
 * The system resolves the OOBI and fetches identity details from the issuer
 */
export function OOBIIdentitySignIn({
  onSignIn,
  showServerOOBI = true,
}: OOBIIdentitySignInProps) {
  const { addContact } = useConsoleStore();
  const [userOobi, setUserOobi] = useState('');
  const [alias, setAlias] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showQRSection, setShowQRSection] = useState(true); // Show QR by default for first-time users
  const [inputMode, setInputMode] = useState<'qr' | 'manual'>('qr'); // Default to QR mode

  const handleSignIn = async () => {
    if (!userOobi.trim()) {
      setError('Please enter your wallet OOBI URL to sign in.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Step 1: Resolve the OOBI with the issuer
      console.log('🔐 Resolving identity OOBI...');
      const resolveResponse = await fetch(`${ISSUER_API}/resolveOobi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          oobi: userOobi.trim(), 
          alias: alias.trim() || 'User'
        }),
      });

      if (!resolveResponse.ok) {
        throw new Error(`Failed to resolve OOBI: ${resolveResponse.statusText}`);
      }

      const resolveData = await resolveResponse.json();
      console.log('✅ OOBI resolved:', resolveData);

      // Step 2: Extract AID and name from response or OOBI URL
      const extractedAID = resolveData.aid || resolveData.i || extractAIDFromOOBI(userOobi.trim());
      const extractedName = extractNameFromOOBI(userOobi.trim());
      console.log('📋 Extracted AID:', extractedAID);
      console.log('📋 Extracted name from OOBI:', extractedName);

      // Step 3: Fetch identity details from issuer (if endpoint exists)
      let identityDetails = {
        aid: extractedAID,
        oobi: userOobi.trim(),
        alias: alias.trim() || extractedName || 'User',
        name: extractedName,
        organizationName: undefined as string | undefined,
        vlei: undefined as { acquired: boolean; role?: string; lei?: string } | undefined,
      };

      // Step 4: Try to fetch additional identity details (optional)
      try {
        const detailsResponse = await fetch(`${ISSUER_API}/identity/${identityDetails.aid}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (detailsResponse.ok) {
          const details = await detailsResponse.json();
          console.log('📋 Identity details fetched:', details);
          
          identityDetails = {
            ...identityDetails,
            organizationName: details.organization?.name,
            vlei: details.vlei ? {
              acquired: true,
              role: details.vlei.role,
              lei: details.vlei.lei,
            } : undefined,
          };
        }
      } catch (detailsError) {
        console.warn('⚠️ Could not fetch identity details (optional):', detailsError);
        // Continue without details - not critical
      }

      // Step 5: Add contact to persisted store
      addContact({
        aid: identityDetails.aid,
        alias: identityDetails.alias,
        credentials: [],
      });
      console.log('💾 Contact added to store:', identityDetails.aid);

      // Step 6: Call onSignIn with identity data
      onSignIn(identityDetails);

    } catch (e) {
      console.error('❌ Sign-in failed:', e);
      setError('Failed to sign in: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="space-y-5">
      {/* Main Sign-In Card */}
      <div className="card card-dense">
        <div className="card-header space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold tracking-tight">Sign In</h2>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Scan the QR with your Veridian wallet or paste an OOBI URL.
          </p>
        </div>
        <div className="card-body space-y-3">
          {error && (
            <Banner variant="destructive" dismissible onDismiss={() => setError('')}>
              {error}
            </Banner>
          )}

          {/* Mode Toggle Buttons */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-md">
            <button
              onClick={() => setInputMode('qr')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium transition-colors ${
                inputMode === 'qr'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="h-3.5 w-3.5" />
              Scan QR Code
            </button>
            <button
              onClick={() => setInputMode('manual')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium transition-colors ${
                inputMode === 'manual'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Paste OOBI URL
            </button>
          </div>

          {/* QR Code Mode */}
          {inputMode === 'qr' && showServerOOBI && (
            <div className="space-y-3">
              {showQRSection && (
                <div className="bg-white border border-slate-200 rounded-md p-4">
                  <OOBIQRDisplay 
                    showToggleButton={false}
                    title=""
                    description=""
                    qrSize={250}
                  />
                </div>
              )}

              <p className="text-[10px] text-center text-muted-foreground">
                No app yet? <span className="text-primary underline cursor-pointer">Get Veridian Wallet</span>
              </p>
            </div>
          )}

          {/* Manual Input Mode */}
          {inputMode === 'manual' && (
            <div className="space-y-3">
              <div>
                <label htmlFor="userOobi" className="block text-[11px] font-medium mb-1">
                  <KeyRound className="h-3.5 w-3.5 inline mr-1" />
                  Your Wallet OOBI URL
                </label>
                <input
                  id="userOobi"
                  type="text"
                  placeholder="http://... or paste from your Veridian wallet"
                  value={userOobi}
                  onChange={e => setUserOobi(e.target.value)}
                  disabled={loading}
                  className="w-full px-2.5 py-1.5 border border-[var(--border)] rounded text-[11px] focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Find this in your Veridian wallet settings or share menu
                </p>
              </div>

              <div>
                <label htmlFor="alias" className="block text-[11px] font-medium mb-1">
                  Display Name (Optional)
                </label>
                <input
                  id="alias"
                  type="text"
                  placeholder="e.g., John Doe"
                  value={alias}
                  onChange={e => setAlias(e.target.value)}
                  disabled={loading}
                  className="w-full px-2.5 py-1.5 border border-[var(--border)] rounded text-[11px] focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <Button 
                variant="primary" 
                size="sm"
                onClick={handleSignIn} 
                disabled={loading || !userOobi.trim()}
                className="w-full flex items-center justify-center gap-2 text-[11px] h-8"
              >
                {loading && <Spinner size="sm" />}
                {loading ? 'Signing In...' : (
                  <>
                    Sign In
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Contextual Help - Only show in manual mode */}
      {inputMode === 'manual' && (
        <div className="card card-muted card-dense">
          <div className="card-body text-[11px] text-muted-foreground">
            <p className="text-[10px] leading-tight">
              <strong>💡 Where to find your OOBI URL:</strong> Open your Veridian wallet → Settings → 
              Share OOBI. Copy the URL (starts with http://) and paste it above.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
