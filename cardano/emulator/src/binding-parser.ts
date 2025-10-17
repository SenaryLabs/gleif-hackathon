/**
 * KERI-Cardano Binding Message Parser
 * 
 * This utility extracts and processes cryptographic components from binding messages
 * for on-chain validation. It follows the proven CIP-8 pattern for Sig_structure
 * extraction and adds KERI signature decoding.
 * 
 * Key Functions:
 * 1. parseCardanoSignature() - Extract Sig_structure from COSE_Sign1
 * 2. parseKeriSignature() - Decode Base64URL KERI signature
 * 3. extractPublicKeyFromAid() - Extract Ed25519 key from KERI AID
 * 4. buildBindingRedeemer() - Assemble complete redeemer for validator
 */

import { decode, encode } from "npm:cbor-x";
import { Buffer } from "node:buffer";
import { toHex } from "@evolution-sdk/lucid";

// ============================================================================
// Type Definitions
// ============================================================================

export interface BindingMessage {
  v: string;                          // KERI version
  t: string;                          // Message type
  issuer: string;                     // Issuer KERI AID
  holder: string;                     // Holder KERI AID
  cardanoAddress: string;             // Cardano address
  cardanoPublicKey: string;           // Ed25519 public key (hex or COSE_Key)
  canonicalMessage: string;           // Canonical message text
  signature: {
    cardano: string;                  // COSE_Sign1 structure (hex)
    veridian: string;                 // KERI signature (Base64URL)
  };
  createdAt: string;                  // ISO timestamp
  d: string;                          // KERI digest/identifier
}

export interface ParsedCardanoSignature {
  sigStructure: string;               // Hex-encoded Sig_structure
  sigStructureBytes: Buffer;          // Raw bytes for logging
  signature: string;                  // 64-byte Ed25519 signature (hex)
  publicKey: string;                  // 32-byte Ed25519 public key (hex)
  protectedHeader: Buffer;            // Protected header bytes
  payload: Buffer;                    // Message payload bytes
}

export interface ParsedKeriSignature {
  signature: string;                  // 64-byte Ed25519 signature (hex)
  prefix: string;                     // KERI signature type code
  algorithm: string;                  // Signature algorithm (Ed25519, etc.)
}

export interface ParsedKeriAid {
  publicKey: string;                  // 32-byte Ed25519 public key (hex)
  prefix: string;                     // KERI AID prefix (E = basic)
  derivationCode: string;             // Derivation code (D = Ed25519)
  algorithm: string;                  // Key algorithm
}

