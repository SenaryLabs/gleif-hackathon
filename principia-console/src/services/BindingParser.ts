/**
 * KERI-Cardano Binding Message Parser (Browser-Compatible)
 * 
 * This utility extracts and processes cryptographic components from binding messages
 * for on-chain validation. It follows the proven CIP-8 pattern for Sig_structure
 * extraction and adds KERI signature decoding.
 * 
 * Key Functions:
 * 1. parseCardanoSignature() - Extract Sig_structure from COSE_Sign1
 * 2. parseKeriSignature() - Decode Base64URL KERI signature
 * 3. extractPublicKeyFromAid() - Extract Ed25519 key from KERI AID
 * 
 * Browser-compatible version using:
 * - cbor-x for CBOR encoding/decoding
 * - Buffer polyfill for Node.js Buffer compatibility
 */

import { decode, encode } from 'cbor-x';
import { Buffer } from 'buffer';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ParsedCardanoSignature {
  sigStructure: string;               // Hex-encoded Sig_structure
  signature: string;                  // 64-byte Ed25519 signature (hex)
  publicKey: string;                  // 32-byte Ed25519 public key (hex)
}

export interface ParsedKeriSignature {
  signature: string;                  // 64-byte Ed25519 signature (hex)
  prefix: string;                     // KERI signature type code
  algorithm: string;                  // Signature algorithm (Ed25519, etc.)
  rawSignature: string;               // Original Base64URL signature
}

