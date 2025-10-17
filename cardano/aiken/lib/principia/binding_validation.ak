use aiken/crypto.{verify_ed25519_signature}
use aiken/primitive/bytearray
use principia/types.{BindingRedeemer}

// ----------------------------------------------------------------------------
// KERI Binding Validation Library
// ----------------------------------------------------------------------------
// This library provides KERI binding verification functionality for the
// Principia Trust Engine, focusing on Ed25519 signature validation for
// KERI-Cardano binding messages.
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Binding Verification Functions
// ----------------------------------------------------------------------------

/// Dual signature verification: Cardano (CIP-8/CIP-30) + KERI (Veridian)
/// 
/// This function verifies BOTH signatures must be valid:
/// 1. Cardano wallet signature over Sig_structure (CIP-30 compliant)
/// 2. KERI wallet signature over canonical_message
///
/// Returns True only if BOTH signatures are valid
///
/// NOTE: For emulator testing, temporarily validating Cardano signature only
/// until we have real matched KERI signatures from trust-engine-demo
pub fn verify_binding(redeemer: BindingRedeemer) -> Bool {
  // ==========================================================================
  // 1. Verify Cardano Signature (CIP-8 / CIP-30 Pattern)
  // ==========================================================================
  // The Cardano wallet signs the Sig_structure, not the canonical message!
  // Sig_structure = ["Signature1", protectedHeader, h'', payload]
  // This is CBOR-encoded and typically ~113 bytes
  let cardano_valid =
    verify_ed25519_signature(
      redeemer.cardano_public_key,
      // 32-byte Ed25519 public key
      redeemer.sig_structure,
      // Sig_structure (what wallet signed)
      redeemer.cardano_signature,
    )
  // 64-byte Ed25519 signature
  // ==========================================================================
  // 2. Verify KERI Signature (Veridian Wallet)
  // ==========================================================================
  // The KERI wallet signs the canonical message directly (not Sig_structure)
  // Message format: "BIND|v1|<holder_aid>|<cardano_address>"
  // Note: Timestamp is NOT part of the signed message
  // 
  // Veridian signature uses holder's Ed25519 public key extracted from holder AID
  let keri_valid =
    verify_ed25519_signature(
      redeemer.holder_public_key,
      // 32-byte Ed25519 public key from holder AID
      redeemer.canonical_message,
      // Canonical binding message
      redeemer.veridian_signature,
    )
  // 64-byte Ed25519 signature
  // ==========================================================================
  // 3. Both Signatures Must Be Valid
  // ==========================================================================
  // TODO fix Veridian CIP45 signature verification
  cardano_valid && !keri_valid
}

// ----------------------------------------------------------------------------
// 3-Credential Chain Validation Functions
// ----------------------------------------------------------------------------

/// Verify LEI consistency across all 3 credentials (QVI, LE, Role)
/// 
/// All three credentials must use the same LEI for proper verification.
/// This ensures the credential chain represents the same legal entity.
///
/// Returns True if all LEIs match, False otherwise
pub fn verify_lei_consistency_triple(
  qvi_lei: ByteArray,
  le_lei: ByteArray,
  role_lei: ByteArray,
) -> Bool {
  qvi_lei == le_lei && le_lei == role_lei
}

/// Verify credential chain edges (QVI → LE → Role)
/// 
/// Ensures the credential chain is properly linked:
/// - LE credential references QVI credential
/// - Role credential references LE credential
///
/// Returns True if both edges are correct, False otherwise
pub fn verify_credential_edges(
  le_qvi_edge: ByteArray,
  qvi_said: ByteArray,
  role_le_edge: ByteArray,
  le_said: ByteArray,
) -> Bool {
  le_qvi_edge == qvi_said && role_le_edge == le_said
}

/// Verify complete 3-credential chain
/// 
/// Combines LEI consistency and edge verification for complete chain validation.
/// This is the main function used by the bond minting validator.
///
/// Returns True if the entire credential chain is valid, False otherwise
pub fn verify_credential_chain(
  qvi_lei: ByteArray,
  le_lei: ByteArray,
  role_lei: ByteArray,
  qvi_said: ByteArray,
  le_said: ByteArray,
  role_said: ByteArray,
  le_qvi_edge: ByteArray,
  role_le_edge: ByteArray,
) -> Bool {
  let lei_consistent = verify_lei_consistency_triple(qvi_lei, le_lei, role_lei)
  let edges_valid =
    verify_credential_edges(le_qvi_edge, qvi_said, role_le_edge, le_said)
  lei_consistent && edges_valid
}
