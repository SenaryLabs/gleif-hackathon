use aiken/primitive/bytearray
use cardano/transaction.{OutputReference, Transaction}
use principia/binding_validation.{verify_binding}
use principia/types.{BindingRedeemer}

// ----------------------------------------------------------------------------
// KERI Binding Validator
// ----------------------------------------------------------------------------
// This validator verifies KERI-Cardano binding messages using the KERI
// signature validation library. It accepts a BindingRedeemer containing
// the binding message components and validates the KERI signature.
// ----------------------------------------------------------------------------

/// KERI Binding Validator
/// Verifies KERI-Cardano binding messages using the KERI signature validation library
/// It acts as a deterministic validator where each binding verification is a validated transaction
validator binding_validator {
  spend(
    _datum: Option<ByteArray>,
    redeemer: BindingRedeemer,
    _own_ref: OutputReference,
    _tx: Transaction,
  ) {
    verify_binding(redeemer)
  }

  else(_) {
    fail
  }
}
