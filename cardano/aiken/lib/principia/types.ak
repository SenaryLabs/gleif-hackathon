use aiken/crypto.{ScriptHash, VerificationKeyHash}
use cardano/address.{Address}
use cardano/assets.{AssetName, PolicyId}

// ============================================================================
// CORE TYPES
// ============================================================================

/// Basic asset type for token identification
pub type Asset {
  policy_id: PolicyId,
  asset_name: AssetName,
}

/// POSIX timestamp type
pub type POSIXTime =
  Int

// ============================================================================
// KERI BINDING TYPES
// ============================================================================

/// Complete binding redeemer structure with dual signature verification
/// Updated to follow CIP-8 pattern: separate sig_structure from cardano_signature
pub type BindingRedeemer {
  // ============================================================================
  // Core KERI identifiers
  // ============================================================================
  binding_said: ByteArray,
  // "d": "EHWynjie2GCVk3Diz7oAxk0h5L78hsmjJ3stg6kFnctn"
  issuer_aid: ByteArray,
  // "issuer": "ENsh33t2c6xhdc9QgGI_Nv4PofQDjVUfwWxULUam5GYd"
  holder_aid: ByteArray,
  // "holder": "EDr7pprL3UJ_aoi3wz8wX4I75BUgpanhQdcBbTNb7UCV"
  // ============================================================================
  // Cardano signature components (CIP-8 / CIP-30 compliant)
  // ============================================================================
  cardano_address: ByteArray,
  // "cardanoAddress": "addr_test1qrcsss93..."
  cardano_public_key: ByteArray,
  // Ed25519 public key (32 bytes) - extracted from COSE_Key field -2
  sig_structure: ByteArray,
  // CIP-30 Sig_structure: ["Signature1", protectedHeader, h'', payload]
  // CBOR-encoded, typically ~113 bytes
  // This is what the wallet actually signed!
  cardano_signature: ByteArray,
  // Ed25519 signature (64 bytes) - extracted from COSE_Sign1[3]
  // NOT the full COSE_Sign1 structure - just the signature bytes
  // ============================================================================
  // KERI signature components (Veridian wallet)
  // ============================================================================
  canonical_message: ByteArray,
  // "canonicalMessage": "BIND|v1|EDr7pprL3UJ_aoi3wz8wX4I75BUgpanhQdcBbTNb7UCV|..."
  // This is what KERI signs (raw message, not Sig_structure)
  veridian_signature: ByteArray,
  // Ed25519 signature (64 bytes) - decoded from Base64URL "0B..." format
  holder_public_key: ByteArray,
  // Ed25519 public key (32 bytes) - extracted from holder_aid
  // Holder AID format: "EDr7pprL3UJ_aoi3wz8wX4I75BUgpanhQdcBbTNb7UCV"
  // "E" = basic prefix, "D" = Ed25519, rest = Base64URL encoded key
  // ============================================================================
  // Metadata
  // ============================================================================
  keri_version: ByteArray,
  // "v": "KERI10JSON000582_"
  binding_type: ByteArray,
  // "t": "cardano_address_binding"
  created_at: POSIXTime,
}

// "createdAt": "2025-10-02T13:25:56.210Z" -> POSIX timestamp

// ============================================================================
// FIELD ORDER CRITICAL! ⚠️
// ============================================================================
// When building Data.to(new Constr(0, [...]))), fields MUST be in this order:
// 0: binding_said
// 1: issuer_aid
// 2: holder_aid
// 3: cardano_address
// 4: cardano_public_key
// 5: sig_structure          ← NEW
// 6: cardano_signature      ← UPDATED (64 bytes only)
// 7: canonical_message
// 8: veridian_signature
// 9: holder_public_key      ← NEW
// 10: keri_version
// 11: binding_type
// 12: created_at
// ============================================================================

// ============================================================================
// vLEI CREDENTIAL TYPES (GLEIF Hackathon)
// ============================================================================

