"use client";
import { useState, useEffect } from 'react';
import { useConsoleStore } from '@/lib/consoleStore';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/banner';
import { Spinner } from '@/components/ui/spinner';
import { Trash2, Users, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/card';

const ISSUER_API = process.env.NEXT_PUBLIC_ISSUER_API || 'http://localhost:3001';

export function ContactsPanel() {
  const { contacts, addContact, removeContact } = useConsoleStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchContacts = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${ISSUER_API}/contacts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch contacts: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Clear existing contacts and add fetched ones
      // Assuming API returns: { contacts: [{ aid, alias, credentials? }] }
      if (data.contacts && Array.isArray(data.contacts)) {
        data.contacts.forEach((contact: any) => {
          addContact({
            aid: contact.aid,
            alias: contact.alias || contact.aid,
            credentials: contact.credentials || [],
          });
        });
      }
    } catch (e) {
      setError('Failed to fetch contacts: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="h2 leading-tight mb-0">Contacts</h2>
          <p className="text-[11px] text-muted-foreground max-w-xl">View and manage resolved contacts from the issuer server (OOBI introductions).</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchContacts}
          disabled={loading}
          className="flex items-center gap-1 h-8 text-[11px]"
        >
          {loading ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {error && (
        <Banner variant="destructive" dismissible onDismiss={() => setError('')}>
          {error}
        </Banner>
      )}

      {loading && contacts.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      )}

      {/* Contacts List */}
      <Card dense className="space-y-2">
        <CardHeader className="flex items-center gap-2 py-2"><Users aria-hidden="true" className="h-4 w-4 text-primary" /><h3 className="h4">Your Contacts <span className="text-xs font-normal text-muted-foreground">({contacts.length})</span></h3></CardHeader>
        <CardBody className="space-y-0">
          {contacts.length === 0 ? (
            <div className="text-[11px] text-muted-foreground text-center py-6">No contacts yet. Resolve an OOBI to add one.</div>
          ) : (
            <ul className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-md overflow-hidden bg-white">
              {contacts.map(c => (
                <li key={c.aid} className="flex items-start gap-3 px-3 py-2 group hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold tracking-wide text-slate-700 group-hover:text-slate-900">{c.alias}</span>
                      <button
                        onClick={() => removeContact(c.aid)}
                        className="text-destructive/70 hover:text-destructive transition-colors p-1"
                        title="Remove contact"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground break-all">{c.aid.substring(0, 28)}...{c.aid.slice(-10)}</div>
                    <div className="text-[10px] text-slate-500">Credentials: <span className="font-medium text-slate-700">{c.credentials?.length || 0}</span></div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card dense muted>
        <CardBody className="text-[11px] text-muted-foreground space-y-1">
          <div><strong>Phase B Note:</strong> OOBI resolution is mocked. Real API integration (POST /resolveOobi) and credential fetch (GET /contactCredentials) will be added when backend is available.</div>
        </CardBody>
      </Card>
    </div>
  );
}

export default ContactsPanel;
