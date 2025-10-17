use aiken/crypto.{blake2b_256, verify_ed25519_signature}
use aiken/primitive/bytearray
use cardano/transaction.{OutputReference, Transaction}

// CIP-8 Signature Validator
// This validator verifies Ed25519 signatures over CIP-8 messages
// The signature is created over the Blake2b-256 hash of the message

// Redeemer data structure for CIP-8 verification
pub type Cip8Redeemer {
  message: ByteArray,
  public_key: ByteArray,
  signature: ByteArray,
}

// Validator function
validator cip8_validator {
  spend(
    _datum: Option<ByteArray>,
    redeemer: Cip8Redeemer,
    _own_ref: OutputReference,
    _tx: Transaction,
  ) {
    // Hash the message using Blake2b-256 and verify the Ed25519 signature
    verify_ed25519_signature(
      redeemer.public_key,
      redeemer.message,
      redeemer.signature,
    )
  }

  else(_) {
    fail
  }
}
