"use client";
import { useEffect, useState } from 'react';
import { useConsoleStore } from '@/lib/consoleStore';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/banner';
import { Spinner } from '@/components/ui/spinner';
import { Wallet, Link2 } from 'lucide-react';

export function ConnectionsPanel() {
  const { identityWallet, cardanoWallet, setIdentityWalletStatus, detectCardanoWallet } = useConsoleStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    detectCardanoWallet();
  }, [detectCardanoWallet]);

  const handleConnectIdentity = () => {
    setError(null);
    setIdentityWalletStatus('pending');
    // Mock CIP-45 connection flow with potential failure
    setTimeout(() => {
      const shouldFail = Math.random() < 0.2; // 20% chance of failure for demo
      if (shouldFail) {
        setIdentityWalletStatus('error', 'Connection refused by user');
        setError('Connection refused. Please try again.');
      } else {
        setIdentityWalletStatus('connected');
      }
    }, 1500);
  };

  const handleDisconnectIdentity = () => {
    setError(null);
    setIdentityWalletStatus('disconnected');
  };

  const getIdentityBadgeVariant = () => {
    switch (identityWallet.status) {
      case 'connected': return 'success';
      case 'pending': return 'pending';
      case 'error': return 'error';
      default: return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="h3 mb-2">Connections</h2>
        <p className="text-sm text-muted-foreground">Manage identity wallet (CIP-45) and Cardano wallet (CIP-30) connections.</p>
      </div>

      {error && (
        <Banner variant="destructive" dismissible onDismiss={() => setError(null)}>
          {error}
        </Banner>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Identity Wallet */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            <h3 className="h4">Identity Wallet (Veridian)</h3>
          </div>
          <div className="card-body space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <StatusBadge variant={getIdentityBadgeVariant()}>
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
            <div className="pt-2 flex gap-2">
              {identityWallet.status === 'connected' ? (
                <Button variant="outline" size="sm" onClick={handleDisconnectIdentity}>
                  Disconnect
                </Button>
              ) : (
                <>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={handleConnectIdentity} 
                    disabled={identityWallet.status === 'pending'}
                    className="flex items-center gap-2"
                  >
                    {identityWallet.status === 'pending' && <Spinner size="sm" />}
                    {identityWallet.status === 'pending' ? 'Connecting...' : 'Connect'}
                  </Button>
                  {identityWallet.status === 'error' && (
                    <Button variant="outline" size="sm" onClick={handleConnectIdentity}>
                      Retry
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Cardano Wallet */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <h3 className="h4">Cardano Wallet (CIP-30)</h3>
          </div>
          <div className="card-body space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Injection Status</span>
              <StatusBadge variant={cardanoWallet.injected ? 'success' : 'neutral'}>
                {cardanoWallet.injected ? 'Detected' : 'Not Found'}
              </StatusBadge>
            </div>
            {cardanoWallet.name && (
              <div className="text-sm">
                <span className="text-muted-foreground">Wallet: </span>
                <span className="font-medium">{cardanoWallet.name}</span>
              </div>
            )}
            {!cardanoWallet.injected && (
              <div className="text-xs text-muted-foreground">
                Install a Cardano wallet extension (Nami, Eternl, etc.) to enable signing.
              </div>
            )}
            <div className="pt-2">
              <Button variant="ghost" size="sm" onClick={detectCardanoWallet}>
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* OOBI Resolution */}
      <OOBIResolveCard />

      <div className="card card-muted">
        <div className="card-body text-sm text-muted-foreground">
          <strong>Note:</strong> CIP-45 connection flow is mocked in Phase B. Full wallet binding (dual-sign) arrives in Phase D.
        </div>
      </div>
    </div>
  );
}

function OOBIResolveCard() {
  const { addContact } = useConsoleStore();
  const [oobi, setOobi] = useState('');
  const [alias, setAlias] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const ISSUER_API = process.env.NEXT_PUBLIC_ISSUER_API || 'http://localhost:3001';

  const handleResolve = async () => {
    if (!oobi.trim() || !alias.trim()) {
      setError('Both OOBI URL and alias are required.');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch(`${ISSUER_API}/resolveOobi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oobi: oobi.trim(), alias: alias.trim() }),
      });

      if (!response.ok) {
        throw new Error(`OOBI resolution failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Add resolved contact
      addContact({
        aid: data.aid || 'EAB' + Math.random().toString(36).substring(2, 15),
        alias: alias.trim(),
        credentials: data.credentials || [],
      });

      setOobi('');
      setAlias('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError('Failed to resolve OOBI: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" />
        <h3 className="h4">Resolve OOBI</h3>
      </div>
      <div className="card-body space-y-3">
        <p className="text-sm text-muted-foreground">
          Resolve an Out-Of-Band Introduction to add a contact.
        </p>

        {error && (
          <Banner variant="destructive" dismissible onDismiss={() => setError('')}>
            {error}
          </Banner>
        )}

        {success && (
          <Banner variant="success" dismissible onDismiss={() => setSuccess(false)}>
            Contact added successfully! View in the Contacts page.
          </Banner>
        )}

        <div>
          <label htmlFor="oobi" className="block text-sm font-medium mb-1">OOBI URL</label>
          <input
            id="oobi"
            type="text"
            placeholder="http://..."
            value={oobi}
            onChange={e => setOobi(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-[var(--border)] rounded"
          />
        </div>
        
        <div>
          <label htmlFor="alias" className="block text-sm font-medium mb-1">Alias</label>
          <input
            id="alias"
            type="text"
            placeholder="e.g., Issuer-ABC"
            value={alias}
            onChange={e => setAlias(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-[var(--border)] rounded"
          />
        </div>
        
        <Button 
          variant="primary" 
          size="sm" 
          onClick={handleResolve} 
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading && <Spinner size="sm" />}
          {loading ? 'Resolving...' : 'Resolve'}
        </Button>
      </div>
    </div>
  );
}

export default ConnectionsPanel;
