"use client";
import { useState } from 'react';
import { useConsoleStore } from '@/lib/consoleStore';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/banner';
import { Spinner } from '@/components/ui/spinner';
import { OOBIQRDisplay } from '@/components/console/OOBIQRDisplay';
import { Network, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const ISSUER_API = process.env.NEXT_PUBLIC_ISSUER_API || 'http://localhost:3001';

export default function OOBIPage() {
  const { identityWallet, addContact } = useConsoleStore();
  const [userOobi, setUserOobi] = useState('');
  const [alias, setAlias] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleResolve = async () => {
    if (!userOobi.trim() || !alias.trim()) {
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
        body: JSON.stringify({ oobi: userOobi.trim(), alias: alias.trim() }),
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

      setUserOobi('');
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/console/connections" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="h3 mb-1">OOBI Resolution</h2>
          <p className="text-sm text-muted-foreground">
            Resolve Out-Of-Band Introductions to establish KERI connections
          </p>
        </div>
      </div>

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

      {!identityWallet || identityWallet.status !== 'connected' ? (
        <Banner variant="warning">
          <strong>Identity Wallet Not Connected:</strong> Please connect your identity wallet first to share your OOBI. Visit the <Link href="/console/connections/identity" className="underline">Identity Wallet page</Link>.
        </Banner>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Resolve User's OOBI */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" />
            <h3 className="h4">Enter User OOBI</h3>
          </div>
          <div className="card-body space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste the OOBI URL shared from the user's wallet to add them as a contact.
            </p>

            <div>
              <label htmlFor="useroobi" className="block text-sm font-medium mb-1">User OOBI URL</label>
              <input
                id="useroobi"
                type="text"
                placeholder="http://..."
                value={userOobi}
                onChange={e => setUserOobi(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-[var(--border)] rounded"
              />
            </div>
            
            <div>
              <label htmlFor="alias" className="block text-sm font-medium mb-1">Alias</label>
              <input
                id="alias"
                type="text"
                placeholder="e.g., User-123"
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
              {loading ? 'Resolving...' : 'Resolve OOBI'}
            </Button>
          </div>
        </div>

        {/* Show Server OOBI QR - Using Reusable Component */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" />
            <h3 className="h4">Share Your OOBI</h3>
          </div>
          <div className="card-body">
            <OOBIQRDisplay 
              showToggleButton={true}
              title="Share Your OOBI"
              description="Generate a QR code with your issuer's OOBI for others to scan and connect."
              qrSize={220}
            />
          </div>
        </div>
      </div>

      <div className="card card-muted">
        <div className="card-body text-sm text-muted-foreground">
          <strong>About OOBI (Out-Of-Band Introduction):</strong>
          <p className="mt-2">
            An OOBI is a URL that points to a KERI witness or watcher that can provide 
            information about a KERI identifier (AID). Resolving an OOBI allows you to 
            establish a verifiable connection with another KERI identity.
          </p>
        </div>
      </div>
    </div>
  );
}
