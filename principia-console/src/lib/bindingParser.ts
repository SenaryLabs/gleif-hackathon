import { decode, encode } from 'cbor-x';
import { Buffer } from 'buffer';

export interface ParsedCardanoSignature {
  sigStructure: string;
  signature: string;
  publicKey: string;
}

export interface ParsedKeriSignature {
  signature: string;
  prefix: string;
  algorithm: string;
  rawSignature: string;
}

function hexToBytes(hex: string): Uint8Array {
  if (!hex || hex.length % 2 !== 0) throw new Error('Invalid hex');
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

function toHex(bytes: Uint8Array | Buffer): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function base64UrlDecode(b64u: string): Uint8Array {
  let b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

export function parseCardanoSignature(coseSign1Hex: string, coseKeyHex?: string): ParsedCardanoSignature {
  const bytes = hexToBytes(coseSign1Hex);
  const decoded = decode(bytes);
  if (!Array.isArray(decoded) || decoded.length !== 4) throw new Error('Invalid COSE_Sign1');
  const [protectedHeader, , payload, sigBytes] = decoded;
  const sigStructure = ["Signature1", Buffer.from(protectedHeader || []), Buffer.from([]), Buffer.from(payload)];
  const sigStructHex = Buffer.from(encode(sigStructure)).toString('hex');
  const signatureHex = toHex(sigBytes);
  let publicKey = '';
  if (coseKeyHex) {
    try {
      const key = decode(hexToBytes(coseKeyHex));
      if (key && typeof key === 'object' && '-2' in key) publicKey = toHex(key['-2']);
    } catch {/* ignore */}
  }
  return { sigStructure: sigStructHex, signature: signatureHex, publicKey };
}

export function parseKeriSignature(keriSig: string): ParsedKeriSignature {
  if (!keriSig.startsWith('0B')) throw new Error('Unsupported CESR code');
  const data = keriSig.substring(2);
  const bytes = base64UrlDecode(data);
  if (bytes.length !== 64) throw new Error('Invalid signature length');
  return { signature: toHex(bytes), prefix: '0B', algorithm: 'Ed25519', rawSignature: keriSig };
}
