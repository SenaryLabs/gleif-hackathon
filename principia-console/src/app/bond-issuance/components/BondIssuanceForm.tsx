"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Banknote, Building2, Wallet as WalletIcon, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { useConsoleStore } from '@/lib/consoleStore';
import { buildBondIssuanceTransaction } from '@/utils/bondMintingUtils';

interface BondFormState {
  bondName: string;
  bondDescription: string;
  faceValue: string;
  couponRate: string;
  maturityDate: string;
  issuerName: string;
  issuerDescription: string;
  issuerLei: string;
  issuerLegalName: string;
  // Technical fields (auto-populated)
  bondId: string;
  issuerAid: string;
  vleiSaid: string;
  currency: string;
  denomination: number;
}

const initialForm: BondFormState = {
  bondName: 'Senary Labs Digital Bond 2025',
  bondDescription: 'Digital bond issuance for institutional investors',
  faceValue: '1000000',
  couponRate: '5.0',
  maturityDate: '',
  issuerName: 'Senary Labs',
  issuerDescription: 'Digital asset issuer',
  issuerLei: '549300V082XBE1L6B495',
  issuerLegalName: 'Senary Labs',
  bondId: 'SLDB2025',
  issuerAid: 'EExample_IssuerAID',
  vleiSaid: 'EExampleVLEICredentialSAID',
  currency: 'ADA',
  denomination: 1000000, // 1 ADA in lovelace
};

