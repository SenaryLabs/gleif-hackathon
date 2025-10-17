"use client";
import { useState } from 'react';
import { useConsoleStore } from '@/lib/consoleStore';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/banner';
import { StatusBadge } from '@/components/ui/status-badge';
import { Spinner } from '@/components/ui/spinner';
import { ShieldCheck, FileText } from 'lucide-react';

export function VerificationPanel() {
  const { bindingInput, bindingParsed, credentialChain, setBindingInput, parseBinding, setCredentialChain } = useConsoleStore();
  const [isChecking, setIsChecking] = useState(false);
  const sample = `Binding complete\n{\n  "success": true,\n  "bindingSAID": "EIpC_Qe93ofKWBf_1hv0JENm1GyTGtfen_dNFKsOG8PT",\n  "bindingType": "cardano_address_binding",\n  "issuerIxnSAID": "E335bd9301cc472303daface28963a8a8ac443ae6f36",\n  "holderAID": "EIk0F5px0GHvyw-bFvW7FAbGHz82fDx5VSGg77K-lEgB",\n  "cardanoAddress": "addr_test1qrcsss93xau2p8dq8gkuu5mtpk7cl74glpaxat74gr6l8r0lxt23ydw4myntryvlrzunyunqy5k2rxglzwsywrtdj6wscz2xf5",\n  "binding": {\n    "v": "KERI10JSON00057d_",\n    "t": "cardano_address_binding",\n    "issuer": "EHtHel57-67z7KMGXKanDuoI-IsD_kcCv6iYmiLS6VPG",\n    "holder": "EIk0F5px0GHvyw-bFvW7FAbGHz82fDx5VSGg77K-lEgB",\n    "cardanoAddress": "addr_test1qrcsss93xau2p8dq8gkuu5mtpk7cl74glpaxat74gr6l8r0lxt23ydw4myntryvlrzunyunqy5k2rxglzwsywrtdj6wscz2xf5",\n    "cardanoPublicKey": "eda779b2c99f5915fe4841ca35017a41be5fd79046ebb87e02a0988f6f5550b2",\n    "canonicalMessage": "BIND|v1|EIk0F5px0GHvyw-bFvW7FAbGHz82fDx5VSGg77K-lEgB|addr_test1qrcsss93xau2p8dq8gkuu5mtpk7cl74glpaxat74gr6l8r0lxt23ydw4myntryvlrzunyunqy5k2rxglzwsywrtdj6wscz2xf5",\n    "signature": {\n      "cardano": "845846a201276761646472657373583900f10840b13778a09da03a2dce536b0dbd8ffaa8f87a6eafd540f5f38dff32d51235d5d926b1919f18b9327260252ca1991f13a0470d6d969da166686173686564f458a142494e447c76317c45496b30463570783047487679772d624676573746416247487a3832664478355653476737374b2d6c4567427c616464725f74657374317172637373733933786175327038647138676b7575356d74706b37636c3734676c706178617437346772366c3872306c78743233796477346d796e747279766c727a756e79756e7179356b327278676c7a777379777274646a367773637a327866355840331983fb9a18b749c7b1d896205075e8865fafeb4d45810c9ddc5196aab63502b2b0ebca043e545ac678cd4c4c03f733a742db6196ae1f60ba911b76ff2c0b09",\n      "veridian": "0BDjMaC3zPZV8OfS1KNiQKUYbA_Ms3ICW42f-mvNMTcJAbUapEI_4mWNQ3YvMLZxPB39c1hZqJLlQkBIRVTi7LMO"\n    },\n    "createdAt": "2025-10-15T11:33:36.199Z",\n    "d": "EIpC_Qe93ofKWBf_1hv0JENm1GyTGtfen_dNFKsOG8PT"\n  },\n  "message": "Cardano address binding created and anchored in KEL",\n  "nextStep": "Binding is now anchored and can be verified",\n  "keriDelivery": "anchored"\n}`;

  const handleParse = () => {
    parseBinding();
  };

  const handleMockCredentialCheck = () => {
    setIsChecking(true);
    // Mock credential chain check (replace with real API later)
    setTimeout(() => {
      setCredentialChain({
        qvi: { present: true, said: 'EQVI123...' },
        le: { present: true, said: 'ELE456...' },
        role: { present: false },
        valid: false,
        errors: ['Role credential missing'],
      });
      setIsChecking(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="h3 mb-2">Verification</h2>
        <p className="text-sm text-muted-foreground">Parse wallet binding payloads and verify vLEI credential chains.</p>
      </div>

      {/* Binding Parser */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="h4">Binding Payload Parser</h3>
        </div>
        <div className="card-body space-y-3">
          <div>
            <label htmlFor="binding" className="block text-sm font-medium mb-1">Paste Binding JSON</label>
            <textarea
              id="binding"
              rows={6}
              placeholder='{"holderAID": "...", "cardanoAddress": "...", ...}'
              value={bindingInput}
              onChange={e => setBindingInput(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={handleParse} disabled={!bindingInput.trim()}>
              Parse
            </Button>
            <Button variant="outline" size="sm" type="button" onClick={() => setBindingInput(sample)}>
              Load Sample
            </Button>
          </div>

          {bindingParsed && !bindingParsed.valid && bindingParsed.errors && bindingParsed.errors.length > 0 && (
            <Banner variant="destructive">
              {bindingParsed.errors.join('; ')}
            </Banner>
          )}

          {bindingParsed && (
            <div className="mt-4 p-3 border border-[var(--border)] rounded bg-[var(--background)]">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium">Parse Result</span>
                <StatusBadge variant={bindingParsed.valid ? 'success' : 'error'}>
                  {bindingParsed.valid ? 'Valid' : 'Invalid'}
                </StatusBadge>
              </div>
              
              {bindingParsed.valid ? (
                <div className="space-y-2 text-sm">
                  <div><span className="text-muted-foreground">Holder AID:</span> <code className="text-xs">{bindingParsed.holderAID}</code></div>
                  <div><span className="text-muted-foreground">Cardano Address:</span> <code className="text-xs">{bindingParsed.cardanoAddress}</code></div>
                  {bindingParsed.cardanoPublicKey && <div><span className="text-muted-foreground">Cardano PubKey:</span> <code className="text-xs">{bindingParsed.cardanoPublicKey.substring(0, 40)}...</code></div>}
                  {bindingParsed.kelSigningKey && <div><span className="text-muted-foreground">KEL Signing Key:</span> <code className="text-xs">{bindingParsed.kelSigningKey.substring(0, 40)}...</code></div>}
                  {bindingParsed.bindingSAID && <div><span className="text-muted-foreground">Binding SAID:</span> <code className="text-xs">{bindingParsed.bindingSAID}</code></div>}
                </div>
              ) : (
                <div className="text-sm text-destructive">
                  {bindingParsed.errors.map((e, i) => <div key={i}>• {e}</div>)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Credential Chain */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="h4">vLEI Credential Chain</h3>
        </div>
        <div className="card-body space-y-3">
          <p className="text-sm text-muted-foreground">Verify QVI → LE → Role credential chain for a holder.</p>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleMockCredentialCheck}
            disabled={isChecking}
            className="flex items-center gap-2"
          >
            {isChecking && <Spinner size="sm" />}
            {isChecking ? 'Checking...' : 'Mock Chain Check'}
          </Button>

          {credentialChain && !credentialChain.valid && credentialChain.errors && credentialChain.errors.length > 0 && (
            <Banner variant="warning">
              <strong>Validation Issues:</strong> {credentialChain.errors.join('; ')}
            </Banner>
          )}

          {credentialChain && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between p-2 border border-[var(--border)] rounded">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">QVI</span>
                  {credentialChain.qvi?.said && <code className="text-xs text-muted-foreground">{credentialChain.qvi.said}</code>}
                </div>
                <StatusBadge variant={credentialChain.qvi?.present ? 'success' : 'error'}>
                  {credentialChain.qvi?.present ? 'Present' : 'Missing'}
                </StatusBadge>
              </div>

              <div className="flex items-center justify-between p-2 border border-[var(--border)] rounded">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">LE</span>
                  {credentialChain.le?.said && <code className="text-xs text-muted-foreground">{credentialChain.le.said}</code>}
                </div>
                <StatusBadge variant={credentialChain.le?.present ? 'success' : 'error'}>
                  {credentialChain.le?.present ? 'Present' : 'Missing'}
                </StatusBadge>
              </div>

              <div className="flex items-center justify-between p-2 border border-[var(--border)] rounded">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Role</span>
                  {credentialChain.role?.said && <code className="text-xs text-muted-foreground">{credentialChain.role.said}</code>}
                </div>
                <StatusBadge variant={credentialChain.role?.present ? 'success' : 'error'}>
                  {credentialChain.role?.present ? 'Present' : 'Missing'}
                </StatusBadge>
              </div>

              {credentialChain.errors.length > 0 && (
                <div className="text-sm text-destructive mt-2">
                  {credentialChain.errors.map((e, i) => <div key={i}>• {e}</div>)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card card-muted">
        <div className="card-body text-sm text-muted-foreground">
          <strong>Phase B Note:</strong> Binding parser uses basic JSON validation. Full BindingParser service integration and real credential chain fetch (GET /contactCredentials) will be added with backend availability.
        </div>
      </div>
    </div>
  );
}

export default VerificationPanel;