/// QVI (Qualified vLEI Issuer) Credential
/// Issued by GLEIF to authorize an entity to issue Legal Entity vLEI credentials
/// Schema SAID: EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao
pub type QVICredential {
  // Issuer AID (GLEIF's root AID)
  issuer_aid: ByteArray,
  // QVI's AID (the subject of this credential)
  qvi_aid: ByteArray,
  // QVI's own LEI (20 characters)
  qvi_lei: ByteArray,
  // Credential SAID (Self-Addressing Identifier)
  credential_said: ByteArray,
  // Issuance timestamp
  issuance_timestamp: POSIXTime,
  // KERI signature over the credential
  qvi_signature: ByteArray,
}

/// Legal Entity vLEI Credential
/// Issued by QVI to a business entity
/// Schema SAID: ENPXp1vQzRF6JwIuS-mp2U8Uf1MoADoP_GqQ62VsDZWY
pub type LegalEntityCredential {
  // Issuer AID (QVI's AID)
  issuer_aid: ByteArray,
  // Entity's AID (the subject of this credential)
  entity_aid: ByteArray,
  // Entity's LEI (20 characters)
  lei: ByteArray,
  // Entity's legal name
  entity_name: ByteArray,
  // Credential SAID
  credential_said: ByteArray,
  // Edge block - links to QVI credential
  qvi_edge_said: ByteArray,
  // Issuance timestamp
  issuance_timestamp: POSIXTime,
  // KERI signature over the credential
  entity_signature: ByteArray,
}

/// Bond Datum with vLEI Entity Attribution
/// Standard bond datum with embedded vLEI entity information for compliance
pub type BondDatum {
  // === Entity Attribution (NEW: vLEI integration) ===
  issuer_lei: ByteArray,
  // From vLEI credential
  issuer_entity_name: ByteArray,
  issuer_entity_aid: ByteArray,
  vlei_credential_said: ByteArray,
  // Links to the vLEI credential used for issuance
  // === Bond Terms ===
  bond_id: ByteArray,
  total_face_value: Int,
  coupon_rate_bps: Int,
  payment_interval_ms: Int,
  maturity_timestamp: POSIXTime,
  currency: ByteArray,
  denomination: Int,
  // === Lifecycle State ===
  issue_timestamp: POSIXTime,
  last_coupon_payment_timestamp: POSIXTime,
  funds_raised: Int,
  status: BondStatus,
}

/// Bond Status (simplified from existing)
pub type BondStatus {
  Funding
  Active
  Matured
  Defaulted
  Redeemed
}

/// Bond Minting Redeemer with 3-Credential Chain Verification
/// Contains simplified vLEI credential chain + wallet binding proof
/// Implements Verifiable Smart Contracts: only authorized identity can mint
pub type BondMintingRedeemer {
  // ============================================================================
  // 3-Credential Chain (Simplified)
  // ============================================================================
  qvi_lei: ByteArray,
  // QVI credential LEI (20 characters)
  le_lei: ByteArray,
  // LE credential LEI (20 characters) 
  role_lei: ByteArray,
  // Role credential LEI (20 characters)
  qvi_credential_said: ByteArray,
  // QVI credential SAID
  le_credential_said: ByteArray,
  // LE credential SAID
  role_credential_said: ByteArray,
  // Role credential SAID
  le_qvi_edge: ByteArray,
  // LE credential's reference to QVI credential SAID
  role_le_edge: ByteArray,
  // Role credential's reference to LE credential SAID
  // ============================================================================
  // Wallet Binding Proof (cryptographic verification)
  // ============================================================================
  binding_proof: BindingRedeemer,
  // ============================================================================
  // Bond Datum
  // ============================================================================
  bond_datum: BondDatum,
}

/// Bond Minting Redeemer (Full - for future use)
/// Contains complete vLEI credentials for on-chain verification
pub type BondMintingRedeemerFull {
  // vLEI credential chain for verification
  legal_entity_credential: LegalEntityCredential,
  qvi_credential: QVICredential,
  // Complete bond datum to create
  bond_datum: BondDatum,
}
// ============================================================================
