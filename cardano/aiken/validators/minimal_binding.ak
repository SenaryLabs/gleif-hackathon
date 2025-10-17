use aiken/crypto.{verify_ed25519_signature}
use aiken/primitive/bytearray
use cardano/transaction.{OutputReference, Transaction}

/// Minimal binding redeemer: (public_key, message, signature)
pub type MinimalBindingRedeemer =
  (ByteArray, ByteArray, ByteArray)

/// Minimal KERI Binding Validator
/// Simple validator that verifies Ed25519 signatures
validator minimal_binding {
  spend(
    _datum: Option<ByteArray>,
    redeemer: MinimalBindingRedeemer,
    _own_ref: OutputReference,
    _tx: Transaction,
  ) {
    let (public_key, message, signature) = redeemer
    // Basic validation
    let pk_ok = bytearray.length(public_key) == 32
    let sig_ok = bytearray.length(signature) == 64
    let msg_ok = bytearray.length(message) > 0
    if pk_ok && sig_ok && msg_ok {
      verify_ed25519_signature(public_key, message, signature)
    } else {
      False
    }
  }

  else(_) {
    fail
  }
}
