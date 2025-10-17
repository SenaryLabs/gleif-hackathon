import { parseCardanoSignature, parseKeriSignature } from './bindingParser';
import { Bech32Utils } from './bech32Utils';
import { config } from './config';

export interface BindingStepDebug {
  step: string;
  message: string;
  meta?: any;
  error?: string;
}

export interface BindingFlowResult {
  success: boolean;
  bindingSAID?: string;
  issuerIxnSAID?: string;
  cardanoPublicKey?: string;
  kelSigningKey?: string;
  cardanoSignature?: string;
  keriSignature?: string;
  metrics?: {
    cardanoSignatureBytes?: number;
    cardanoPublicKeyBytes?: number;
    keriSignatureBytes?: number;
    kelSigningKeyBytes?: number;
  };
  steps: BindingStepDebug[];
  error?: string;
}

export async function getKELKeyState(aid: string, retries: number = 2): Promise<{ currentSigningKeyHex?: string } | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`KEL key-state attempt ${attempt + 1}/${retries + 1} for AID: ${aid}`);
      const res = await fetch(`${config.issuer.apiUrl}/kel/key-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aid })
      });
      
      if (!res.ok) {
        console.error(`KEL key-state request failed: ${res.status} ${res.statusText}`);
        if (attempt < retries) {
          console.log(`Retrying in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        return null;
      }
      
      const result = await res.json();
      console.log('KEL key-state response:', result);
      return result;
    } catch (error) {
      console.error(`KEL key-state request error (attempt ${attempt + 1}):`, error);
      if (attempt < retries) {
        console.log(`Retrying in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      return null;
    }
  }
  return null;
}

export function createCanonicalMessage(aid: string, bech32Address: string) {
  return `BIND|v1|${aid}|${bech32Address}`;
}

async function ensureBech32(address: string): Promise<string> {
  if (address.startsWith('addr_')) return address;
  return await Bech32Utils.toBech32(address);
}

export async function performBindingFlow(params: {
  aid: string;
  walletApi: any;
  walletAddress: string;
  issuerName?: string;
}): Promise<BindingFlowResult> {
  const steps: BindingStepDebug[] = [];
  function log(step: string, message: string, meta?: any) { steps.push({ step, message, meta }); }
  function fail(step: string, message: string, error?: string): BindingFlowResult {
    steps.push({ step, message, error });
    return { success: false, steps, error: error || message };
  }

  const { aid, walletApi, walletAddress, issuerName = config.issuer.name } = params;

  if (!aid) return fail('init', 'Missing AID');
  if (!walletApi || !walletAddress) return fail('init', 'Wallet not connected');

  try {
    log('address', 'Normalizing wallet address', { walletAddress });
    const bech32Address = await ensureBech32(walletAddress);

    log('kel', 'Fetching KEL signing key');
    const kel = await getKELKeyState(aid);
    if (!kel) {
      return fail('kel', 'Failed to fetch KEL state from issuer. Check if issuer is running and AID is valid.');
    }
    if (!kel.currentSigningKeyHex) {
      return fail('kel', 'KEL signing key not found. The AID may not have been properly initialized with the issuer.');
    }

    const canonicalMessage = createCanonicalMessage(aid, bech32Address);
    log('canonical', 'Canonical message created', { canonicalMessage });

    // CIP-30 signData expects hex payload (CIP-8). Convert canonical message to hex.
    if (!walletApi.signData) return fail('cardanoSign', 'Wallet signData not available');
    const messageHex = Array.from(new TextEncoder().encode(canonicalMessage)).map(b => b.toString(16).padStart(2, '0')).join('');
    log('cardanoSign', 'Signing canonical message with Cardano wallet', { messageHexBytes: messageHex.length / 2 });
    let signatureResponse: any;
    try {
      signatureResponse = await walletApi.signData(bech32Address, messageHex);
    } catch (e) {
      return fail('cardanoSign', 'Cardano signData failed', (e as Error).message);
    }

    // Extract possible signature + public key heuristically
    let cardanoSignature: string;
    if (typeof signatureResponse === 'string') cardanoSignature = signatureResponse;
    else if (signatureResponse?.signature) cardanoSignature = signatureResponse.signature;
    else if (signatureResponse?.signedMessage) cardanoSignature = signatureResponse.signedMessage;
    else cardanoSignature = JSON.stringify(signatureResponse);

    // Attempt to extract public key from typical CIP-8 structure
    let cardanoPublicKey: string | undefined;
    const extractPubKey = (resp: any): string | undefined => {
      if (!resp) return undefined;
      const keyField = resp.key || resp.publicKey || resp.pubkey;
      if (typeof keyField === 'string') {
        const pattern = /215820([0-9a-fA-F]{64})/; // CBOR slice: 0x21 58 20 <32 bytes>
        const match = keyField.match(pattern);
        if (match) return match[1];
        if (/^[0-9a-fA-F]{64}$/.test(keyField)) return keyField;
      }
      return undefined;
    };
    cardanoPublicKey = extractPubKey(signatureResponse);
    if (cardanoPublicKey) log('cardanoPubKey', 'Extracted Cardano public key', { cardanoPublicKey });
    else log('cardanoPubKeyWarn', 'Could not extract Cardano public key');

    log('cardanoParse', 'Parsing Cardano signature');
    try { parseCardanoSignature(cardanoSignature); } catch (e) { log('cardanoParseWarn', 'Could not fully parse signature', { error: (e as Error).message }); }

    // Enforce CIP-45 KERI signing (no fallback)
    let keriSignature: string | null = null;
    if (typeof window !== 'undefined' && (window as any).cardano?.idw_p2p) {
      try {
        log('keriSign', 'Attempting KERI signature via CIP-45');
        const keriApi = (window as any).cardano.idw_p2p;
        if (keriApi.isEnabled && await keriApi.isEnabled()) {
          const enabled = await keriApi.enable();
          if (enabled.experimental?.signKeri) {
            keriSignature = await enabled.experimental.signKeri(aid, canonicalMessage);
          } else {
            return fail('keriSign', 'CIP-45 signKeri method not available');
          }
        } else {
          return fail('keriSign', 'CIP-45 channel not enabled');
        }
      } catch (e) {
        return fail('keriSign', 'CIP-45 signing failed', (e as Error).message);
      }
    } else {
      return fail('keriSign', 'CIP-45 interface (cardano.idw_p2p) not present');
    }

    // Parse KERI signature (best-effort) — still log warnings without failing the whole flow
    if (keriSignature) {
      try { 
        parseKeriSignature(keriSignature); 
        log('keriParse', 'Parsed KERI signature'); 
      } catch (e) { 
        log('keriParseWarn', 'Failed to parse KERI signature', { error: (e as Error).message }); 
      }
    }

    // Metrics step
    const metrics = {
      cardanoSignatureBytes: cardanoSignature ? Math.floor(cardanoSignature.length / 2) : undefined,
      cardanoPublicKeyBytes: cardanoPublicKey ? Math.floor(cardanoPublicKey.length / 2) : undefined,
      keriSignatureBytes: keriSignature ? Math.floor(keriSignature.length / 2) : undefined,
      kelSigningKeyBytes: kel.currentSigningKeyHex ? Math.floor(kel.currentSigningKeyHex.length / 2) : undefined,
    };
    log('metrics', 'Collected cryptographic component sizes (bytes)', metrics);

    // Submit binding
    const submission = {
      holderAID: aid,
      cardanoAddress: bech32Address,
      cardanoPublicKey: cardanoPublicKey || '',
      canonicalMessage,
      cardanoSignature,
      veridianSignature: keriSignature,
      kelSigningKey: kel.currentSigningKeyHex,
      issuerName
    };
    log('submit', 'Submitting binding to issuer', { endpoint: '/kel/binding/create' });

    const res = await fetch(`${config.issuer.apiUrl}/kel/binding/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission)
    });
    if (!res.ok) return fail('submit', `Issuer rejected binding (${res.status})`);
    const result = await res.json();
    log('done', 'Binding complete', result);

    return {
      success: true,
      bindingSAID: result.bindingSAID,
      issuerIxnSAID: result.issuerIxnSAID,
      kelSigningKey: kel.currentSigningKeyHex,
      cardanoPublicKey,
      cardanoSignature,
      keriSignature: keriSignature || undefined,
      metrics,
      steps
    };
  } catch (e) {
    return fail('unexpected', 'Unexpected error', (e as Error).message);
  }
}
