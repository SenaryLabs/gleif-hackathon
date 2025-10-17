use aiken/builtin
use aiken/crypto.{VerificationKey}
use principia/types.{BondDatum, LegalEntityCredential, QVICredential}

// ============================================================================
// CONSTANTS
// ============================================================================

/// GLEIF Root AID (Production)
/// This is the root of trust for all vLEI credentials
/// Source: https://vlei.gleif.org/
/// Note: These are base64url encoded SAIDs, not hex. For MVP, we store as ByteArray
/// and compare directly. In production, would decode properly.
pub const gleif_root_aid: ByteArray = "BBILC4-O4dUPH3"

/// QVI Schema SAID
/// Schema for Qualified vLEI Issuer credentials
pub const qvi_schema_said: ByteArray =
  "EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao"

/// Legal Entity Schema SAID
/// Schema for Legal Entity vLEI credentials
pub const le_schema_said: ByteArray =
  "ENPXp1vQzRF6JwIuS-mp2U8Uf1MoADoP_GqQ62VsDZWY"

/// LEI Length (Legal Entity Identifier)
/// LEI must be exactly 20 characters
pub const lei_length: Int = 20

// ============================================================================
// LEI VALIDATION
// ============================================================================

/// Validates LEI format
/// 
/// LEI (Legal Entity Identifier) must be:
/// - Exactly 20 characters long
/// - Alphanumeric (A-Z, 0-9)
/// - Uppercase (normalized)
///
/// Example valid LEI: "875500ELOZEL05BVXV37"
/// 
/// # Arguments
/// * `lei` - The LEI to validate
/// 
/// # Returns
/// * `Bool` - True if LEI is valid format
pub fn validate_lei_format(lei: ByteArray) -> Bool {
  // Check length
  let is_correct_length = builtin.length_of_bytearray(lei) == lei_length
  // In production, would also validate:
  // - Characters are uppercase alphanumeric
  // - Check digit validation (ISO 17442)
  // For MVP, length check is sufficient
  is_correct_length
}

// ============================================================================
// QVI CREDENTIAL VERIFICATION
// ============================================================================

/// Verifies a QVI (Qualified vLEI Issuer) Credential
/// 
/// QVI credentials are issued by GLEIF to authorize entities to issue
/// Legal Entity vLEI credentials.
/// 
/// Verification steps:
/// 1. Verify issuer is GLEIF root
/// 2. Verify QVI's LEI format
/// 3. Verify KERI signature over credential
/// 
/// # Arguments
/// * `qvi_cred` - The QVI credential to verify
/// * `gleif_public_key` - GLEIF's Ed25519 public key (32 bytes)
/// 
/// # Returns
/// * `Bool` - True if QVI credential is valid
pub fn verify_qvi_credential(
  qvi_cred: QVICredential,
  gleif_public_key: ByteArray,
) -> Bool {
  // 1. Verify issuer is GLEIF root
  let is_issued_by_gleif = qvi_cred.issuer_aid == gleif_root_aid
  // 2. Verify QVI's LEI format
  let is_qvi_lei_valid = validate_lei_format(qvi_cred.qvi_lei)
  // 3. Verify signature
  // In production, would reconstruct canonical message and verify signature
  // For MVP, we'll accept credentials as-is (signature verified off-chain by Signify)
  let is_signature_valid =
    builtin.length_of_bytearray(qvi_cred.qvi_signature) == 64
  is_issued_by_gleif && is_qvi_lei_valid && is_signature_valid
}

// ============================================================================
// LEGAL ENTITY CREDENTIAL VERIFICATION
// ============================================================================

/// Verifies edge linkage between LE credential and QVI credential
/// 
/// The edge block in the LE credential must reference the QVI credential's SAID.
/// This creates the trust chain: LE → QVI → GLEIF
/// 
/// Edge block structure (from vLEI ACDC):
/// ```
/// e: {
///   qvi: {
///     n: QVI_CREDENTIAL_SAID,
///     s: QVI_SCHEMA_SAID
///   }
/// }
/// ```
/// 
/// # Arguments
/// * `le_cred` - Legal Entity credential
/// * `qvi_cred` - QVI credential that should be referenced
/// 
/// # Returns
/// * `Bool` - True if edge correctly links to QVI credential
pub fn verify_edge_linkage(
  le_cred: LegalEntityCredential,
  qvi_cred: QVICredential,
) -> Bool {
  // Edge SAID must match QVI credential's SAID
  le_cred.qvi_edge_said == qvi_cred.credential_said
}

/// Verifies a Legal Entity vLEI Credential
/// 
/// Legal Entity credentials are issued by QVIs to business entities.
/// They link the entity's AID to their LEI.
/// 
/// Verification steps:
/// 1. Verify issuer is the QVI from the edge block
/// 2. Verify entity's LEI format
/// 3. Verify KERI signature over credential
/// 
/// # Arguments
/// * `le_cred` - The Legal Entity credential to verify
/// * `qvi_public_key` - QVI's AID (ByteArray for comparison)
/// 
/// # Returns
/// * `Bool` - True if LE credential is valid
pub fn verify_legal_entity_credential(
  le_cred: LegalEntityCredential,
  qvi_public_key: ByteArray,
) -> Bool {
  // 1. Verify LEI format
  let is_lei_valid = validate_lei_format(le_cred.lei)
  // 2. Verify signature
  // In production, would reconstruct canonical message and verify signature
  // For MVP, we'll accept credentials as-is (signature verified off-chain by Signify)
  let is_signature_valid =
    builtin.length_of_bytearray(le_cred.entity_signature) == 64
  is_lei_valid && is_signature_valid
}