export interface ParsedKeriAid {
  publicKey: string;                  // 32-byte Ed25519 public key (hex)
  prefix: string;                     // KERI AID prefix (E = basic)
  derivationCode: string;             // Derivation code (D = Ed25519)
  algorithm: string;                  // Key algorithm
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error(`Invalid hex string: odd length (${hex.length})`);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
function toHex(bytes: Uint8Array | Buffer): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Base64URL decode (KERI uses Base64URL encoding)
 * 
 * Base64URL: Like Base64 but uses - instead of + and _ instead of /
 * and omits padding (=)
 */
function base64UrlDecode(base64Url: string): Uint8Array {
  // Replace Base64URL chars with standard Base64
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  
  // Add padding if needed
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  
  // Decode to binary string
  const binaryString = atob(base64);
  
  // Convert to Uint8Array
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
}

// ============================================================================
// Cardano Signature Parsing (CIP-8 COSE_Sign1)
// ============================================================================

/**
 * Parse Cardano signature and extract Sig_structure
 * 
 * This follows the CIP-8 pattern for extracting the Sig_structure that
 * the wallet actually signed. The Sig_structure is what gets verified
 * on-chain by the validator.
 * 
 * COSE_Sign1 Structure: [protectedHeader, unprotectedHeader, payload, signature]
 * Sig_structure: ["Signature1", protectedHeader, h'', payload]
 * 
 * @param coseSign1Hex - COSE_Sign1 structure as hex string
 * @param coseKeyHex - Optional COSE_Key for public key extraction
 * @returns Parsed signature components
 */
export function parseCardanoSignature(
  coseSign1Hex: string,
  coseKeyHex?: string
): ParsedCardanoSignature {
  console.log('📦 Parsing Cardano COSE_Sign1...');
  
  // Step 1: Decode COSE_Sign1
  const coseSign1Bytes = hexToBytes(coseSign1Hex);
  const coseSign1 = decode(coseSign1Bytes);
  
  if (!Array.isArray(coseSign1) || coseSign1.length !== 4) {
    throw new Error(
      `Invalid COSE_Sign1: expected array of 4 elements, got ${coseSign1?.length}`
    );
  }
  
  const [protectedHeader, , payload, signatureBytes] = coseSign1;
  
  console.log('   ✅ COSE_Sign1 decoded');
  console.log(`      Protected Header: ${protectedHeader ? protectedHeader.length : 0} bytes`);
  console.log(`      Payload: ${payload ? payload.length : 0} bytes`);
  console.log(`      Signature: ${signatureBytes ? signatureBytes.length : 0} bytes`);
  
  // Step 2: Rebuild Sig_structure (CRITICAL: Use Buffer!)
  // This is what the wallet actually signed
  const sigStructure = [
    "Signature1",                                              // Context string
    Buffer.isBuffer(protectedHeader) 
      ? protectedHeader 
      : Buffer.from(protectedHeader || []),                   // Protected headers
    Buffer.from([]),                                          // external_aad (empty)
    Buffer.isBuffer(payload) 
      ? payload 
      : Buffer.from(payload)                                  // Message payload
  ];
  
  const sigStructureBytes = encode(sigStructure);
  const sigStructureBuffer = Buffer.isBuffer(sigStructureBytes)
    ? sigStructureBytes
    : Buffer.from(sigStructureBytes);
  const sigStructureHex = sigStructureBuffer.toString('hex');
  
  console.log('   ✅ Sig_structure built');
  console.log(`      Length: ${sigStructureBuffer.length} bytes`);
  console.log(`      Hex: ${sigStructureHex.substring(0, 32)}...`);
  
  // Step 3: Extract signature
  const signatureHex = toHex(signatureBytes);
  
  if (signatureHex.length !== 128) {
    throw new Error(
      `Invalid Ed25519 signature length: ${signatureHex.length} (expected 128 hex chars = 64 bytes)`
    );
  }
  
  console.log('   ✅ Signature extracted');
  console.log(`      Length: 64 bytes`);
  console.log(`      Hex: ${signatureHex.substring(0, 32)}...`);
  
  // Step 4: Extract public key from COSE_Key (if provided)
  let publicKeyHex = "";
  
  if (coseKeyHex) {
    try {
      const coseKeyBytes = hexToBytes(coseKeyHex);
      const coseKey = decode(coseKeyBytes);
      
      if (coseKey && typeof coseKey === 'object' && '-2' in coseKey) {
        const publicKeyBuffer = coseKey['-2'];
        publicKeyHex = toHex(publicKeyBuffer);
        
        if (publicKeyHex.length === 64) {
          console.log('   ✅ Public key extracted from COSE_Key');
          console.log(`      Length: 32 bytes`);
          console.log(`      Hex: ${publicKeyHex.substring(0, 32)}...`);
        }
      }
    } catch {
      console.log('   ℹ️  Could not extract public key from COSE_Key');
    }
  }
  
  return {
    sigStructure: sigStructureHex,
    signature: signatureHex,
    publicKey: publicKeyHex,
  };
}

// ============================================================================
// KERI Signature Parsing
// ============================================================================

/**
 * Parse KERI signature from CESR format
 * 
 * CRITICAL DISCOVERY: Veridian wallet returns NON-INDEXED signatures (Cigar)!
 * 
 * The wallet calls: signer.sign(payload) with NO INDEX parameter
 * This returns a Cigar (Matter class) with code '0B', NOT a Siger (Indexer class)!
 * 
 * Matter code '0B' (MtrDex.Ed25519_Sig):
 * - Total length: 88 chars
 * - Code: 2 chars ('0B')
 * - Signature: 86 chars base64url (encodes to 64 bytes)
 * - Structure: '0B' + base64url(64_byte_signature)
 * 
 * This is DIFFERENT from Indexer code '0B' (IdrDex.Ed448_Crt_Sig) which would be 156 chars!
 * 
 * We simply need to:
 * 1. Strip the 2-char code '0B'
 * 2. Decode the remaining 86 chars to get 64 bytes
 * 
 * @param keriSig - KERI signature string (CESR format with code prefix)
 * @returns Parsed signature components
 */
export function parseKeriSignature(keriSig: string): ParsedKeriSignature {
  console.log('🔐 Parsing KERI signature (CESR format)...');
  console.log(`   Input: ${keriSig.substring(0, 20)}...${keriSig.substring(keriSig.length - 20)}`);
  console.log(`   Length: ${keriSig.length}`);
  
  if (!keriSig || keriSig.length < 88) {
    throw new Error(`Invalid KERI signature: too short (${keriSig?.length}, expected 88 for Ed25519)`);
  }
  
  // Veridian wallet returns Matter code '0B' (non-indexed Cigar)
  if (keriSig.startsWith('0B')) {
    console.log(`   Format: Matter code '0B' (NON-indexed Cigar)`);
    console.log(`   Structure: '0B' (2 chars) + signature (86 chars) = 88 total`);
    
    // Skip the 2-char code '0B'
    const signatureData = keriSig.substring(2);
    console.log(`   Signature data length: ${signatureData.length} chars`);
    
    // Decode from base64url - should give us exactly 64 bytes
    const signatureBytes = base64UrlDecode(signatureData);
    console.log(`   Decoded to ${signatureBytes.length} bytes`);
    
    if (signatureBytes.length !== 64) {
      throw new Error(`Invalid Ed25519 signature length: expected 64 bytes, got ${signatureBytes.length}`);
    }
    
    // Convert to hex
    const signatureHex = toHex(signatureBytes);
    
    console.log('   ✅ KERI signature decoded successfully');
    console.log(`      Length: 64 bytes (Ed25519)`);
    console.log(`      Hex: ${signatureHex.substring(0, 32)}...${signatureHex.substring(signatureHex.length - 32)}`);
  
    return {
      signature: signatureHex,
      prefix: '0B',
      algorithm: 'Ed25519 (Matter code, non-indexed)',
      rawSignature: keriSig,
    };
  } else {
    throw new Error(`Unsupported CESR code: ${keriSig.substring(0, 2)}`);
  }
}

// ============================================================================
// KERI AID Public Key Extraction
// ============================================================================

/**
 * Extract Ed25519 public key from KERI AID
 * 
 * KERI AID Format: <prefix><derivation_code><base64url_key>
 * Example: "EDr7pprL3UJ_aoi3wz8wX4I75BUgpanhQdcBbTNb7UCV"
 * 
 * Prefix codes:
 * - "E": Basic prefix (single key)
 * 
 * Derivation codes (second character):
 * - "D": Ed25519 non-transferable prefix public signing verification key
 * 
 * @param aid - KERI AID string
 * @returns Parsed AID components with public key
 */
export function extractPublicKeyFromAid(aid: string): ParsedKeriAid {
  console.log('🔑 Extracting public key from KERI AID...');
  
  if (!aid || aid.length < 44) {
    throw new Error(`Invalid KERI AID: too short (${aid?.length})`);
  }
  
  // Extract prefix and derivation code
  const prefix = aid.substring(0, 1);
  const derivationCode = aid.substring(1, 2);
  const base64UrlKey = aid.substring(2);
  
  console.log(`   Prefix: ${prefix}`);
  console.log(`   Derivation Code: ${derivationCode}`);
  
  // Validate prefix
  if (prefix !== 'E') {
    throw new Error(`Unsupported KERI AID prefix: ${prefix}`);
  }
  
  // Determine algorithm from derivation code
  let algorithm: string;
  let expectedLength: number;
  
  switch (derivationCode) {
    case 'D':
      algorithm = 'Ed25519';
      expectedLength = 32;
      break;
    default:
      throw new Error(`Unsupported derivation code: ${derivationCode}`);
  }
  
  console.log(`   Algorithm: ${algorithm}`);
  console.log(`   Expected key length: ${expectedLength} bytes`);
  
  // Decode Base64URL to bytes
  const keyBytes = base64UrlDecode(base64UrlKey);
  
  // Handle padding: Ed25519 keys should be 32 bytes
  let publicKeyBytes: Uint8Array;
  if (keyBytes.length === expectedLength - 1) {
    // Add leading zero byte for padding
    console.log(`   ℹ️  Padding: Got ${keyBytes.length} bytes, adding leading zero`);
    publicKeyBytes = new Uint8Array(expectedLength);
    publicKeyBytes[0] = 0;
    publicKeyBytes.set(keyBytes, 1);
  } else if (keyBytes.length === expectedLength) {
    publicKeyBytes = keyBytes;
  } else {
    throw new Error(
      `Invalid public key length: ${keyBytes.length} bytes (expected ${expectedLength})`
    );
  }
  
  // Convert to hex
  const publicKeyHex = toHex(publicKeyBytes);
  
  console.log('   ✅ Public key extracted');
  console.log(`      Length: ${publicKeyBytes.length} bytes`);
  console.log(`      Hex: ${publicKeyHex.substring(0, 32)}...`);
  
  return {
    publicKey: publicKeyHex,
    prefix,
    derivationCode,
    algorithm,
  };
}

// ============================================================================
// Export all functions
// ============================================================================

export const BindingParser = {
  parseCardanoSignature,
  parseKeriSignature,
  extractPublicKeyFromAid,
};

export default BindingParser;
