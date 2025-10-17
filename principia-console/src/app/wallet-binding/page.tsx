"use client";
import { useState } from 'react';
import { useConsoleStore } from '@/lib/consoleStore';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { performBindingFlow } from '@/lib/bindingService';
import { CIP45Connection } from '@/components/console/CIP45Connection';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';

interface StepState {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  message?: string;
}

const initialSteps: StepState[] = [
  { id: 'init', label: 'Initialize', status: 'pending' },
  { id: 'cip45', label: 'CIP-45 Link', status: 'pending' },
  { id: 'kel', label: 'KEL Key', status: 'pending' },
  { id: 'cardanoSign', label: 'Cardano Sign', status: 'pending' },
  { id: 'keriSign', label: 'KERI Sign', status: 'pending' },
  { id: 'submit', label: 'Submit', status: 'pending' },
  { id: 'done', label: 'Complete', status: 'pending' },
];

export default function WalletBindingPage() {
  const { identityWallet, cardanoWallet, setWalletBinding, setIdentityDetails } = useConsoleStore();
  const [cip45Connected, setCip45Connected] = useState(false);
  const [cip45WalletName, setCip45WalletName] = useState<string | null>(null);
  const [steps, setSteps] = useState<StepState[]>(initialSteps);
  const [running, setRunning] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [debug, setDebug] = useState<any[]>([]);
  const [bindingArtifacts, setBindingArtifacts] = useState<{
    cardanoPublicKey?: string;
    cardanoSignature?: string;
    keriSignature?: string;
    metrics?: any;
  } | null>(null);

  const updateStep = (id: string, patch: Partial<StepState>) => {
    setSteps(s => s.map(st => st.id === id ? { ...st, ...patch } : st));
  };

  const reset = () => {
    setSteps(initialSteps);
    setResultMsg(null);
    setDebug([]);
    // Clear wallet binding to allow re-binding
    setWalletBinding(undefined);
  };

  const run = async () => {
    if (!identityWallet.aid) {
      setResultMsg('Missing identity AID. Establish identity via CIP-45 first.');
      return;
    }
    if (!cip45Connected) {
      setResultMsg('CIP-45 connection not established yet. Scan the QR with Veridian wallet.');
      return;
    }
    if (!cardanoWallet.address || !(window as any).cardano) {
      setResultMsg('No Cardano wallet detected.');
      return;
    }
    reset();
    setRunning(true);
    updateStep('init', { status: 'active', message: 'Starting flow...' });
    updateStep('cip45', { status: cip45Connected ? 'done' : 'active', message: cip45Connected ? 'CIP-45 linked' : 'Awaiting CIP-45' });
    try {
      // Acquire wallet API (first wallet name or generic)
      let walletApi: any = null;
      try {
        const walletName = cardanoWallet.name && (window as any).cardano[cardanoWallet.name] ? cardanoWallet.name : Object.keys((window as any).cardano)[0];
        walletApi = await (window as any).cardano[walletName].enable();
      } catch (e) {
        updateStep('init', { status: 'error', message: 'Failed to enable wallet' });
        setResultMsg('Wallet enable failed');
        setRunning(false);
        return;
      }
      updateStep('init', { status: 'done', message: 'Wallet enabled' });
      updateStep('kel', { status: 'active' });
      updateStep('cardanoSign', { status: 'pending' });

      const flow = await performBindingFlow({
        aid: identityWallet.aid,
        walletApi,
        walletAddress: cardanoWallet.address,
      });

      // Map debug steps to UI step statuses
      const stepOrderMap: Record<string, string> = {
        kel: 'kel',
        canonical: 'cardanoSign',
        cardanoSign: 'cardanoSign',
        cardanoParse: 'cardanoSign',
        cardanoParseWarn: 'cardanoSign',
        keriSign: 'keriSign',
        keriSignWarn: 'keriSign',
        keriFallback: 'keriSign',
        keriParse: 'keriSign',
        keriParseWarn: 'keriSign',
        submit: 'submit',
        done: 'done'
      };

      flow.steps.forEach(st => {
        const ui = stepOrderMap[st.step];
        if (!ui) return;
        if (st.error) {
          updateStep(ui, { status: 'error', message: st.error });
        } else {
          updateStep(ui, { status: 'active', message: st.message });
        }
      });

      if (flow.success) {
        updateStep('done', { status: 'done', message: 'Binding complete' });
        setResultMsg(`Binding created: ${flow.bindingSAID}`);
        setBindingArtifacts({
          cardanoPublicKey: flow.cardanoPublicKey,
            cardanoSignature: flow.cardanoSignature,
            keriSignature: flow.keriSignature,
            metrics: flow.metrics
        });
        if (flow.bindingSAID) {
          setWalletBinding({
            cardanoAddress: cardanoWallet.address!,
            bindingSAID: flow.bindingSAID,
            verified: true,
            linkedAt: new Date().toISOString(),
            cardanoPublicKey: flow.cardanoPublicKey || undefined
          });
        }
      } else {
        updateStep('done', { status: 'error', message: flow.error });
        setResultMsg(flow.error || 'Binding failed');
      }
      setDebug(flow.steps);
    } catch (e) {
      updateStep('done', { status: 'error', message: (e as Error).message });
      setResultMsg((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const handleCip45Connected = (aid: string, walletName: string) => {
    setCip45Connected(true);
    setCip45WalletName(walletName);
    updateStep('cip45', { status: 'done', message: 'CIP-45 linked' });
    // If identity AID not already stored, populate it.
    if (!identityWallet.aid) {
      setIdentityDetails({ aid, status: 'connected', name: walletName });
    }
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="h1">Link your Cardano Wallet</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">Bind your KERI identity to a Cardano wallet via a dual-signed canonical binding (Cardano + KERI) registered with the issuer.</p>
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={reset} disabled={running}>
            {identityWallet.walletBinding ? 'Reset & Re-bind' : 'Reset'}
          </Button>
          <Button size="sm" onClick={run} disabled={running || !!identityWallet.walletBinding}>
            {running ? 'Running...' : identityWallet.walletBinding ? 'Already Bound' : 'Start Binding'}
          </Button>
        </div>
      </div>

      {/* CIP-45 QR Connection Section */}
      {!cip45Connected && (
        <Card dense className="border-dashed border-primary/40">
          <CardHeader className="flex items-center gap-2">
            <h2 className="h3">Step 1: CIP-45 Identity Connection</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-2xs text-muted-foreground">Scan this QR with your Veridian wallet to expose the CIP-45 interface for KERI signing. After it connects this step will auto-complete.</p>
            <CIP45Connection
              appName="Principia Console Binding"
              onConnected={handleCip45Connected}
              title="Scan with Veridian Wallet (CIP-45)"
              description="Open Veridian and scan to authorize a secure session for dual-signing."
              qrSize={200}
            />
          </CardBody>
        </Card>
      )}

      {cip45Connected && (
        <Card dense className="bg-emerald-50 border border-emerald-200">
          <CardBody className="flex items-center justify-between text-2xs">
            <div className="text-emerald-800 font-medium">CIP-45 Connected {cip45WalletName && <span className="ml-1">({cip45WalletName})</span>}</div>
            <StatusBadge variant="success">linked</StatusBadge>
          </CardBody>
        </Card>
      )}

      {/* Status Summary */}
      <Card dense>
        <CardBody className="grid md:grid-cols-6 gap-3 text-2xs">
            {steps.map(s => (
              <div key={s.id} className="space-y-1">
                <div className="flex items-center gap-2">
                <span className="font-medium tracking-wide">{s.label}</span>
                  <StatusBadge variant={s.status === 'done' ? 'success' : s.status === 'error' ? 'error' : s.status === 'active' ? 'warning' : 'neutral'}>
                    {s.status}
                  </StatusBadge>
                </div>
              {s.message && <p className="text-[9px] text-slate-500 line-clamp-3" title={s.message}>{s.message}</p>}
              </div>
            ))}
        </CardBody>
      </Card>

      {/* Result */}
      {resultMsg && (
        <Card dense className={identityWallet.walletBinding ? 'border-green-300' : ''}>
          <CardBody className="text-2xs">
            {identityWallet.walletBinding ? (
              <p className="text-green-700 font-medium">{resultMsg}</p>
            ) : (
              <p className="text-slate-700">{resultMsg}</p>
            )}
          </CardBody>
        </Card>
      )}

      {/* Debug Steps */}
      {debug.length > 0 && (
        <Card dense>
          <CardHeader className="flex items-center gap-2"><h2 className="h4">Binding Details</h2></CardHeader>
          <CardBody className="text-[10px] font-mono space-y-2 max-h-80 overflow-y-auto">
            {bindingArtifacts && (
              <div className="border rounded p-2 bg-slate-50 space-y-1">
                <div className="text-[10px] tracking-wide font-semibold text-slate-600 uppercase">Artifacts</div>
                {bindingArtifacts.cardanoPublicKey && (
                  <div>
                    <span className="font-semibold">Cardano Public Key:</span> {bindingArtifacts.cardanoPublicKey}
                  </div>
                )}
                {bindingArtifacts.cardanoSignature && (
                  <div>
                    <span className="font-semibold">Cardano Signature:</span> {bindingArtifacts.cardanoSignature.slice(0, 32)}... ({bindingArtifacts.metrics?.cardanoSignatureBytes ?? '??'} bytes)
                  </div>
                )}
                {bindingArtifacts.keriSignature && (
                  <div>
                    <span className="font-semibold">KERI Signature:</span> {bindingArtifacts.keriSignature.slice(0, 32)}... ({bindingArtifacts.metrics?.keriSignatureBytes ?? '??'} bytes)
                  </div>
                )}
                {bindingArtifacts.metrics && (
                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                    <div>Cardano pk: {bindingArtifacts.metrics.cardanoPublicKeyBytes || '—'} bytes</div>
                    <div>KEL key: {bindingArtifacts.metrics.kelSigningKeyBytes || '—'} bytes</div>
                  </div>
                )}
              </div>
            )}
            {debug.map((d, i) => (
              <div key={i} className="border-b pb-1 last:border-b-0">
                <div className="flex justify-between"><span className="font-semibold">{d.step}</span>{d.error && <span className="text-red-600">ERR</span>}</div>
                <div>{d.message}</div>
                {d.meta && <pre className="whitespace-pre-wrap text-slate-500">{JSON.stringify(d.meta, null, 2)}</pre>}
                {d.error && <div className="text-red-600">{d.error}</div>}
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
