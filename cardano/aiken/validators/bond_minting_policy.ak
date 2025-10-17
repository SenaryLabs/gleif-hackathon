use aiken/builtin
use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}
use principia/binding_validation.{verify_binding, verify_credential_chain}
use principia/types.{BondDatum, BondMintingRedeemer, Funding}
use principia/vlei_verification.{validate_bond_parameters}

/// Bond Minting Policy with 3-Credential Chain Verification
///
/// Implements the Verifiable Smart Contracts pattern:
/// Only authorized identity (proven via 3-credential chain + wallet binding) can mint bonds.
///
/// Verification:
/// - 3-Credential Chain: QVI → LE → Role with LEI consistency and edge verification
/// - Wallet Binding: Cryptographic proof of KERI AID ↔ Cardano wallet
/// - Bond Parameters: Valid face value, coupon rate, maturity date
/// - Entity-AID Match: Binding holder AID must match entity AID from vLEI
///
/// This ensures that only the entity that controls both:
/// 1. The KERI AID (proven by Veridian signature)
/// 2. The Cardano wallet (proven by CIP-30 signature)
/// 3. Has valid 3-credential chain (QVI → LE → Role)
/// can issue bonds on behalf of their GLEIF-verified legal entity.
validator bond_minting_policy {
  mint(redeemer: BondMintingRedeemer, _own_policy: PolicyId, tx: Transaction) {
    let bond_datum: BondDatum = redeemer.bond_datum

    // 1. Verify 3-credential chain (LEI consistency + edge verification)
    let credential_chain_valid =
      verify_credential_chain(
        redeemer.qvi_lei,
        redeemer.le_lei,
        redeemer.role_lei,
        redeemer.qvi_credential_said,
        redeemer.le_credential_said,
        redeemer.role_credential_said,
        redeemer.le_qvi_edge,
        redeemer.role_le_edge,
      )

    let key_hash: VerificationKeyHash =
      builtin.blake2b_224(redeemer.binding_proof.cardano_public_key)
    let signed_by_key = list.has(tx.extra_signatories, key_hash)

    // 2. Verify wallet binding (Verifiable Smart Contract authorization)
    let binding_valid = verify_binding(redeemer.binding_proof)

    // 3. Verify entity-AID match (holder_aid from binding == entity_aid from vLEI)
    let aid_match =
      redeemer.binding_proof.holder_aid == bond_datum.issuer_entity_aid

    // 4. Verify entity attribution integrity (LEI from bond datum matches credential chain)
    let attribution_valid = bond_datum.issuer_lei == redeemer.le_lei

    // 5. Validate LEI format (must be 20 characters)
    let lei_valid = builtin.length_of_bytearray(redeemer.le_lei) == 20

    // 6. Validate bond parameters
    let params_valid = validate_bond_parameters(bond_datum)

    // 7. Verify initial status is Funding
    let status_valid = bond_datum.status == Funding

    // 8. Verify transaction is signed
    let signed = list.length(tx.extra_signatories) > 0

    // All validations must pass
    credential_chain_valid? && binding_valid? && aid_match? && attribution_valid? && lei_valid? && params_valid? && status_valid? && signed?
  }

  else(_) {
    fail
  }
}