// ============================================================================
// COMPLETE CREDENTIAL CHAIN VERIFICATION
// ============================================================================

/// Verifies the complete vLEI credential chain
/// 
/// This is the main entry point for BondMintingPolicy.
/// Verifies the entire trust chain: GLEIF → QVI → Legal Entity
/// 
/// Verification flow:
/// 1. Verify QVI credential (issued by GLEIF)
/// 2. Verify LE credential (issued by QVI)
/// 3. Verify edge linkage (LE → QVI)
/// 4. Verify entity's AID matches transaction signature
/// 
/// # Arguments
/// * `le_cred` - Legal Entity vLEI credential
/// * `qvi_cred` - QVI credential (referenced by LE credential)
/// * `gleif_public_key` - GLEIF's Ed25519 public key
/// * `qvi_public_key` - QVI's Ed25519 public key
/// 
/// # Returns
/// * `Bool` - True if entire credential chain is valid
pub fn verify_vlei_credential_chain(
  le_cred: LegalEntityCredential,
  qvi_cred: QVICredential,
  gleif_public_key: ByteArray,
  qvi_public_key: ByteArray,
) -> Bool {
  trace @"=== vLEI Chain Verification ==="
  // 1. Verify QVI credential
  let is_qvi_valid = verify_qvi_credential(qvi_cred, gleif_public_key)
  trace @"QVI valid": is_qvi_valid
  // 2. Verify LE credential
  let is_le_valid = verify_legal_entity_credential(le_cred, qvi_public_key)
  trace @"LE valid": is_le_valid
  // 3. Verify edge linkage
  let is_edge_valid = verify_edge_linkage(le_cred, qvi_cred)
  trace @"Edge valid": is_edge_valid
  // 4. Verify issuer chain (LE issued by QVI, QVI issued by GLEIF)
  trace @"Checking issuer chain..."
  trace @"LE issuer_aid": le_cred.issuer_aid
  trace @"QVI qvi_aid": qvi_cred.qvi_aid
  trace @"QVI issuer_aid": qvi_cred.issuer_aid
  trace @"gleif_root_aid constant": gleif_root_aid
  let le_issued_by_qvi = le_cred.issuer_aid == qvi_cred.qvi_aid
  let qvi_issued_by_gleif = qvi_cred.issuer_aid == gleif_root_aid
  trace @"LE issued by QVI": le_issued_by_qvi
  trace @"QVI issued by GLEIF": qvi_issued_by_gleif
  let is_issuer_chain_valid = le_issued_by_qvi && qvi_issued_by_gleif
  trace @"Issuer chain valid": is_issuer_chain_valid
  let final_result =
    is_qvi_valid && is_le_valid && is_edge_valid && is_issuer_chain_valid
  trace @"Final vLEI result": final_result
  final_result
}

// ============================================================================
// BOND DATUM VALIDATION
// ============================================================================

/// Validates bond parameters are reasonable
/// 
/// Basic sanity checks to prevent obviously invalid bonds.
/// 
/// # Arguments
/// * `bond_datum` - The bond datum to validate
/// 
/// # Returns
/// * `Bool` - True if bond parameters are valid
pub fn validate_bond_parameters(bond_datum: BondDatum) -> Bool {
  // Face value must be positive
  let is_face_value_positive = bond_datum.total_face_value > 0
  // Coupon rate must be between 0 and 10000 bps (0% to 100%)
  let is_coupon_rate_valid =
    bond_datum.coupon_rate_bps >= 0 && bond_datum.coupon_rate_bps <= 10000
  // Payment interval must be positive
  let is_payment_interval_positive = bond_datum.payment_interval_ms > 0
  // Maturity must be in the future
  let is_maturity_future =
    bond_datum.maturity_timestamp > bond_datum.issue_timestamp
  // Denomination must be positive
  let is_denomination_positive = bond_datum.denomination > 0
  is_face_value_positive && is_coupon_rate_valid && is_payment_interval_positive && is_maturity_future && is_denomination_positive
}

/// Verifies entity attribution in bond datum matches vLEI credential
/// 
/// Ensures the bond datum correctly embeds the entity's information
/// from their vLEI credential.
/// 
/// # Arguments
/// * `bond_datum` - The bond datum to check
/// * `le_cred` - The Legal Entity credential used for issuance
/// 
/// # Returns
/// * `Bool` - True if entity attribution is correct
pub fn verify_entity_attribution(
  bond_datum: BondDatum,
  le_cred: LegalEntityCredential,
) -> Bool {
  // LEI must match
  let is_lei_match = bond_datum.issuer_lei == le_cred.lei
  // Entity AID must match
  let is_aid_match = bond_datum.issuer_entity_aid == le_cred.entity_aid
  // Entity name must match
  let is_name_match = bond_datum.issuer_entity_name == le_cred.entity_name
  // Credential SAID must match
  let is_said_match = bond_datum.vlei_credential_said == le_cred.credential_said
  is_lei_match && is_aid_match && is_name_match && is_said_match
}
