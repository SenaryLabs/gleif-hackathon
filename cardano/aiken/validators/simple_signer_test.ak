use aiken/builtin
use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}

/// Simple Signer Verification Test Validator
/// 
/// Takes a public key in the redeemer and verifies that:
/// 1. Hash of public key matches a transaction signer
/// 2. This proves the transaction was signed by the owner of that public key
///
/// Test Redeemer: ByteArray (32-byte Ed25519 public key)
validator simple_signer_test {
  mint(redeemer_public_key: ByteArray, _own_policy: PolicyId, tx: Transaction) {
    // 1. Verify public key is 32 bytes (Ed25519)
    let key_length_valid =
      builtin.length_of_bytearray(redeemer_public_key) == 32

    // 2. Hash the public key to get VerificationKeyHash
    let key_hash: VerificationKeyHash = builtin.blake2b_224(redeemer_public_key)

    // 3. Check if this hash is in the transaction's extra_signatories
    let signed_by_key = list.has(tx.extra_signatories, key_hash)

    // Both checks must pass
    key_length_valid? && signed_by_key?
  }

  else(_) {
    fail
  }
}
