## `SignatureVerifier`






### `getActionStructHash(struct SignatureVerifier.Action action) → bytes32` (internal)

Gets Actions struct hash




### `getActionTypedDataHash(struct SignatureVerifier.Action action, bytes32 DOMAIN_SEPARATOR) → bytes32 actionHash` (internal)

Gets Actions typed data hash




### `isValidSignature(struct SignatureVerifier.Action action, bytes signature, bytes32 DOMAIN_SEPARATOR) → bool` (internal)

Verifies that an action has been signed by the action.account.