export interface BindingRedeemer {
  binding_said: string;
  issuer_aid: string;
  holder_aid: string;
  cardano_address: string;
  cardano_public_key: string;
  sig_structure: string;
  cardano_signature: string;
  canonical_message: string;
  veridian_signature: string;
  holder_public_key: string;
  keri_version: string;
  binding_type: string;
  created_at: bigint;
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
 * Base64URL decode (KERI uses Base64URL encoding)
 * 
 * Base64URL: Like Base64 but uses - instead of + and _ instead of /
 * and omits padding (=)
 */
function base64UrlDecode(str: string): Uint8Array {
  // Convert Base64URL to standard Base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  
  // Add padding if needed
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  
  // Decode using built-in atob (browser) or Buffer (Node)
  if (typeof atob !== 'undefined') {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } else {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
}

// ============================================================================
// Cardano Signature Parsing (CIP-8 / CIP-30 Pattern)
// ============================================================================

/**
 * Parse Cardano wallet signature (COSE_Sign1) and extract Sig_structure
 * 
 * This follows the proven CIP-8 pattern:
 * 1. Decode COSE_Sign1: [protectedHeader, unprotectedHeader, payload, signature]
 * 2. Rebuild Sig_structure: ["Signature1", protectedHeader, h'', payload]
 * 3. CBOR encode Sig_structure (using Buffer for consistent encoding!)
 * 4. Extract public key from COSE_Key (if provided)
 * 
 * @param coseSign1Hex - Hex-encoded COSE_Sign1 from wallet.signData()
 * @param coseKeyHex - Optional: Hex-encoded COSE_Key with public key
 * @returns Parsed signature components ready for validator
 */
export function parseCardanoSignature(
  coseSign1Hex: string,
  coseKeyHex?: string
): ParsedCardanoSignature {
  console.log("📦 Parsing Cardano COSE_Sign1...");
  
  // Step 1: Decode COSE_Sign1
  const coseSign1Bytes = hexToBytes(coseSign1Hex);
  const coseSign1 = decode(coseSign1Bytes);
  
  if (!Array.isArray(coseSign1) || coseSign1.length !== 4) {
    throw new Error(
      `Invalid COSE_Sign1: expected array of 4 elements, got ${coseSign1?.length}`
    );
  }
  
  const [protectedHeader, _unprotectedHeader, payload, signatureBytes] = coseSign1;
  
  console.log("   ✅ COSE_Sign1 decoded");
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
  
  console.log("   ✅ Sig_structure built");
  console.log(`      Length: ${sigStructureBuffer.length} bytes`);
  console.log(`      Hex: ${sigStructureHex.substring(0, 32)}...`);
  
  // Step 3: Extract signature
  const signatureHex = toHex(signatureBytes);
  
  if (signatureHex.length !== 128) {
    throw new Error(
      `Invalid Ed25519 signature length: ${signatureHex.length} (expected 128 hex chars = 64 bytes)`
    );
  }
  
  console.log("   ✅ Signature extracted");
  console.log(`      Length: 64 bytes`);
  console.log(`      Hex: ${signatureHex.substring(0, 32)}...`);
  
  // Step 4: Extract public key from COSE_Key (if provided)
  let publicKeyHex = "";
  
  if (coseKeyHex) {
    const coseKeyBytes = hexToBytes(coseKeyHex);
    const coseKey = decode(coseKeyBytes);
    
    if (!coseKey || typeof coseKey !== 'object' || !('-2' in coseKey)) {
      throw new Error("Invalid COSE_Key: missing field -2 (public key)");
    }
    
    const publicKeyBuffer = coseKey['-2'];
    publicKeyHex = toHex(publicKeyBuffer);
    
    if (publicKeyHex.length !== 64) {
      throw new Error(
        `Invalid Ed25519 public key length: ${publicKeyHex.length} (expected 64 hex chars = 32 bytes)`
      );
    }
    
    console.log("   ✅ Public key extracted from COSE_Key");
    console.log(`      Length: 32 bytes`);
    console.log(`      Hex: ${publicKeyHex.substring(0, 32)}...`);
  }
  
  return {
    sigStructure: sigStructureHex,
    sigStructureBytes: sigStructureBuffer,
    signature: signatureHex,
    publicKey: publicKeyHex,
    protectedHeader: Buffer.from(protectedHeader || []),
    payload: Buffer.from(payload)
  };
}

// ============================================================================
// KERI Signature Parsing
// ============================================================================

/**
 * Parse KERI signature from Base64URL format
 * 
 * KERI Signature Format: <prefix><base64url_signature>
 * Example: "0BADPhs8OJK5tXw7DpvIMQO81hGPoFy9BjDXVJrLCpbN019hHS..."
 * 
 * Prefix codes (first 2 chars):
 * - "0B": Ed25519 signature (64 bytes)
 * - "0C": ECDSA secp256k1 signature
 * - etc.
 * 
 * @param keriSig - KERI signature string (Base64URL with prefix)
 * @returns Parsed signature components
 */
export function parseKeriSignature(keriSig: string): ParsedKeriSignature {
  console.log("🔐 Parsing KERI signature...");
  
  if (keriSig.length < 3) {
    throw new Error(`Invalid KERI signature: too short (${keriSig.length})`);
  }
  
  // Step 1: Extract prefix (first 2 chars)
  const prefix = keriSig.substring(0, 2);
  const base64Part = keriSig.substring(2);
  
  console.log(`   Prefix: ${prefix}`);
  
  // Step 2: Determine algorithm from prefix
  let algorithm: string;
  let expectedLength: number;
  
  switch (prefix) {
    case "0B":
      algorithm = "Ed25519";
      expectedLength = 64;
      break;
    case "0C":
      algorithm = "ECDSA-secp256k1";
      expectedLength = 64;
      break;
    default:
      throw new Error(`Unsupported KERI signature prefix: ${prefix}`);
  }
  
  console.log(`   Algorithm: ${algorithm}`);
  console.log(`   Expected signature length: ${expectedLength} bytes`);
  
  // Step 3: Decode Base64URL
  const signatureBytes = base64UrlDecode(base64Part);
  const signatureHex = Array.from(signatureBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  if (signatureBytes.length !== expectedLength) {
    throw new Error(
      `Invalid ${algorithm} signature length: ${signatureBytes.length} bytes (expected ${expectedLength})`
    );
  }
  
  console.log("   ✅ KERI signature decoded");
  console.log(`      Length: ${signatureBytes.length} bytes`);
  console.log(`      Hex: ${signatureHex.substring(0, 32)}...`);
  
  return {
    signature: signatureHex,
    prefix: prefix,
    algorithm: algorithm
  };
}

// ============================================================================
// KERI AID (Autonomous Identifier) Parsing
// ============================================================================

/**
 * Extract Ed25519 public key from KERI AID
 * 
 * KERI AID Format: <prefix><derivation_code><base64url_key>
 * Example: "EDr7pprL3UJ_aoi3wz8wX4I75BUgpanhQdcBbTNb7UCV"
 * 
 * Prefix codes (first char):
 * - "E": Basic prefix (most common)
 * - "F": Self-addressing identifier
 * - etc.
 * 
 * Derivation codes (second char for "E" prefix):
 * - "D": Ed25519 (32-byte key)
 * - "C": ECDSA secp256k1
 * - etc.
 * 
 * @param aid - KERI Autonomous Identifier
 * @returns Parsed AID components with public key
 */
export function extractPublicKeyFromAid(aid: string): ParsedKeriAid {
  console.log("🔑 Extracting public key from KERI AID...");
  
  if (aid.length < 3) {
    throw new Error(`Invalid KERI AID: too short (${aid.length})`);
  }
  
  // Step 1: Extract prefix and derivation code
  const prefix = aid.substring(0, 1);
  const derivationCode = aid.substring(1, 2);
  const base64Part = aid.substring(2);
  
  console.log(`   Prefix: ${prefix}`);
  console.log(`   Derivation Code: ${derivationCode}`);
  
  // Step 2: Determine algorithm
  let algorithm: string;
  let expectedLength: number;
  
  if (prefix === "E" && derivationCode === "D") {
    algorithm = "Ed25519";
    expectedLength = 32;
  } else if (prefix === "E" && derivationCode === "C") {
    algorithm = "ECDSA-secp256k1";
    expectedLength = 33;
  } else {
    throw new Error(
      `Unsupported KERI AID format: ${prefix}${derivationCode}`
    );
  }
  
  console.log(`   Algorithm: ${algorithm}`);
  console.log(`   Expected key length: ${expectedLength} bytes`);
  
  // Step 3: Decode Base64URL
  let publicKeyBytes = base64UrlDecode(base64Part);
  
  // Handle padding: if we get 31 bytes, pad with a leading zero to get 32 bytes
  if (publicKeyBytes.length === expectedLength - 1) {
    console.log(`   ℹ️  Padding: Got ${publicKeyBytes.length} bytes, adding leading zero`);
    const paddedBytes = new Uint8Array(expectedLength);
    paddedBytes.set(publicKeyBytes, 1);  // Shift bytes right by 1
    publicKeyBytes = paddedBytes;
  }
  
  const publicKeyHex = Array.from(publicKeyBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  if (publicKeyBytes.length !== expectedLength) {
    throw new Error(
      `Invalid ${algorithm} public key length: ${publicKeyBytes.length} bytes (expected ${expectedLength})`
    );
  }
  
  console.log("   ✅ Public key extracted");
  console.log(`      Length: ${publicKeyBytes.length} bytes`);
  console.log(`      Hex: ${publicKeyHex.substring(0, 32)}...`);
  
  return {
    publicKey: publicKeyHex,
    prefix: prefix,
    derivationCode: derivationCode,
    algorithm: algorithm
  };
}

// ============================================================================
// Binding Redeemer Builder
// ============================================================================

/**
 * Build complete BindingRedeemer from binding message
 * 
 * This function orchestrates all parsing steps and assembles the redeemer
 * structure for on-chain validation.
 * 
 * Field order is CRITICAL and must match types.ak:
 * 0: binding_said
 * 1: issuer_aid
 * 2: holder_aid
 * 3: cardano_address
 * 4: cardano_public_key
 * 5: sig_structure
 * 6: cardano_signature
 * 7: canonical_message
 * 8: veridian_signature
 * 9: holder_public_key
 * 10: keri_version
 * 11: binding_type
 * 12: created_at
 * 
 * @param binding - Complete binding message
 * @returns BindingRedeemer ready for validator
 */
export function buildBindingRedeemer(binding: BindingMessage): BindingRedeemer {
  console.log("\n🔧 Building BindingRedeemer...");
  console.log("=".repeat(80));
  
  // Step 1: Parse Cardano signature
  const cardanoSig = parseCardanoSignature(
    binding.signature.cardano,
    binding.cardanoPublicKey  // May be COSE_Key or hex string
  );
  
  // Step 2: Parse KERI signature
  const keriSig = parseKeriSignature(binding.signature.veridian);
  
  // Step 3: Extract holder public key from AID
  const holderKey = extractPublicKeyFromAid(binding.holder);
  
  // Step 4: Convert timestamp to POSIX
  const timestampPosix = BigInt(Date.parse(binding.createdAt));
  
  // Step 5: Use provided public key or extracted from COSE_Key
  const cardanoPublicKey = binding.cardanoPublicKey.length === 64
    ? binding.cardanoPublicKey  // Already hex string
    : cardanoSig.publicKey;     // Extracted from COSE_Key
  
  if (!cardanoPublicKey || cardanoPublicKey.length !== 64) {
    throw new Error(
      `Missing or invalid Cardano public key (length: ${cardanoPublicKey?.length})`
    );
  }
  
  // Step 6: Assemble redeemer (FIELD ORDER CRITICAL!)
  const redeemer: BindingRedeemer = {
    binding_said: binding.d,
    issuer_aid: binding.issuer,
    holder_aid: binding.holder,
    cardano_address: binding.cardanoAddress,
    cardano_public_key: cardanoPublicKey,
    sig_structure: cardanoSig.sigStructure,
    cardano_signature: cardanoSig.signature,
    canonical_message: binding.canonicalMessage,
    veridian_signature: keriSig.signature,
    holder_public_key: holderKey.publicKey,
    keri_version: binding.v,
    binding_type: binding.t,
    created_at: timestampPosix
  };
  
  console.log("\n✅ BindingRedeemer assembled successfully!");
  console.log("=".repeat(80));
  console.log("📊 Component Summary:");
  console.log(`   Sig_structure: ${cardanoSig.sigStructureBytes.length} bytes`);
  console.log(`   Cardano signature: ${cardanoSig.signature.length / 2} bytes`);
  console.log(`   Cardano public key: ${cardanoPublicKey.length / 2} bytes`);
  console.log(`   KERI signature: ${keriSig.signature.length / 2} bytes`);
  console.log(`   Holder public key: ${holderKey.publicKey.length / 2} bytes`);
  console.log(`   Timestamp: ${timestampPosix} (${binding.createdAt})`);
  console.log("=".repeat(80));
  
  return redeemer;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate BindingRedeemer field lengths
 * 
 * This ensures all fields have correct byte lengths before submitting to validator
 */
export function validateBindingRedeemer(redeemer: BindingRedeemer): void {
  const validations = [
    { field: "cardano_public_key", value: redeemer.cardano_public_key, expected: 64 },
    { field: "cardano_signature", value: redeemer.cardano_signature, expected: 128 },
    { field: "veridian_signature", value: redeemer.veridian_signature, expected: 128 },
    { field: "holder_public_key", value: redeemer.holder_public_key, expected: 64 },
  ];
  
  for (const { field, value, expected } of validations) {
    if (value.length !== expected) {
      throw new Error(
        `Invalid ${field} length: ${value.length} hex chars (expected ${expected} = ${expected / 2} bytes)`
      );
    }
  }
  
  console.log("✅ All redeemer field lengths validated");
}
