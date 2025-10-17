'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConsoleStore } from '@/lib/consoleStore';
import { useOnboardingStore } from '@/lib/onboardingStore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Building2, User, Award, CheckCircle, ArrowRight, ArrowLeft, Loader2, Sparkles, Shield, FileText, Copy, Check } from 'lucide-react';
import { demoCompanies, getRandomDemoCompany } from '@/data/demoData';
import { Modal } from '@/components/ui/modal';

const ISSUER_API = process.env.NEXT_PUBLIC_ISSUER_API || 'http://localhost:3001';

// Schema SAIDs from API_GUIDE.md
const SCHEMAS = {
  LE: 'ENPXp1vQzRF6JwIuS-mp2U8Uf1MoADoP_GqQ62VsDZWY',
  ROLE: 'EBNaNu-M9P5cgrnfl2Fvymy4E_jvxxyjb70PRtiANlJy',
};

const STEPS = ['company', 'ekyb', 'credentials', 'complete'] as const;
type Step = typeof STEPS[number];

export default function OnboardingPage() {
  const router = useRouter();
  const { identityWallet } = useConsoleStore();
  const { currentStep, company, setStep, updateCompany, setCredentials, reset } = useOnboardingStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemoOptions, setShowDemoOptions] = useState(false);
  const [ekybVerified, setEkybVerified] = useState(false);
  const [qviIssuer, setQviIssuer] = useState<{aid?: string; name?: string}>({});
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // If returning to onboarding after completing, reset to start fresh
  useEffect(() => {
    if (currentStep === 'complete') {
      reset();
    }
  }, []);

  // Load demo data function
  const loadDemoData = (demoIndex?: number) => {
    const demo = demoIndex !== undefined ? demoCompanies[demoIndex] : getRandomDemoCompany();
    updateCompany({
      name: demo.name,
      lei: demo.lei,
      jurisdiction: demo.jurisdiction,
      representativeName: demo.representative.name,
      representativeEmail: demo.representative.email,
      officialRole: demo.representative.role,
    });
    setShowDemoOptions(false);
  };

  // Redirect if no identity connected
  if (!identityWallet.aid) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Building2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
        <h1 className="h2 mb-2">Identity Required</h1>
        <p className="text-muted-foreground mb-6">
          Please sign in with your KERI identity to start onboarding.
        </p>
        <Button onClick={() => router.push('/')}>
          Go to Home
        </Button>
      </div>
    );
  }

  const handleCompanySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const companyData = {
      name: formData.get('companyName') as string,
      lei: formData.get('lei') as string,
      jurisdiction: formData.get('jurisdiction') as string,
      representativeName: formData.get('representativeName') as string,
      representativeEmail: formData.get('representativeEmail') as string,
      officialRole: formData.get('officialRole') as string,
    };

    try {
      // Save company data
      updateCompany(companyData);
      
      // Simulate saving delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Move to eKYB step
      setStep('ekyb');
      console.log('✅ Company information saved');
    } catch (err) {
      setError((err as Error).message);
      console.error('❌ Failed to save company information:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEkybSubmit = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Simulate eKYB verification
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setEkybVerified(true);
      console.log('✅ eKYB verification complete');
    } catch (err) {
      setError((err as Error).message);
      console.error('❌ eKYB verification failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialsSubmit = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Fetch QVI issuer information
      console.log('🔄 Fetching Principia Issuer info...');
      try {
        const qviResponse = await fetch(`${ISSUER_API}/keriOobi`);
        if (qviResponse.ok) {
          let qviOobi = await qviResponse.text();
          console.log('Raw OOBI response:', qviOobi);
          
          // Clean up the response - remove quotes if it's wrapped in them
          qviOobi = qviOobi.replace(/^["']|["']$/g, '').trim();
          console.log('Cleaned OOBI:', qviOobi);
          
          // Try to parse as URL to extract components
          try {
            const url = new URL(qviOobi);
            // Extract AID from path: /oobi/{AID}/agent/...
            const pathParts = url.pathname.split('/');
            const oobiIndex = pathParts.indexOf('oobi');
            const aid = oobiIndex >= 0 && pathParts[oobiIndex + 1] ? pathParts[oobiIndex + 1] : undefined;
            
            // Extract name from query params
            const name = url.searchParams.get('name') || 'Principia Trust Issuer';
            
            setQviIssuer({ aid, name });
            console.log('✅ Principia Issuer info parsed:', { aid, name });
          } catch (urlErr) {
            // Fallback to regex if URL parsing fails
            const aidMatch = qviOobi.match(/\/oobi\/([^\/]+)\//);
            const aid = aidMatch ? aidMatch[1] : undefined;
            const nameMatch = qviOobi.match(/[?&]name=([^&"'}]+)/);
            let name = nameMatch ? decodeURIComponent(nameMatch[1]).replace(/["'}]+$/g, '').trim() : 'Principia Trust Issuer';
            
            setQviIssuer({ aid, name });
            console.log('✅ Principia Issuer info extracted (regex):', { aid, name });
          }
        } else {
          console.warn('Failed to fetch issuer OOBI:', qviResponse.status);
          setQviIssuer({ name: 'Principia Trust Issuer' });
        }
      } catch (err) {
        console.error('Could not fetch Principia Issuer info:', err);
        setQviIssuer({ name: 'Principia Trust Issuer' });
      }

      // Issue LE Credential only (Role credential disabled for now)
      console.log('🔄 Issuing LE Credential...');
      const leResponse = await fetch(`${ISSUER_API}/issueAcdcCredential`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemaSaid: SCHEMAS.LE,
          aid: identityWallet.aid,
          attribute: {
            LEI: company.lei,
            dt: new Date().toISOString(),
          },
        }),
      });

      if (!leResponse.ok) {
        throw new Error('Failed to issue LE credential');
      }
      console.log('✅ LE Credential issued');

      // TODO: Issue Role Credential (currently disabled)
      // Keeping the UI elements but not making the API call
      // await new Promise(resolve => setTimeout(resolve, 1000));
      // console.log('🔄 Issuing Role Credential...');
      // const roleResponse = await fetch(`${ISSUER_API}/issueAcdcCredential`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     schemaSaid: SCHEMAS.ROLE,
      //     aid: identityWallet.aid,
      //     attribute: {
      //       LEI: company.lei,
      //       personLegalName: company.representativeName,
      //       officialRole: company.officialRole,
      //       dt: new Date().toISOString(),
      //     },
      //   }),
      // });
      // if (!roleResponse.ok) {
      //   throw new Error('Failed to issue Role credential');
      // }
      // console.log('✅ Role Credential issued');

      setCredentials({ 
        le: { issued: true, lei: company.lei },
        // role: { issued: true, role: company.officialRole } // Disabled for now
      });
      setStep('complete');
    } catch (err) {
      setError((err as Error).message);
      console.error('❌ Credential issuance failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    reset();
    router.push('/');
  };

  const handleBack = () => {
    const currentIndex = STEPS.indexOf(currentStep as Step);
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1]);
    }
  };

  const handleCopySchema = async () => {
    try {
      await navigator.clipboard.writeText(SCHEMAS.LE);
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 2000);
    } catch (e) {
      console.warn('Could not copy schema SAID', e);
    }
  };

  const buildCredentialJson = () => ({
    v: 'ACDC10JSON00011c_',
    d: '[Credential SAID]',
    i: qviIssuer.aid || '[QVI Issuer AID]',
    ri: '[Credential status registry]',
    s: SCHEMAS.LE,
    a: {
      d: '[Attributes block SAID]',
      i: identityWallet.aid,
      dt: new Date().toISOString(),
      LEI: company.lei
    },
    e: {
      d: '[Edges block SAID]',
      qvi: {
        n: '[QVI credential SAID]',
        s: 'EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao'
      }
    },
    r: {
      d: '[Rules block SAID]',
      usageDisclaimer: { l: 'Usage of a valid, unexpired, and non-revoked vLEI Credential...' },
      issuanceDisclaimer: { l: 'All information in a valid, unexpired, and non-revoked vLEI Credential...' }
    }
  });

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(buildCredentialJson(), null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2500);
    } catch (e) {
      console.warn('Could not copy credential JSON', e);
    }
  };

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="h1">vLEI Credential Onboarding</h1>
          <p className="text-muted-foreground text-sm mt-1">Step-by-step issuance flow for your organization's vLEI credentials</p>
        </div>
      </div>
      {/* Progress Header */}
      <Card dense className="pt-2">
        <CardBody className="space-y-2">
          <div className="flex items-center gap-6 flex-wrap">
            {/* Step 1: Company Info */}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                currentStep === 'company' ? 'bg-primary text-white' :
                STEPS.indexOf(currentStep as Step) > 0 ? 'bg-green-500 text-white' : 'bg-slate-200'
              }`}>
                {STEPS.indexOf(currentStep as Step) > 0 ? <CheckCircle className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
              </div>
              <span className="text-2xs font-medium text-center">Company Info</span>
            </div>
            <div className={`h-1 w-14 rounded ${STEPS.indexOf(currentStep as Step) > 0 ? 'bg-green-500' : 'bg-slate-200'}`} />

            {/* Step 2: eKYB */}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                currentStep === 'ekyb' ? 'bg-primary text-white' :
                STEPS.indexOf(currentStep as Step) > 1 ? 'bg-green-500 text-white' : 'bg-slate-200'
              }`}>
                {STEPS.indexOf(currentStep as Step) > 1 ? <CheckCircle className="h-5 w-5" /> : <User className="h-5 w-5" />}
              </div>
              <span className="text-2xs font-medium text-center">eKYB</span>
            </div>

            <div className={`h-1 w-14 rounded ${STEPS.indexOf(currentStep as Step) > 1 ? 'bg-green-500' : 'bg-slate-200'}`} />

            {/* Step 3: Credentials */}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                currentStep === 'credentials' ? 'bg-primary text-white' :
                STEPS.indexOf(currentStep as Step) > 2 ? 'bg-green-500 text-white' : 'bg-slate-200'
              }`}>
                {STEPS.indexOf(currentStep as Step) > 2 ? <CheckCircle className="h-5 w-5" /> : <Award className="h-5 w-5" />}
              </div>
              <span className="text-2xs font-medium text-center">Credentials</span>
            </div>

            <div className={`h-1 w-14 rounded ${STEPS.indexOf(currentStep as Step) > 2 ? 'bg-green-500' : 'bg-slate-200'}`} />

            {/* Step 4: Complete */}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                currentStep === 'complete' ? 'bg-green-500 text-white' : 'bg-slate-200'
              }`}>
                <CheckCircle className="h-5 w-5" />
              </div>
              <span className="text-2xs font-medium text-center">Complete</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Step Content */}
      <Card dense>
        <CardBody className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Company Info Step */}
          {currentStep === 'company' && (
            <form onSubmit={handleCompanySubmit} className="space-y-5" key={`company-form-${company.name}-${company.lei}`}>
              <div>
                <h2 className="h3 mb-1">Company Information</h2>
                <p className="text-2xs text-muted-foreground mb-4">
                  Enter your company details to receive a Legal Entity (LE) vLEI credential.
                </p>

                {/* Demo Data Section */}
                <div className="banner banner-info mb-5">
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Demo Mode
                  </h3>
                  <p className="text-2xs text-muted-foreground mb-2">
                    For demonstration purposes, you can load sample company data.
                  </p>
                  
                  <div className="flex gap-2 mb-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => loadDemoData()}
                      className="text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Load Random Demo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDemoOptions(!showDemoOptions)}
                      className="text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      {showDemoOptions ? 'Hide' : 'Show'} All Options
                    </Button>
                  </div>

                  {showDemoOptions && (
                    <div className="space-y-1.5">
                      {demoCompanies.map((demo, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => loadDemoData(index)}
                          className="w-full text-left p-2 bg-white border border-blue-200 rounded hover:bg-blue-50 transition-colors text-2xs"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-medium text-slate-900 leading-tight">{demo.name}</p>
                              <p className="text-2xs text-slate-600 mt-1">LEI: {demo.lei}</p>
                              <p className="text-2xs text-slate-600">Rep: {demo.representative.name} ({demo.representative.role})</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label htmlFor="companyName" className="block text-xs font-medium mb-1">
                      Company Name *
                    </label>
                    <input
                      id="companyName"
                      name="companyName"
                      type="text"
                      required
                      defaultValue={company.name}
                      className="input w-full"
                      placeholder="Acme Corporation"
                    />
                  </div>

                  <div>
                    <label htmlFor="lei" className="block text-xs font-medium mb-1">
                      Legal Entity Identifier (LEI) *
                    </label>
                    <input
                      id="lei"
                      name="lei"
                      type="text"
                      required
                      defaultValue={company.lei}
                      className="input w-full"
                      placeholder="875500ELOZEL05BVXV37"
                      pattern="[A-Z0-9]{20}"
                      title="LEI must be 20 alphanumeric characters"
                    />
                    <p className="text-2xs text-muted-foreground mt-1">
                      20-character alphanumeric identifier
                    </p>
                  </div>

                  <div>
                    <label htmlFor="jurisdiction" className="block text-xs font-medium mb-1">
                      Jurisdiction *
                    </label>
                    <input
                      id="jurisdiction"
                      name="jurisdiction"
                      type="text"
                      required
                      defaultValue={company.jurisdiction}
                      className="input w-full"
                      placeholder="United Arab Emirates"
                    />
                  </div>

                  <div className="border-t pt-3 mt-3">
                    <h3 className="text-xs font-semibold mb-2">Authorized Representative</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="representativeName" className="block text-xs font-medium mb-1">
                          Full Legal Name *
                        </label>
                        <input
                          id="representativeName"
                          name="representativeName"
                          type="text"
                          required
                          defaultValue={company.representativeName}
                          className="input w-full"
                          placeholder="Fatima Al-Qasimi"
                        />
                      </div>

                      <div>
                        <label htmlFor="representativeEmail" className="block text-xs font-medium mb-1">
                          Email Address *
                        </label>
                        <input
                          id="representativeEmail"
                          name="representativeEmail"
                          type="email"
                          required
                          defaultValue={company.representativeEmail}
                          className="input w-full"
                          placeholder="fatima@company.com"
                        />
                      </div>

                      <div>
                        <label htmlFor="officialRole" className="block text-xs font-medium mb-1">
                          Official Role *
                        </label>
                        <select
                          id="officialRole"
                          name="officialRole"
                          required
                          defaultValue={company.officialRole || ''}
                          className="input w-full"
                        >
                          <option value="">Select role...</option>
                          <option value="CFO">Chief Financial Officer (CFO)</option>
                          <option value="CEO">Chief Executive Officer (CEO)</option>
                          <option value="LAR">Legal Authorized Representative (LAR)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Issuing LE Credential...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* eKYB Verification Step */}
          {currentStep === 'ekyb' && (
            <div className="space-y-5">
              <div>
                <h2 className="h3 mb-1">eKYB Verification</h2>
                <p className="text-2xs text-muted-foreground mb-4">
                  Simulating electronic Know Your Business (eKYB) verification process for {company.name}.
                </p>

                <div className="banner banner-info mb-4">
                  <p className="text-xs font-medium mb-1">Demo Mode</p>
                  <p className="text-2xs text-muted-foreground">
                    This is a simulated eKYB verification. In production, this would verify LEI validity, jurisdiction compliance, and representative authorization.
                  </p>
                </div>

                <div className="border border-border rounded-lg p-3 space-y-2 bg-white">
                  <h3 className="font-medium text-xs mb-1">Company Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-2xs">
                    <div>
                      <p className="text-muted-foreground">Legal Entity</p>
                      <p className="font-medium">{company.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">LEI</p>
                      <p className="font-mono text-xs">{company.lei}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Jurisdiction</p>
                      <p className="font-medium">{company.jurisdiction}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Representative</p>
                      <p className="font-medium">{company.representativeName}</p>
                    </div>
                  </div>
                </div>

                <div className="border border-border rounded-lg p-3 bg-white">
                  <h3 className="font-medium text-xs mb-2">Documents Being Verified</h3>
                  <div className="space-y-1.5 text-2xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <p className="text-sm">Commercial Trade License</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <p className="text-sm">Certificate of Incorporation</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <p className="text-sm">Signed Articles of Association</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <p className="text-sm">UBO Passport / ID</p>
                    </div>
                  </div>
                </div>

                {ekybVerified && (
                  <div className="banner banner-success">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <p className="text-xs font-medium">Verification Complete</p>
                    </div>
                    <p className="text-2xs text-muted-foreground mt-1">
                      Company information has been verified. You can now proceed to issue credentials.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between gap-3">
                <Button type="button" variant="outline" onClick={handleBack} disabled={isLoading}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                {!ekybVerified ? (
                  <Button type="button" onClick={handleEkybSubmit} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Start Verification
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button type="button" onClick={() => setStep('credentials')}>
                    Continue to Credentials
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Credentials Issuance Step */}
          {currentStep === 'credentials' && (
            <div className="space-y-5">
              <div>
                <h2 className="h3 mb-1">Issue vLEI Credentials</h2>
                <p className="text-2xs text-muted-foreground mb-4">
                  Issue Legal Entity (LE) and Official Role credentials for your organization.
                </p>

                <div className="border border-border rounded-lg p-3 space-y-3 bg-white">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-xs mb-0.5">Legal Entity (LE) Credential</h3>
                      <p className="text-2xs text-muted-foreground">
                        Establishes the legal identity of {company.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Award className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-xs mb-0.5">Official Role Credential</h3>
                      <p className="text-2xs text-muted-foreground">
                        Grants {company.officialRole} authority to {company.representativeName}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="banner banner-warning">
                  <p className="text-xs font-medium mb-1">Ready to Issue</p>
                  <p className="text-2xs text-muted-foreground">
                    This will issue both credentials to your identity. This process cannot be reversed.
                  </p>
                </div>
              </div>

              <div className="flex justify-between gap-3">
                <Button type="button" variant="outline" onClick={handleBack} disabled={isLoading}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button type="button" onClick={handleCredentialsSubmit} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Issuing Credentials...
                    </>
                  ) : (
                    <>
                      Issue Credentials
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {currentStep === 'complete' && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="h3 mb-1">Onboarding Complete!</h2>
                <p className="text-2xs text-muted-foreground mb-4">
                  Your vLEI credentials have been successfully issued.
                </p>
              </div>

              {/* Summary Details */}
              <div className="space-y-3 max-w-2xl mx-auto">
                {/* Organization Summary */}
                <div className="border border-border rounded-lg p-3 bg-white">
                  <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    Organization Details
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-2xs">
                    <div>
                      <p className="text-muted-foreground text-xs">Legal Entity</p>
                      <p className="font-medium">{company.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">LEI</p>
                      <p className="font-mono text-xs">{company.lei}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Jurisdiction</p>
                      <p className="font-medium">{company.jurisdiction}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Representative</p>
                      <p className="font-medium">{company.representativeName}</p>
                    </div>
                  </div>
                </div>

                {/* vLEI Credentials */}
                <div className="border border-border rounded-lg p-3 bg-white">
                  <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
                    <Award className="h-4 w-4 text-purple-600" />
                    vLEI Credentials
                  </h3>
                  <div className="space-y-1.5 text-2xs">
                    <div className="flex items-start gap-2 p-2 bg-green-50 rounded">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-green-900">Legal Entity (LE) Credential</p>
                        <p className="text-xs text-green-700">Schema: {SCHEMAS.LE}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                      <div className="h-4 w-4 border-2 border-gray-400 rounded-full mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-600">Official Role Credential</p>
                        <p className="text-xs text-gray-500">Coming Soon</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* QVI Issuer Information */}
                <div className="border border-border rounded-lg p-3 bg-white">
                  <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-indigo-600" />
                    Principia Trust Issuer (QVI)
                  </h3>
                  <div className="space-y-2 text-2xs">
                    <div>
                      <p className="text-muted-foreground text-xs">Issuer Name</p>
                      <p className="font-medium">{qviIssuer.name || 'Principia Trust Issuer'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Principia Issuer AID</p>
                      {qviIssuer.aid ? (
                        <p className="font-mono text-xs break-all bg-indigo-50 p-2 rounded border border-indigo-200">
                          {qviIssuer.aid}
                        </p>
                      ) : (
                        <p className="text-muted-foreground text-xs italic">Fetching...</p>
                      )}
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Service URL:</span> {ISSUER_API}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Identity Information */}
                <div className="banner banner-info">
                  <h3 className="text-xs font-semibold mb-1">Credential Holder (You)</h3>
                  <div className="space-y-1.5 text-2xs">
                    <div>
                      <p className="text-blue-700 text-xs">Your AID</p>
                      <p className="font-mono text-xs text-blue-900 break-all bg-blue-100 p-2 rounded border border-blue-200">{identityWallet.aid}</p>
                    </div>
                    {identityWallet.name && (
                      <div>
                        <p className="text-blue-700 text-xs">Name</p>
                        <p className="font-medium">{identityWallet.name}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-center space-y-2">
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => setShowDetailsModal(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    View Complete vLEI Details
                  </Button>
                  <Button onClick={handleComplete}>
                    Go to Home
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Complete vLEI Details Modal */}
      <Modal 
        isOpen={showDetailsModal} 
        onClose={() => setShowDetailsModal(false)}
        title="Complete vLEI Credential Details"
        maxWidth="2xl"
      >
        <div className="space-y-5 text-2xs leading-tight">
          {/* Credential Summary */}
          <div>
            <h3 className="text-2xs font-semibold mb-1 text-gray-900 tracking-wide">Credential Summary</h3>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-2xs text-tertiary mb-0.5">Credential Type</p>
                  <p className="text-2xs font-medium">Legal Entity vLEI Credential</p>
                </div>
                <div>
                  <p className="text-2xs text-tertiary mb-0.5">Status</p>
                  <p className="text-2xs font-medium text-green-600">✓ Issued</p>
                </div>
                <div>
                  <p className="text-2xs text-tertiary mb-0.5 flex items-center justify-between">
                    <span>Schema SAID</span>
                    <button
                      type="button"
                      onClick={handleCopySchema}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border bg-white hover:bg-slate-100 text-[10px] font-medium transition"
                      title="Copy schema SAID"
                    >
                      {copiedSchema ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                      {copiedSchema ? 'Copied' : 'Copy'}
                    </button>
                  </p>
                  <p className="font-mono text-2xs break-all">{SCHEMAS.LE}</p>
                </div>
                <div>
                  <p className="text-2xs text-tertiary mb-0.5">Issue Date</p>
                  <p className="text-2xs font-medium">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Legal Entity Details */}
          <div>
            <h3 className="text-2xs font-semibold mb-1 text-gray-900 tracking-wide">Legal Entity Information</h3>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-2xs text-tertiary mb-0.5">Legal Name</p>
                  <p className="text-2xs font-medium">{company.name}</p>
                </div>
                <div>
                  <p className="text-2xs text-tertiary mb-0.5">LEI</p>
                  <p className="font-mono text-2xs break-all">{company.lei}</p>
                </div>
                <div>
                  <p className="text-2xs text-tertiary mb-0.5">Jurisdiction</p>
                  <p className="text-2xs font-medium">{company.jurisdiction}</p>
                </div>
                <div>
                  <p className="text-2xs text-tertiary mb-0.5">Representative</p>
                  <p className="text-2xs font-medium">{company.representativeName}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Credential Holder */}
          <div>
            <h3 className="text-2xs font-semibold mb-1 text-gray-900 tracking-wide">Credential Holder</h3>
            <div className="bg-blue-50 rounded-lg p-3 space-y-1.5">
              <div>
                <p className="text-2xs text-blue-700 mb-0.5">Holder AID</p>
                <p className="font-mono text-2xs text-blue-900 break-all">{identityWallet.aid}</p>
              </div>
              {identityWallet.name && (
                <div>
                  <p className="text-2xs text-blue-700 mb-0.5">Holder Name</p>
                  <p className="text-2xs font-medium text-blue-900">{identityWallet.name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Issuer Information */}
          <div>
            <h3 className="text-2xs font-semibold mb-1 text-gray-900 tracking-wide">Issuer Information</h3>
            <div className="bg-indigo-50 rounded-lg p-3 space-y-1.5">
              <div>
                <p className="text-2xs text-indigo-700 mb-0.5">Issuer Name</p>
                <p className="text-2xs font-medium text-indigo-900">{qviIssuer.name || 'Principia Trust Issuer'}</p>
              </div>
              {qviIssuer.aid && (
                <div>
                  <p className="text-2xs text-indigo-700 mb-0.5">Issuer AID</p>
                  <p className="font-mono text-2xs text-indigo-900 break-all">{qviIssuer.aid}</p>
                </div>
              )}
              <div>
                <p className="text-2xs text-indigo-700 mb-0.5">Service Endpoint</p>
                <p className="font-mono text-2xs text-indigo-900 break-all">{ISSUER_API}</p>
              </div>
            </div>
          </div>

          {/* Schema Information */}
          <div>
            <h3 className="text-2xs font-semibold mb-1 text-gray-900 tracking-wide">Schema Information</h3>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
              <div>
                <p className="text-2xs text-tertiary mb-0.5">Schema Title</p>
                <p className="text-2xs font-medium">Legal Entity vLEI Credential</p>
              </div>
              <div>
                <p className="text-2xs text-tertiary mb-0.5">Credential Type</p>
                <p className="text-2xs font-medium">LegalEntityvLEICredential</p>
              </div>
              <div>
                <p className="text-2xs text-tertiary mb-0.5">Version</p>
                <p className="text-2xs font-medium">1.0.0</p>
              </div>
              <div>
                <p className="text-2xs text-tertiary mb-0.5">Schema Description</p>
                <p className="text-2xs">A vLEI Credential issued by a Qualified vLEI issuer to a Legal Entity</p>
              </div>
            </div>
          </div>

          {/* Credential Attributes */}
          <div>
            <h3 className="text-2xs font-semibold mb-1 text-gray-900 tracking-wide">Credential Attributes</h3>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
              <div>
                <p className="text-2xs text-tertiary mb-0.5">Legal Entity Identifier (LEI)</p>
                <p className="font-mono text-2xs break-all">{company.lei}</p>
                <p className="text-2xs text-tertiary mt-0.5">Format: ISO 17442</p>
              </div>
              <div>
                <p className="text-2xs text-tertiary mb-0.5">Issuer AID (i)</p>
                <p className="font-mono text-2xs break-all">{identityWallet.aid}</p>
              </div>
              <div>
                <p className="text-2xs text-tertiary mb-0.5">Issuance Date Time (dt)</p>
                <p className="font-mono text-2xs">{new Date().toISOString()}</p>
              </div>
            </div>
          </div>

          {/* Official Disclaimers */}
          <div>
            <h3 className="text-2xs font-semibold mb-1 text-gray-900 tracking-wide">Official vLEI Disclaimers</h3>
            
            {/* Usage Disclaimer */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
              <p className="text-xs font-semibold text-yellow-900 mb-1">Usage Disclaimer</p>
              <p className="text-2xs text-yellow-800 leading-relaxed">
                Usage of a valid, unexpired, and non-revoked vLEI Credential, as defined in the associated 
                Ecosystem Governance Framework, does not assert that the Legal Entity is trustworthy, honest, 
                reputable in its business dealings, safe to do business with, or compliant with any laws or 
                that an implied or expressly intended purpose will be fulfilled.
              </p>
            </div>

            {/* Issuance Disclaimer */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-900 mb-1">Issuance Disclaimer</p>
              <p className="text-2xs text-blue-800 leading-relaxed">
                All information in a valid, unexpired, and non-revoked vLEI Credential, as defined in the 
                associated Ecosystem Governance Framework, is accurate as of the date the validation process 
                was complete. The vLEI Credential has been issued to the legal entity or person named in the 
                vLEI Credential as the subject; and the qualified vLEI Issuer exercised reasonable care to 
                perform the validation process set forth in the vLEI Ecosystem Governance Framework.
              </p>
            </div>
          </div>

          {/* Credential Structure */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-900">Complete Credential Structure</h3>
              <button
                type="button"
                onClick={handleCopyJson}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border bg-white hover:bg-slate-100 text-[10px] font-medium transition"
                title="Copy credential JSON"
              >
                {copiedJson ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                {copiedJson ? 'Copied' : 'Copy JSON'}
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <pre className="text-2xs font-mono whitespace-pre-wrap break-all text-gray-800">
{JSON.stringify(buildCredentialJson(), null, 2)}
              </pre>
            </div>
          </div>

          {/* Verification Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs font-medium text-green-900 mb-1">✓ Verification Status</p>
            <p className="text-2xs text-green-800">
              This vLEI credential has been successfully issued and is cryptographically signed by the Principia Trust Issuer. 
              The credential follows the vLEI Ecosystem Governance Framework and can be verified using KERI infrastructure.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
