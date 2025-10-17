use aiken/crypto.{verify_ed25519_signature}
use aiken/primitive/bytearray
use cardano/transaction.{OutputReference, Transaction}

/// Veridian verification redeemer: (public_key, message, signature)
/// This validator specifically tests Veridian Ed25519 signature verification
pub type VeridianRedeemer =
  (ByteArray, ByteArray, ByteArray)

/// Veridian Signature Verification Validator
/// 
/// This validator verifies Veridian Ed25519 signatures for KERI binding messages.
/// It uses the same Ed25519 verification as minimal_binding but is specifically
/// for testing the Veridian signature component of the binding system.
///
/// Redeemer structure:
/// - public_key: 32 bytes - Veridian Ed25519 public key
/// - message: Variable length - Canonical message that was signed
/// - signature: 64 bytes - Ed25519 signature from Veridian
///
/// The validator ensures:
/// 1. Public key is exactly 32 bytes
/// 2. Signature is exactly 64 bytes
/// 3. Message has content (length > 0)
/// 4. Ed25519 signature verification passes
validator veridian_verification {
  spend(
    _datum: Option<ByteArray>,
    redeemer: VeridianRedeemer,
    _own_ref: OutputReference,
    _tx: Transaction,
  ) {
    let (public_key, message, signature) = redeemer
    // Validate field lengths
    let pk_valid = bytearray.length(public_key) == 32
    let sig_valid = bytearray.length(signature) == 64
    let msg_valid = bytearray.length(message) > 0
    // All fields must be valid and signature must verify
    if pk_valid && sig_valid && msg_valid {
      verify_ed25519_signature(public_key, message, signature)
    } else {
      False
    }
  }

  else(_) {
    fail
  }
}
