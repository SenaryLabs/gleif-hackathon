"use client";
import { useState, useEffect } from 'react';
import { useConsoleStore } from '@/lib/consoleStore';

import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { OOBIIdentitySignIn } from '@/components/console/OOBIIdentitySignIn';
import { Shield, Building2, Award, Link as LinkIcon, Wallet, CheckCircle, ArrowRight, Copy, Check, LogOut, FileText, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { identityWallet, cardanoWallet, setIdentityDetails, setOrganizationDetails, persistOrganizationDetails, loadPersistedOrganizationDetails, addIssuedLeiRecord, getIssuedLeiRecord, issuedLeiRecords, reset, detectCardanoWallet } = useConsoleStore();
  // Ensure Cardano wallet detection runs on landing page as well (not just the dedicated page)
  useEffect(() => {
    // Run after a short delay to allow late injection
    const t = setTimeout(() => detectCardanoWallet(), 150);
    return () => clearTimeout(t);
  }, [detectCardanoWallet]);
  const [copied, setCopied] = useState(false);
  const [loadingBinding, setLoadingBinding] = useState(false);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [lastCredentialsRefresh, setLastCredentialsRefresh] = useState<string | null>(null);
  const [qviDetails, setQviDetails] = useState<{
    name?: string;
    said?: string;
    lei?: string;
    issuanceDate?: string;
    status?: 'issued' | 'revoked';
  } | null>(null);

  // Identity considered present if we have an AID (status may not yet have flipped to 'connected')
  const hasIdentity = !!identityWallet.aid;
  
  // Log identity wallet changes for deeper debugging
  useEffect(() => {
    console.log('🧾 identityWallet changed (full):', JSON.parse(JSON.stringify(identityWallet)));
  }, [identityWallet]);
  
  // Component mount logging
  useEffect(() => {
    console.log('🏠 HomePage mounted with state:', {
      hasIdentity,
      aid: identityWallet.aid,
      status: identityWallet.status,
      credentialsCount: identityWallet.credentials?.length || 0
    });
  }, []);

  // Debug: Log organization details state changes
  useEffect(() => {
    console.log('🏢 Organization details state:', {
      organizationDetails: identityWallet.organizationDetails,
      hasOrgName: !!identityWallet.organizationName,
      hasCredentials: identityWallet.credentials?.length || 0,
      shouldShowOrg: !!identityWallet.organizationDetails,
      shouldShowOnboarding: !identityWallet.organizationName && !identityWallet.organizationDetails && (identityWallet.credentials?.length || 0) === 0
    });
  }, [identityWallet.organizationDetails, identityWallet.organizationName, identityWallet.credentials]);

  // Handle copying OOBI to clipboard
  const handleCopyOOBI = async () => {
    if (identityWallet.oobi) {
      await navigator.clipboard.writeText(identityWallet.oobi);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Query issued credentials and extract organization details
  const queryCredentials = async () => {
    console.log('🔍 queryCredentials called, aid:', identityWallet.aid);

    if (!identityWallet.aid) {
      console.log('❌ No AID available, aborting queryCredentials');
      return;
    }

    // Check for persisted organization details first
    const persistedDetails = loadPersistedOrganizationDetails(identityWallet.aid);
    if (persistedDetails) {
      console.log('📂 Found persisted organization details for holder:', identityWallet.aid);
      setOrganizationDetails(persistedDetails.organizationDetails);
      if (persistedDetails.qviDetails) {
        setQviDetails(persistedDetails.qviDetails);
      }
      console.log('✅ Loaded persisted organization details');
      return; // Skip credential parsing if we have persisted details
    }

    console.log('📡 Starting credentials fetch for AID:', identityWallet.aid);
    setLoadingCredentials(true);
    try {
      const url = `http://localhost:3001/contactCredentials?contactId=${identityWallet.aid}`;
      console.log('🌐 Fetching from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const raw = await response.text();
      console.log('🧪 Raw credentials response:', raw);
      let parsed: any = {};
      try {
        parsed = raw ? JSON.parse(raw) : {};
      } catch (e) {
        console.error('❌ JSON parse error for credentials response:', e);
      }
      console.log('📥 Parsed response meta:', {
        status: response.status,
        ok: response.ok,
        keys: Object.keys(parsed),
        hasCredentialsArray: Array.isArray((parsed as any).credentials),
        hasDataArray: Array.isArray((parsed as any).data),
        directArray: Array.isArray(parsed)
      });

      if (response.ok) {
        // Normalize possible response shapes
        let credentialsSource: any[] = [];
        if (Array.isArray(parsed)) credentialsSource = parsed;
        else if (Array.isArray(parsed.credentials)) credentialsSource = parsed.credentials;
        else if (Array.isArray(parsed.data)) credentialsSource = parsed.data;
        else if (parsed.data?.credentials && Array.isArray(parsed.data.credentials)) credentialsSource = parsed.data.credentials;
        else if (parsed.success && Array.isArray(parsed.data)) credentialsSource = parsed.data;

        console.log('🧮 Normalized credentials count:', credentialsSource.length);

        if (credentialsSource.length > 0) {
          // Transform API response to match our interface
          const formattedCredentials = credentialsSource.map((cred: any) => {
            // Extract status from the credential schema (sad.a.status)
            const credStatus = cred.sad?.a?.status || cred.status || 'issued';
            console.log('🔍 Credential status debug:', {
              rawStatus: cred.sad?.a?.status,
              fallbackStatus: cred.status,
              statusType: typeof credStatus,
              finalStatus: credStatus
            });
            // Sanitize status - must be string (prevent React object rendering errors)
            const sanitizedStatus = (typeof credStatus === 'string' ? credStatus : 'issued') as 'issued' | 'revoked';
            
            return {
              said: cred.sad?.d || cred.said || cred.d || 'unknown',
              schema: cred.sad?.s || cred.schema || cred.s || 'Unknown Schema',
              issuer: cred.sad?.i || cred.issuer || cred.i || 'Unknown Issuer',
              issuanceDate: cred.sad?.a?.dt || cred.sad?.dt || cred.issuanceDate || cred.dt || new Date().toISOString(),
              status: sanitizedStatus, // ACDC spec: 'issued' or 'revoked'
            };
          });
          
           setIdentityDetails({ credentials: formattedCredentials });
           const ts = new Date().toISOString();
           setLastCredentialsRefresh(ts);
           console.log('✅ Credentials loaded:', formattedCredentials.length, formattedCredentials, 'at', ts);


          // Extract LE credential (most recent by timestamp)
          const leCredentials = credentialsSource
            .filter((cred: any) => {
              const schema = cred.sad?.s || cred.schema || cred.s;
              return schema === 'ENPXp1vQzRF6JwIuS-mp2U8Uf1MoADoP_GqQ62VsDZWY';
            })
            .sort((a: any, b: any) => {
              const dateA = new Date(a.sad?.a?.dt || a.sad?.dt || 0);
              const dateB = new Date(b.sad?.a?.dt || b.sad?.dt || 0);
              return dateB.getTime() - dateA.getTime();
            });

          if (leCredentials.length > 0) {
            const latestLE = leCredentials[0];
            const attributes = latestLE.sad?.a || {};

            // Extract status from credential schema
            const credStatus = attributes.status || latestLE.status || 'issued';
            console.log('🔍 LE credential status debug:', {
              attributeStatus: attributes.status,
              credStatus: latestLE.status,
              statusType: typeof credStatus,
              finalStatus: credStatus
            });
            const sanitizedStatus = (typeof credStatus === 'string' ? credStatus : 'issued') as 'issued' | 'revoked';

            // Extract Legal Entity LEI from the correct path: data[0].sad.a.LEI
            const legalEntityLEI = attributes.LEI;
            console.log('🏢 Legal Entity LEI extracted:', legalEntityLEI);
            console.log('🔍 LE credential attributes available:', Object.keys(attributes));
            console.log('🔍 LE credential attributes values:', attributes);

            // Extract Legal Entity Name
            // Note: Legal Entity vLEI credential only contains i, dt, LEI - no name fields
            // Use LEI-based name as the standard approach
            const legalEntityName = `Entity ${legalEntityLEI}`;
            console.log('🏢 Legal Entity Name (LEI-based):', legalEntityName);

            const orgDetails = {
              name: legalEntityName,
              lei: legalEntityLEI,
              jurisdiction: attributes.jurisdiction || attributes.juris || attributes.country,
              issuanceDate: attributes.dt || attributes.issueDate,
              status: sanitizedStatus, // ACDC spec: 'issued' or 'revoked'
            };

           setOrganizationDetails(orgDetails);
           console.log('✅ Organization details extracted from LE credential:', orgDetails);
           console.log('🔍 Final legalEntityName value:', legalEntityName);
           console.log('🔍 Final orgDetails.name value:', orgDetails.name);

            // Extract QVI credential from chains array: data[0].chains[0]
            let qviDetails = null;
            const chains = latestLE.chains || [];
            console.log('🔍 QVI Debug - Chains found:', chains.length);
            console.log('🔍 QVI Debug - Latest LE:', latestLE);
            
            if (chains.length > 0) {
              const qviCredential = chains[0];
              const qviAttributes = qviCredential.sad?.a || {};
              
              // Extract QVI LEI from chained credential: data[0].chains[0].sad.a.LEI
              const qviLEI = qviAttributes.LEI;
              console.log('🏛️ QVI LEI extracted from chains:', qviLEI);
              
              const qviStatus = (typeof (qviAttributes.status || qviCredential.status) === 'string' ? (qviAttributes.status || qviCredential.status) : 'issued') as 'issued' | 'revoked';
              
              // Attempt to resolve QVI name from chained credential
              const qviNameKeys = ['legalName','name','organizationName','organisationName','entityName','issuerName','qualifiedName'];
              let qviName = 'QVI Issuer';
              for (const k of qviNameKeys) { 
                if (qviAttributes[k]) { 
                  qviName = qviAttributes[k]; 
                  break; 
                } 
              }
              
              // Extract QVI issuer AID from chained credential
              const qviIssuerAID = qviAttributes.i || qviCredential.sad?.i || qviCredential.i;
              console.log('🏛️ QVI Issuer AID extracted from chains:', qviIssuerAID);
              
              qviDetails = {
                name: qviName,
                said: qviIssuerAID, // Use QVI issuer AID instead of credential SAID
                lei: qviLEI,
                issuanceDate: qviAttributes.dt || qviCredential.sad?.a?.dt || qviCredential.sad?.dt,
                status: qviStatus
              };
              console.log('✅ QVI details extracted from chains:', qviDetails);
            }

            // Fallback: Extract QVI credential using heuristics if no chains found
            if (!qviDetails) {
              console.log('🔍 QVI Debug - No chains found, trying fallback heuristics');
              const qviCandidates = credentialsSource.filter((cred: any) => {
                const schema = cred.sad?.s || cred.schema || cred.s || '';
                const lower = schema.toLowerCase();
                return lower.includes('qvi') || lower.includes('qualifiedvleiissuer') || lower.includes('qualified') && lower.includes('issuer');
              }).sort((a: any, b: any) => {
                const dateA = new Date(a.sad?.a?.dt || a.sad?.dt || 0);
                const dateB = new Date(b.sad?.a?.dt || b.sad?.dt || 0);
                return dateB.getTime() - dateA.getTime();
              });

              if (qviCandidates.length > 0) {
                const latestQVI = qviCandidates[0];
                const qviAttr = latestQVI.sad?.a || {};
                const qviStatus = (typeof (qviAttr.status || latestQVI.status) === 'string' ? (qviAttr.status || latestQVI.status) : 'issued') as 'issued' | 'revoked';
                // Attempt to resolve QVI name
                const qviNameKeys = ['legalName','name','organizationName','organisationName','entityName','issuerName','qualifiedName'];
                let qviName = 'QVI Issuer';
                for (const k of qviNameKeys) { if (qviAttr[k]) { qviName = qviAttr[k]; break; } }
                // Extract QVI issuer AID from fallback credential
                const qviIssuerAID = qviAttr.i || latestQVI.sad?.i || latestQVI.i;
                console.log('🏛️ QVI Issuer AID extracted from fallback:', qviIssuerAID);
                
                qviDetails = {
                  name: qviName,
                  said: qviIssuerAID, // Use QVI issuer AID instead of credential SAID
                  lei: qviAttr.LEI,
                  issuanceDate: qviAttr.dt || latestQVI.sad?.a?.dt || latestQVI.sad?.dt,
                  status: qviStatus
                };
                console.log('✅ QVI details extracted from heuristics:', qviDetails);
              }
            }

           if (qviDetails) {
             setQviDetails(qviDetails);
           } else {
             setQviDetails(null);
           }

           // Persist organization details for this holder AID (after QVI details are extracted)
           if (identityWallet.aid) {
             persistOrganizationDetails(identityWallet.aid, orgDetails, qviDetails);
             console.log('💾 Persisted organization details for holder AID:', identityWallet.aid);
             
             // Record issued LEI if we have LEI and legal entity name
             if (orgDetails.lei && orgDetails.name) {
               // Check if this LEI is already recorded
               const existingRecord = getIssuedLeiRecord(orgDetails.lei);
               if (!existingRecord) {
                 addIssuedLeiRecord({
                   lei: orgDetails.lei,
                   legalEntityName: orgDetails.name,
                   jurisdiction: orgDetails.jurisdiction,
                   holderAid: identityWallet.aid,
                   status: 'active'
                 });
                 console.log('📝 Recorded new issued LEI:', orgDetails.lei, 'for entity:', orgDetails.name);
               } else {
                 console.log('📝 LEI already recorded:', orgDetails.lei);
               }
             }
           }
          }
        } else {
          console.log('ℹ️ No credentials found in normalized source');
          setIdentityDetails({ credentials: [] });
          setOrganizationDetails(undefined);
          const tsEmpty = new Date().toISOString();
          setLastCredentialsRefresh(tsEmpty);
          console.log('ℹ️ No credentials found at', tsEmpty);
        }
      } else {
  console.error('❌ Credentials fetch failed (non-OK response):', response.status, raw);
  setIdentityDetails({ credentials: [] });
  setOrganizationDetails(undefined);
  setLastCredentialsRefresh(new Date().toISOString());
      }
    } catch (error) {
  console.error('❌ Exception during credentials fetch:', error);
  setIdentityDetails({ credentials: [] });
  setOrganizationDetails(undefined);
  setLastCredentialsRefresh(new Date().toISOString());
    } finally {
      setLoadingCredentials(false);
    }
  };

  // Query wallet binding from issuer by holder AID (preferred) or existing binding SAID
  const queryWalletBinding = async () => {
    if (!identityWallet.aid) return;

    setLoadingBinding(true);
    try {
      let response: Response | null = null;
      let endpointUsed = '';
      // Prefer holder endpoint for discovery
      try {
        endpointUsed = `/kel/binding/holder/${identityWallet.aid}`;
        response = await fetch(`http://localhost:3001${endpointUsed}`);
      } catch (e) {
        console.warn('Primary holder binding lookup failed:', e);
      }

      // Fallback: if we already have a binding SAID in store, refresh via SAID endpoint
      if ((!response || !response.ok) && identityWallet.walletBinding?.bindingSAID) {
        endpointUsed = `/kel/binding/${identityWallet.walletBinding.bindingSAID}`;
        try {
          response = await fetch(`http://localhost:3001${endpointUsed}`);
        } catch (e) {
          console.warn('Fallback SAID binding lookup failed:', e);
        }
      }

      if (response && response.ok) {
        const bindingData = await response.json();
        if (bindingData && (bindingData.cardanoAddress || bindingData.binding?.cardanoAddress)) {
          const cardanoAddress = bindingData.cardanoAddress || bindingData.binding?.cardanoAddress;
          const cardanoPublicKey = bindingData.cardanoPublicKey || bindingData.binding?.cardanoPublicKey;
          const bindingSAID = bindingData.bindingSAID || bindingData.binding?.d || bindingData.said;
          setIdentityDetails({
            walletBinding: {
              cardanoAddress,
              cardanoPublicKey,
              bindingSAID,
              verified: true,
              linkedAt: bindingData.createdAt || bindingData.timestamp || new Date().toISOString(),
            },
          });
          console.log('✅ Wallet binding fetched via', endpointUsed, bindingData);
        } else {
          console.log('ℹ️ No binding data structure in response via', endpointUsed);
        }
      } else {
        console.log('ℹ️ No binding found for AID', identityWallet.aid);
      }
    } catch (error) {
      console.warn('⚠️ Could not query wallet binding:', error);
    } finally {
      setLoadingBinding(false);
    }
  };

  // Query credentials and wallet binding on mount if identity is connected
  useEffect(() => {
    console.log('🔄 Credentials query useEffect triggered:', {
      hasIdentity,
      aid: identityWallet.aid,
      status: identityWallet.status,
      willQuery: hasIdentity && !!identityWallet.aid,
      currentCredentialsCount: identityWallet.credentials?.length || 0,
      hasWalletBinding: !!identityWallet.walletBinding
    });
    
    if (hasIdentity && identityWallet.aid) {
      // Always query credentials on mount or when AID changes
      console.log('✅ Executing queryCredentials for AID:', identityWallet.aid);
      queryCredentials();

      // Always query wallet binding (re-validate even if cached)
      if (identityWallet.walletBinding) {
        console.log('♻️ Re-validating existing wallet binding for AID:', identityWallet.aid, 'bindingSAID:', identityWallet.walletBinding.bindingSAID);
      } else {
        console.log('✅ Executing initial queryWalletBinding');
      }
      queryWalletBinding();
    } else {
      console.log('❌ Skipping query - conditions not met');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityWallet.aid, identityWallet.status, hasIdentity]);

  // Handle disconnect - clear all persisted data
  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect? This will clear all persisted data including identity and contacts.')) {
      reset();
      console.log('🔌 Disconnected - all data cleared');
    }
  };

  // Handle identity sign-in via OOBI resolution
  const handleIdentitySignIn = (identityData: {
    aid: string;
    alias: string;
    organizationName?: string;
    vlei?: {
      acquired: boolean;
      role?: string;
      lei?: string;
    };
  }) => {
    // Update identity details in store (persists across refreshes)
    setIdentityDetails({
      status: 'connected',
      aid: identityData.aid,
      name: identityData.alias,
      organizationName: identityData.organizationName,
      vlei: identityData.vlei,
    });
    console.log('✅ Identity signed in:', identityData);
  };

  // If identity detected, show identity status dashboard
  if (hasIdentity) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="h1">Welcome Back</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Your digital identity and wallet status
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge variant="success">
              <CheckCircle className="h-3 w-3 mr-1" />
              Identity Connected
            </StatusBadge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </Button>
          </div>
        </div>

        {/* Identity Overview Card */}
  <div className="card card-dense">
          <div className="card-header flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="h3">Identity Overview</h2>
          </div>
          <div className="card-body space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* KERI AID */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-slate-700">AID</span>
                  </div>
                  {identityWallet.oobi && (
                    <button
                      onClick={handleCopyOOBI}
                      className="p-1.5 text-slate-600 hover:text-primary hover:bg-slate-100 rounded transition-colors"
                      title="Copy full OOBI URL"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
                {identityWallet.name && (
                  <p className="text-sm text-slate-900 mb-2 font-medium">{identityWallet.name}</p>
                )}
                <p className="font-mono text-xs text-slate-600 break-all">{identityWallet.aid}</p>
              </div>


              {/* Cardano Wallet (CIP-30) */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-slate-700">Cardano Wallet</span>
                  </div>
                  <StatusBadge variant={cardanoWallet.injected ? 'success' : 'neutral'}>
                    {cardanoWallet.injected ? 'Detected' : 'Not Found'}
                  </StatusBadge>
                </div>
                {cardanoWallet.injected && cardanoWallet.address ? (
                  <p className="font-mono text-xs text-slate-600 break-all">{cardanoWallet.address}</p>
                ) : (
                  <p className="text-xs text-slate-500">No CIP-30 wallet detected</p>
                )}
              </div>
            </div>

            {/* (Organization moved to its own card below) */}

            {/* Wallet Binding (now integrated) */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-slate-700">Wallet Binding</span>
                </div>
                {identityWallet.walletBinding && (
                  <StatusBadge variant={identityWallet.walletBinding.verified ? 'success' : 'warning'}>
                    {identityWallet.walletBinding.verified ? 'Verified' : 'Pending'}
                  </StatusBadge>
                )}
              </div>
              {loadingBinding && (
                <p className="text-xs text-slate-500">Checking binding...</p>
              )}
              {!loadingBinding && identityWallet.walletBinding && (
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-slate-500">Cardano Address</p>
                    <p className="text-xs font-mono break-all text-slate-700">{identityWallet.walletBinding.cardanoAddress}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Binding SAID</p>
                    <p className="text-xs font-mono break-all text-slate-700">{identityWallet.walletBinding.bindingSAID}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Linked</p>
                    <p className="text-xs text-slate-700">{new Date(identityWallet.walletBinding.linkedAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
              {!loadingBinding && !identityWallet.walletBinding && (
                <div className="text-xs text-slate-600">
                  <p className="mb-3">No wallet linked yet. Bind a Cardano wallet to enable on-chain features.</p>
                  <Link href="/wallet-binding">
                    <Button variant="outline" size="sm" className="gap-1">
                      <LinkIcon className="h-3 w-3" />
                      Link Wallet
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>


        {/* Wallet binding card removed; functionality integrated above */}
        {/* Organization Card (separate) */}
  <div className="card card-dense">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="h3">Organization</h2>
            </div>
            {identityWallet.organizationDetails?.status && (
              <StatusBadge variant={identityWallet.organizationDetails.status === 'issued' ? 'success' : 'error'}>
                {identityWallet.organizationDetails.status === 'issued' ? 'Issued' : 'Revoked'}
              </StatusBadge>
            )}
          </div>
          <div className="card-body">
            {!identityWallet.organizationDetails && !identityWallet.organizationName && (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600 mb-2">No organization linked yet</p>
                <p className="text-xs text-slate-500 mb-4">Begin onboarding to acquire LE / vLEI credentials</p>
                <Link href="/onboarding">
                  <Button size="sm" variant="outline">
                    Start Onboarding
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            )}
            {(identityWallet.organizationDetails || identityWallet.organizationName) && (
              <div className="grid md:grid-cols-5 gap-4 text-2xs leading-tight">
                <div className="col-span-2">
                  <p className="text-tertiary mb-1">Legal Entity Name</p>
                  <p className="text-slate-900 font-medium truncate" title={identityWallet.organizationDetails?.name || identityWallet.organizationName}>{identityWallet.organizationDetails?.name || identityWallet.organizationName}</p>
                </div>
                {(identityWallet.organizationDetails?.lei || identityWallet.vlei?.lei) && (
                  <div>
                    <p className="text-tertiary mb-1">LEI</p>
                    <p className="font-mono break-all">{identityWallet.organizationDetails?.lei || identityWallet.vlei?.lei}</p>
                  </div>
                )}
                {identityWallet.organizationDetails?.jurisdiction && (
                  <div>
                    <p className="text-tertiary mb-1">Jurisdiction</p>
                    <p>{identityWallet.organizationDetails.jurisdiction}</p>
                  </div>
                )}
                <div>
                  <p className="text-tertiary mb-1">Status</p>
                  {identityWallet.organizationDetails?.status ? (
                    <StatusBadge variant={identityWallet.organizationDetails.status === 'issued' ? 'success' : 'error'}>
                      {identityWallet.organizationDetails.status}
                    </StatusBadge>
                  ) : (
                    <span className="text-slate-500">Unknown</span>
                  )}
                </div>
                {identityWallet.organizationDetails?.issuanceDate && (
                  <div>
                    <p className="text-tertiary mb-1">Issued Date</p>
                    <p>{new Date(identityWallet.organizationDetails.issuanceDate).toLocaleDateString()}</p>
                  </div>
                )}
                {identityWallet.aid && (
                  <div className="md:col-span-2">
                    <p className="text-tertiary mb-1">Holder AID</p>
                    <p className="font-mono break-all" title={identityWallet.aid}>{identityWallet.aid}</p>
                  </div>
                )}
                {identityWallet.vlei?.acquired && (
                  <div className="col-span-5 border-t pt-3 mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <Award className="h-3 w-3 text-primary" />
                      <span className="font-medium">vLEI Credential</span>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {identityWallet.vlei.role && (
                        <span>Role: {identityWallet.vlei.role}</span>
                      )}
                      {(identityWallet.vlei.lei && !identityWallet.organizationDetails?.lei) && (
                        <span>LEI: {identityWallet.vlei.lei}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

  {/* Credential Chain Summary */}
  <div className="card card-dense">
          <div className="card-header flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="h3">Credential Chain Validation</h2>
          </div>
          <div className="card-body text-xs">
            {identityWallet.credentials && identityWallet.credentials.length > 0 ? (
              <div className="grid md:grid-cols-4 gap-4">
                {(() => {
                  // Derive presence heuristically
                  const schemas = identityWallet.credentials.map(c => c.schema);
                  const hasLE = schemas.includes('ENPXp1vQzRF6JwIuS-mp2U8Uf1MoADoP_GqQ62VsDZWY');
                  const hasQVI = !!qviDetails; // Check if QVI details are actually populated
                  const hasRole = schemas.some(s => s.toLowerCase().includes('role'));
                  const allValid = hasLE && hasQVI; // simple heuristic
                  return (
                    <>
                      <div>
                        <p className="text-slate-500 mb-1">QVI</p>
                        <StatusBadge variant={hasQVI ? 'success' : 'neutral'}>
                          {hasQVI ? 'Present' : 'Missing'}
                        </StatusBadge>
                        {qviDetails?.name && (
                          <p className="mt-1 text-[10px] text-slate-600 line-clamp-2" title={qviDetails.name}>{qviDetails.name}</p>
                        )}
                        {qviDetails?.said && (
                          <p className="mt-1 text-[10px] text-slate-500 font-mono break-all" title="QVI AID">AID: {qviDetails.said}</p>
                        )}
                        {qviDetails?.lei && (
                          <p className="mt-1 text-[10px] text-slate-500 font-mono" title="QVI LEI">LEI: {qviDetails.lei}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Legal Entity</p>
                        <StatusBadge variant={hasLE ? 'success' : 'neutral'}>
                          {hasLE ? 'Present' : 'Missing'}
                        </StatusBadge>
                        {identityWallet.organizationDetails?.name && (
                          <p className="mt-1 text-[10px] text-slate-600 line-clamp-2" title={identityWallet.organizationDetails.name}>{identityWallet.organizationDetails.name}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Role</p>
                        <StatusBadge variant={hasRole ? 'success' : 'neutral'}>
                          {hasRole ? 'Present' : 'Missing'}
                        </StatusBadge>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Chain Status</p>
                        <StatusBadge variant={allValid ? 'success' : 'warning'}>
                          {allValid ? 'Valid' : 'Incomplete'}
                        </StatusBadge>
                        {qviDetails?.status && (
                          <p className="mt-1 text-[10px] text-slate-500">QVI: {qviDetails.status}</p>
                        )}
                        {identityWallet.organizationDetails?.status && (
                          <p className="mt-1 text-[10px] text-slate-500">LE: {identityWallet.organizationDetails.status}</p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <p className="text-slate-500">No credentials to evaluate yet.</p>
            )}
          </div>
        </div>

        {/* Credentials Section - Moved to Bottom */}
        <div className="card card-dense mt-4">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="h3">Credentials</h2>
            </div>
            <div className="flex items-center gap-2">
              {identityWallet.credentials && identityWallet.credentials.length > 0 && (
                <StatusBadge variant="success">
                  {identityWallet.credentials.length} Active
                </StatusBadge>
              )}
              {lastCredentialsRefresh && (
                <span className="text-[10px] text-slate-500 font-mono">
                  Refreshed {new Date(lastCredentialsRefresh).toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={queryCredentials}
                disabled={loadingCredentials || !identityWallet.aid}
                className="flex items-center gap-1.5"
              >
                {loadingCredentials ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                  </svg>
                )}
                Refresh
              </Button>
            </div>
          </div>
          <div className="card-body">
            {loadingCredentials ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-sm text-slate-600">Loading credentials...</p>
              </div>
            ) : identityWallet.credentials && identityWallet.credentials.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-slate-700">Schema</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-slate-700">Issuer</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-slate-700">Issued</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-slate-700">Status</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-slate-700">SAID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {identityWallet.credentials
                      .sort((a, b) => new Date(b.issuanceDate).getTime() - new Date(a.issuanceDate).getTime())
                      .slice(0, 5)
                      .map((cred, index) => (
                        <tr key={cred.said || index} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-xs text-slate-900" title={cred.schema}>
                            {cred.schema.substring(0, 24)}...
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-700" title={cred.issuer}>
                            {cred.issuer.substring(0, 16)}...
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-700">
                            {new Date(cred.issuanceDate).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2.5">
                            <StatusBadge variant={cred.status === 'issued' ? 'success' : 'error'}>
                              {cred.status}
                            </StatusBadge>
                          </td>
                          <td className="px-3 py-2.5 text-xs font-mono text-slate-600" title={cred.said}>
                            {cred.said.substring(0, 12)}...
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {identityWallet.credentials.length > 5 && (
                  <div className="mt-3 text-center text-xs text-slate-500">
                    Showing 5 of {identityWallet.credentials.length} credentials
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600">No credentials issued yet</p>
              </div>
            )}
          </div>
        </div>

      </div>
    );
  }

  // No identity signed in - show OOBI sign-in
  return (
    <div className="max-w-3xl mx-auto space-y-5 py-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Principia Trust Engine Demo</h1>
        <p className="text-[12px] leading-tight text-muted-foreground max-w-xl mx-auto">
          Sign in with your decentralized identity (OOBI) to access credentials and wallet features.
        </p>
        <p className="text-[11px] text-slate-600">
          Or view the <Link href="/presentation" className="underline text-primary hover:text-primary/80">demo presentation</Link> first.
        </p>
      </div>

      <div className="mt-2">
        <OOBIIdentitySignIn 
          onSignIn={handleIdentitySignIn}
          showServerOOBI={true}
        />
      </div>
    </div>
  );
}
