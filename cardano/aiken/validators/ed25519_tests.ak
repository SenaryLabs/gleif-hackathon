use aiken/crypto.{blake2b_256, verify_ed25519_signature}
use aiken/primitive/bytearray

test test_ed25519_signature_valid() {
  // Message: "Hello Aiken"
  let message = #"48656c6c6f2041696b656e"
  // Hash the message using blake2b_256
  let message_hash = blake2b_256(message)
  // Public key (32 bytes)
  let public_key =
    #"d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a"
  // Ed25519 signature (64 bytes) - signed over blake2b_256(message)
  let signature =
    #"a0b45e854b4cebe4f628d28f1b33efbac87d05b5355d2ff30bf8b634e2c0d766efc619f2ffcaaf7df89689d29d15a733d875bb939b1cf87567c92d0bcbe98b0c"
  // This MUST verify as True - cryptographically valid signature
  verify_ed25519_signature(public_key, message_hash, signature)
}

test test_cip8_signature_valid() {
  // Message: "Hello Aiken CIP-8 Test"
  let message = #"48656c6c6f2041696b656e204349502d382054657374"
  // Hash the message using blake2b_256
  let message_hash = blake2b_256(message)
  // Public key (32 bytes)
  let public_key =
    #"c5ae02c269667eea4fafd164346c9b1c50c70829625507b680e7889f8df10c5f"
  // Ed25519 signature (64 bytes) - signed over blake2b_256(message)
  let signature =
    #"f60ee3edccbe259e05b2d1af08f29820cf25a8f5e9bf57df789b2fd1b3c0e523c050553a9cc583c98a2f2aaca77a8222d214e618cb5658813f6cadd592aa140d"
  // This MUST verify as True - cryptographically valid signature
  verify_ed25519_signature(public_key, message_hash, signature)
}

test test_cip8_sign_and_verify() {
  // Message: "Hello CIP-8 Validator Test"
  let message = #"48656c6c6f204349502d382056616c696461746f722054657374"
  // Hash the message using blake2b_256
  let message_hash = blake2b_256(message)
  // Public key (32 bytes)
  let public_key =
    #"ca511200c326920d5088051650cf9f26447b1e88c5897331d29fded515227d45"
  // Ed25519 signature (64 bytes)
  let signature =
    #"7585dcf26b53808b4b3a4c2c0ce324b0da4e8c25de76abf5e6708cf5db147a4f80e5cb2cbc069f258b7c81c1c3a090f72b45d971e0dba024571223c4e1db8900"
  // This MUST verify as True
  verify_ed25519_signature(public_key, message_hash, signature)
}