export const BondIssuanceForm: React.FC = () => {
  const identityWallet = useConsoleStore(s => s.identityWallet);
  const cardanoWallet = useConsoleStore(s => s.cardanoWallet);
  const detectCardanoWallet = useConsoleStore(s => s.detectCardanoWallet);
  const loadPersistedOrganizationDetails = useConsoleStore(s => s.loadPersistedOrganizationDetails);
  const getIssuedLeiRecord = useConsoleStore(s => s.getIssuedLeiRecord);
  
  const [form, setForm] = useState<BondFormState>(() => ({
    ...initialForm,
    // Basic AID and credential info - organization details will be loaded via useEffect
    issuerAid: identityWallet.aid || initialForm.issuerAid,
    vleiSaid: identityWallet.credentials?.[0]?.said || initialForm.vleiSaid,
  }));
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [result, setResult] = useState<any>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Track user edits to issuer-related fields to avoid overwriting manual changes when org details update
  const userEditedIssuerLei = useRef(false);
  const userEditedIssuerName = useRef(false);
  const userEditedIssuerLegalName = useRef(false);

  const markEdited = (field: keyof BondFormState) => {
    if (field === 'issuerLei') userEditedIssuerLei.current = true;
    if (field === 'issuerName') userEditedIssuerName.current = true;
    if (field === 'issuerLegalName') userEditedIssuerLegalName.current = true;
  };

  // Auto-populate maturity date (1 year from now)
  useEffect(() => {
    if (!form.maturityDate) {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      setForm(f => ({ ...f, maturityDate: futureDate.toISOString().split('T')[0] }));
    }
  }, []);

  // Check for persisted organization details when component mounts or when AID / org details change
  useEffect(() => {
    console.log('🔄 Bond form useEffect triggered:', {
      aid: identityWallet.aid,
      hasOrganizationDetails: !!identityWallet.organizationDetails,
      organizationDetails: identityWallet.organizationDetails
    });
    
    if (identityWallet.aid) {
      const persistedDetails = loadPersistedOrganizationDetails(identityWallet.aid);
      console.log('🔍 Persisted details lookup result:', persistedDetails);
      
      if (persistedDetails?.organizationDetails) {
        console.log('📂 Loading persisted organization details for bond form:', persistedDetails.organizationDetails);
        setForm(f => ({
          ...f,
          issuerLei: userEditedIssuerLei.current ? f.issuerLei : (persistedDetails.organizationDetails.lei || f.issuerLei),
          issuerName: userEditedIssuerName.current ? f.issuerName : (persistedDetails.organizationDetails.name || f.issuerName),
          issuerLegalName: userEditedIssuerLegalName.current ? f.issuerLegalName : (persistedDetails.organizationDetails.name || f.issuerLegalName),
        }));
        console.log('✅ Form updated with persisted organization details');
        console.log('📋 Form values after update:', {
          issuerLei: persistedDetails.organizationDetails.lei || 'not set',
          issuerName: persistedDetails.organizationDetails.name || 'not set',
          issuerLegalName: persistedDetails.organizationDetails.name || 'not set',
        });
      } else {
        // Fallback to current organization details from store
        console.log('📂 No persisted details found, using current organization details');
        setForm(f => ({
          ...f,
          issuerLei: userEditedIssuerLei.current ? f.issuerLei : (identityWallet.organizationDetails?.lei || f.issuerLei),
          issuerName: userEditedIssuerName.current ? f.issuerName : (identityWallet.organizationDetails?.name || f.issuerName),
          issuerLegalName: userEditedIssuerLegalName.current ? f.issuerLegalName : (identityWallet.organizationDetails?.name || f.issuerLegalName),
        }));
        console.log('✅ Form updated with current organization details');
        console.log('📋 Form values after fallback update:', {
          issuerLei: identityWallet.organizationDetails?.lei || 'not set',
          issuerName: identityWallet.organizationDetails?.name || 'not set',
          issuerLegalName: identityWallet.organizationDetails?.name || 'not set',
        });
        
        // Additional fallback: Check issued LEI records if no organization details
        if (!identityWallet.organizationDetails?.lei && !identityWallet.organizationDetails?.name) {
          console.log('🔍 Checking issued LEI records as additional fallback...');
          // This would need to be implemented based on how you want to select which LEI record to use
          // For now, we'll just log that this could be a fallback option
        }
      }
    } else {
      console.log('⚠️ No AID available for persisted details lookup');
    }
  }, [identityWallet.aid, identityWallet.organizationDetails, loadPersistedOrganizationDetails]);

  const updateField = (field: keyof BondFormState, value: string | number) => {
    setForm(f => ({ ...f, [field]: value }));
    markEdited(field);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Derived status indicators for visibility strip

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.bondName.trim()) {
      newErrors.bondName = 'Bond name is required';
    }

    if (!form.faceValue.trim()) {
      newErrors.faceValue = 'Face value is required';
    } else if (isNaN(Number(form.faceValue)) || Number(form.faceValue) <= 0) {
      newErrors.faceValue = 'Face value must be a positive number';
    }

    if (!form.couponRate.trim()) {
      newErrors.couponRate = 'Coupon rate is required';
    } else if (isNaN(Number(form.couponRate)) || Number(form.couponRate) < 0 || Number(form.couponRate) > 100) {
      newErrors.couponRate = 'Coupon rate must be between 0 and 100';
    }

    if (!form.maturityDate.trim()) {
      newErrors.maturityDate = 'Maturity date is required';
    } else {
      const maturityDate = new Date(form.maturityDate);
      const today = new Date();
      if (maturityDate <= today) {
        newErrors.maturityDate = 'Maturity date must be in the future';
      }
    }

    if (!form.issuerLei.trim()) {
      newErrors.issuerLei = 'LEI is required';
    } else if (!/^[A-Z0-9]{20}$/.test(form.issuerLei)) {
      newErrors.issuerLei = 'LEI must be 20 characters (letters and numbers only)';
    }

    if (!form.issuerLegalName.trim()) {
      newErrors.issuerLegalName = 'Legal entity name is required';
    }

    if (!form.issuerName.trim()) {
      newErrors.issuerName = 'Issuer name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const canSubmit = !!identityWallet.walletBinding && !!cardanoWallet.api && !submitting;

  const handleConnectWallet = useCallback(() => {
    detectCardanoWallet();
  }, [detectCardanoWallet]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!identityWallet.walletBinding) {
      setErrors({ wallet: 'Wallet binding required. Please complete wallet binding first.' });
      return;
    }
    
    if (!cardanoWallet.api) {
      if (cardanoWallet.injected && cardanoWallet.name) {
        setErrors({ wallet: `Wallet ${cardanoWallet.name} detected but not enabled. Open the wallet extension and approve access.` });
      } else {
        setErrors({ wallet: 'No Cardano wallet detected. Install or open a CIP-30 compatible wallet.' });
      }
      return;
    }
    
    setError(undefined); 
    setResult(undefined); 
    setSubmitting(true);
    
    try {
      console.log('🚀 Starting bond issuance transaction build...');
      console.log('Form data:', form);
      
      // Get binding credentials from bindingInput (contains actual signatures)
      const bindingInput = useConsoleStore.getState().bindingInput;
      if (!bindingInput || bindingInput.trim() === '') {
        throw new Error('No binding credentials found. Please complete wallet binding first.');
      }
      
      console.log('✅ Using binding credentials from bindingInput');
      
      // Parse the binding credentials JSON
        let raw = bindingInput.trim();
      if (!raw.startsWith('{')) {
        const brace = raw.indexOf('{');
        if (brace !== -1) raw = raw.slice(brace);
      }
      
      const parsedBinding = JSON.parse(raw);
      console.log('🔍 Parsed binding data structure:', Object.keys(parsedBinding));
      console.log('🔍 Available fields:', parsedBinding);
      
      const bindingCredentials = {
        cardanoSignature: parsedBinding.cardanoSignature || parsedBinding.binding?.signature?.cardano || parsedBinding.signature?.cardano || '',
        keriSignature: parsedBinding.veridianSignature || parsedBinding.binding?.signature?.veridian || parsedBinding.signature?.veridian || '',
        bindingSaid: parsedBinding.bindingSAID || parsedBinding.binding?.d || '',
        keriAid: parsedBinding.holderAID || parsedBinding.binding?.holder || identityWallet.aid,
        cardanoAddress: parsedBinding.cardanoAddress || parsedBinding.binding?.cardanoAddress || '',
        cardanoPublicKey: parsedBinding.cardanoPublicKey || parsedBinding.binding?.cardanoPublicKey || parsedBinding.publicKey || '',
        canonicalMessage: parsedBinding.canonicalMessage || '',
        timestamp: parsedBinding.createdAt || Date.now(),
      };
      
      console.log('🔑 Binding credentials extracted:', {
        cardanoSignature: bindingCredentials.cardanoSignature ? 'Present' : 'Missing',
        keriSignature: bindingCredentials.keriSignature ? 'Present' : 'Missing',
        cardanoPublicKey: bindingCredentials.cardanoPublicKey ? 'Present' : 'Missing',
        cardanoAddress: bindingCredentials.cardanoAddress ? 'Present' : 'Missing',
        keriAid: bindingCredentials.keriAid ? 'Present' : 'Missing',
      });
      
      // Create bond issuance request
      const bondId = form.bondName.replace(/\s+/g, '-').toLowerCase();
      const bondIssuanceRequest = {
        bondId,
        issuerLei: form.issuerLei,
        issuerEntityName: form.issuerName,
        issuerEntityAid: form.issuerAid,
        vleiCredentialSaid: form.vleiSaid,
        totalFaceValue: Number(form.faceValue),
        couponRateBps: Math.round(Number(form.couponRate) * 100), // Convert to basis points
        maturityTimestamp: new Date(form.maturityDate).getTime(),
        currency: form.currency,
        denomination: form.denomination,
        bindingCredentials,
      };

      console.log('📋 Bond issuance request:', bondIssuanceRequest);
      console.log('🆔 Generated Bond ID:', bondId);

      // Build and submit transaction
      const { tx, bondDatum, policyId, error: buildError } = await buildBondIssuanceTransaction(
        bondIssuanceRequest,
        cardanoWallet.api
      );
      
      if (buildError) {
        throw new Error(buildError);
      }
      
      setResult({
        txHash: tx,
        policyId,
        datum: bondDatum,
        assetUnit: `${policyId}${bondId}`,
      });
      
      console.log('✅ Bond issuance transaction submitted:', tx);
    } catch (e: any) {
      console.error('❌ Bond issuance failed:', e);
      setError(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }, [form, identityWallet.walletBinding, cardanoWallet.api, identityWallet.aid]);

  // Clear wallet error once API becomes available
  useEffect(() => {
    if (errors.wallet && cardanoWallet.api) {
      setErrors(prev => ({ ...prev, wallet: '' }));
    }
  }, [cardanoWallet.api, errors.wallet]);

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Main Form - Bond and Issuer Details in same row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Bond Details */}
          <Card dense className="space-y-3">
            <CardHeader className="py-2 flex items-center gap-2"><Banknote aria-hidden="true" className="w-4 h-4 text-primary" /><h3 className="h4">Bond Details</h3></CardHeader>
            <CardBody className="grid grid-cols-1 gap-3 text-2xs">
              <div>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] text-tertiary">Bond Name *</span>
                  <input 
                    name="bondName" 
                    value={form.bondName} 
                    onChange={(e) => updateField('bondName', e.target.value)} 
                    placeholder="Enter bond name"
                    className="input" 
                  />
                  {errors.bondName && (
                    <p className="text-[10px] text-red-600 mt-1">{errors.bondName}</p>
                  )}
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-tertiary">Face Value (ADA) *</span>
                    <input 
                      type="number"
                      name="faceValue" 
                      value={form.faceValue} 
                      onChange={(e) => updateField('faceValue', e.target.value)} 
                      placeholder="1000000"
                      className="input" 
                    />
                    {errors.faceValue && (
                      <p className="text-[10px] text-red-600 mt-1">{errors.faceValue}</p>
                    )}
                  </label>
                </div>
                <div>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-tertiary">Coupon Rate (%) *</span>
                    <input 
                      type="number"
                      step="0.01"
                      name="couponRate" 
                      value={form.couponRate} 
                      onChange={(e) => updateField('couponRate', e.target.value)} 
                      placeholder="5.0"
                      className="input" 
                    />
                    {errors.couponRate && (
                      <p className="text-[10px] text-red-600 mt-1">{errors.couponRate}</p>
                    )}
                  </label>
                </div>
              </div>
              <div>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] text-tertiary">Maturity Date *</span>
                  <input 
                    type="date"
                    name="maturityDate" 
                    value={form.maturityDate} 
                    onChange={(e) => updateField('maturityDate', e.target.value)} 
                    className="input" 
                  />
                  {errors.maturityDate && (
                    <p className="text-[10px] text-red-600 mt-1">{errors.maturityDate}</p>
                  )}
                </label>
              </div>
              <div>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] text-tertiary">Bond Description</span>
                  <textarea
                    name="bondDescription"
                    value={form.bondDescription}
                    onChange={(e) => updateField('bondDescription', e.target.value)}
                    placeholder="Enter bond description (optional)"
                    rows={2}
                    className="input resize-none"
                  />
                </label>
              </div>
            </CardBody>
          </Card>

          {/* Issuer Details */}
          <Card dense className="space-y-3">
            <CardHeader className="py-2 flex items-center gap-2"><Building2 aria-hidden="true" className="w-4 h-4 text-primary" /><h3 className="h4">Issuer Details</h3></CardHeader>
            <CardBody className="grid grid-cols-1 gap-3 text-2xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-tertiary">LEI *</span>
                    <input 
                      name="issuerLei" 
                      value={form.issuerLei} 
                      onChange={(e) => updateField('issuerLei', e.target.value)} 
                      placeholder="549300V082XBE1L6B495"
                      className="input" 
                    />
                    {errors.issuerLei && (
                      <p className="text-[10px] text-red-600 mt-1">{errors.issuerLei}</p>
                    )}
                  </label>
                </div>
                <div>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-tertiary">Legal Name *</span>
                    <input 
                      name="issuerLegalName" 
                      value={form.issuerLegalName} 
                      onChange={(e) => updateField('issuerLegalName', e.target.value)} 
                      placeholder="Enter legal entity name"
                      className="input" 
                    />
                    {errors.issuerLegalName && (
                      <p className="text-[10px] text-red-600 mt-1">{errors.issuerLegalName}</p>
                    )}
                  </label>
                </div>
              </div>
              <div>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] text-tertiary">Issuer Name *</span>
                  <input 
                    name="issuerName" 
                    value={form.issuerName} 
                    onChange={(e) => updateField('issuerName', e.target.value)} 
                    placeholder="Enter issuer name"
                    className="input" 
                  />
                  {errors.issuerName && (
                    <p className="text-[10px] text-red-600 mt-1">{errors.issuerName}</p>
                  )}
                </label>
              </div>
              <div>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] text-tertiary">Issuer Description</span>
                  <textarea
                    name="issuerDescription"
                    value={form.issuerDescription}
                    onChange={(e) => updateField('issuerDescription', e.target.value)}
                    placeholder="Enter issuer description (optional)"
                    rows={2}
                    className="input resize-none"
                  />
                </label>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Wallet Connection */}
        <Card dense className="space-y-2">
          <CardHeader className="py-2 flex items-center gap-2"><WalletIcon aria-hidden="true" className="w-4 h-4 text-primary" /><h3 className="h4">Cardano Wallet Connection</h3></CardHeader>
          <CardBody className="space-y-3 text-2xs">
          
          {!cardanoWallet.api && (
            <div className="p-3 rounded border bg-white shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-slate-800">Connect Cardano Wallet</h3>
                  <p className="text-[10px] text-slate-600">Required to sign the bond minting transaction.</p>
                  {cardanoWallet.injected && cardanoWallet.name && !cardanoWallet.api && (
                    <p className="text-[10px] text-amber-600">{cardanoWallet.name} detected &mdash; click Connect then approve in the wallet popup.</p>
                  )}
                  {!identityWallet.walletBinding && (
                    <p className="text-[10px] text-red-600">Wallet binding not complete – finish binding first.</p>
                  )}
                </div>
                <button
                  onClick={handleConnectWallet}
                  className="btn btn-secondary text-[11px] whitespace-nowrap"
                >
                  Connect Wallet
                </button>
              </div>
            </div>
          )}

          {cardanoWallet.api && (
            <div className="p-2 rounded border bg-green-50">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-green-700" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="flex-1 space-y-0.5">
                  <span className="text-[11px] font-semibold text-green-800">
                    {cardanoWallet.name && `${cardanoWallet.name.charAt(0).toUpperCase() + cardanoWallet.name.slice(1)} Connected`}
                  </span>
                  {cardanoWallet.address && (
                    <div className="text-[10px] text-green-700 font-mono">
                      {cardanoWallet.address.slice(0, 24)}...{cardanoWallet.address.slice(-12)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {errors.wallet && (
            <div className="p-2 rounded border bg-red-50">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-[10px] text-red-700 font-medium">{errors.wallet}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-2 rounded border bg-red-50">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-[10px] text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}
      </CardBody>
        </Card>

        {/* Submit Button */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="btn btn-primary text-[11px]"
          >
            {submitting ? 'Minting Bond...' : 'Mint Bond Token'}
          </button>
          {!identityWallet.walletBinding && <span className="text-[10px] text-amber-600">Wallet binding required</span>}
        </div>
      </form>

      {/* Transaction Results - Show after submission */}
      {result && (
        <Card dense className="space-y-2">
          <CardHeader className="py-2 flex items-center gap-2"><CheckCircle aria-hidden="true" className="w-4 h-4 text-green-600" /><h3 className="h4">Transaction Results</h3></CardHeader>
          <CardBody className="space-y-2 text-2xs">
            <div className="p-2 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="font-semibold mb-1 text-green-800 dark:text-green-200">✅ Bond Token Minted</div>
              <div className="text-green-700 dark:text-green-300 mb-1">
                Tx Hash: <code className="break-all">{result.txHash}</code>
              </div>
              <a 
                href={`https://preprod.cardanoscan.io/transaction/${result.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors text-[10px]"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                CardanoScan
              </a>
            </div>
            <div className="p-2 rounded bg-muted/30 border border-border space-y-1">
              <div className="font-semibold">Token Details</div>
              <div>Policy ID: <code className="break-all">{result.policyId}</code></div>
              <div>Asset Unit: <code className="break-all">{result.assetUnit}</code></div>
            </div>
            <div className="p-2 rounded bg-muted/30 border border-border space-y-1">
              <div className="font-semibold">Bond Datum</div>
              <pre className="whitespace-pre-wrap text-[9px] max-h-44 overflow-auto">{JSON.stringify(result.datum, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value, 2)}</pre>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};
