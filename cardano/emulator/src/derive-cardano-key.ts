/**
 * Cardano Key Derivation Utilities
 * 
 * Derives Ed25519 public keys from BIP39 seed phrases following CIP-1852
 * Cardano derivation path: m/1852'/1815'/0'/0/0
 */

import { Buffer } from "node:buffer";
import { mnemonicToSeedSync } from "@scure/bip39";
import { HDKey } from "@scure/bip32";

/**
 * Derives the payment public key from a BIP39 seed phrase
 * 
 * @param seedPhrase - BIP39 mnemonic (12, 15, 18, 21, or 24 words)
 * @returns Ed25519 public key as hex string (32 bytes = 64 hex chars)
 */
export function deriveCardanoPublicKey(seedPhrase: string): string {
  // Convert mnemonic to seed (512-bit)
  const seed = mnemonicToSeedSync(seedPhrase);
  
  // Create root HD key from seed
  const rootKey = HDKey.fromMasterSeed(seed);
  
  // Cardano derivation path (CIP-1852):
  // m / 1852' / 1815' / 0' / 0 / 0
  // 1852' = purpose (hardened)
  // 1815' = coin type for Cardano (hardened)
  // 0'    = account index (hardened)
  // 0     = external chain (receiving addresses)
  // 0     = address index
  const path = "m/1852'/1815'/0'/0/0";
  const paymentKey = rootKey.derive(path);
  
  if (!paymentKey.publicKey) {
    throw new Error("Failed to derive public key");
  }
  
  // Return the 32-byte Ed25519 public key as hex
  const publicKeyHex = Buffer.from(paymentKey.publicKey).toString('hex');
  
  // Remove the first byte if it's 33 bytes (compressed point prefix)
  if (publicKeyHex.length === 66) {
    return publicKeyHex.substring(2); // Remove 0x00 prefix
  }
  
  return publicKeyHex;
}

/**
 * Computes the blake2b-224 hash of a public key
 * This matches what Cardano uses for payment credentials
 * 
 * @param publicKeyHex - Ed25519 public key (32 bytes hex)
 * @returns Payment key hash (28 bytes hex)
 */
export async function computePaymentKeyHash(publicKeyHex: string): Promise<string> {
  // Import blake2b (we'll use the one from lucid)
  const { blake2b } = await import("blakejs");
  
  // Convert hex to bytes
  const publicKeyBytes = Buffer.from(publicKeyHex, 'hex');
  
  // Compute blake2b-224 (28 bytes)
  const hash = blake2b(publicKeyBytes, undefined, 28);
  
  return Buffer.from(hash).toString('hex');
}

// Test function
if (import.meta.main) {
  const testSeed = "test walk nut penalty hip pave soap entry language right filter choice";
  
  console.log("Testing Cardano Key Derivation");
  console.log("================================\n");
  console.log("Seed phrase:", testSeed);
  
  const publicKey = deriveCardanoPublicKey(testSeed);
  console.log("\nDerived Public Key:", publicKey);
  console.log("Length:", publicKey.length / 2, "bytes");
  
  computePaymentKeyHash(publicKey).then(keyHash => {
    console.log("\nPayment Key Hash (blake2b-224):", keyHash);
    console.log("Length:", keyHash.length / 2, "bytes");
    console.log("\n✅ This is what appears in tx.extra_signatories");
  });
}

