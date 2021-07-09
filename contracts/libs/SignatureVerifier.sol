// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "./BytesReader.sol";

/**
 * @title Signature Verifier Library
 */
library SignatureVerifier {
    using BytesReader for bytes;

    struct Action {
        string actionName;
        string answer;
        address account;
        uint256 referralId;
    }
    bytes32 constant ACTION_TYPEHASH = 0x1f76bf6993440811cef7b51dc00dee9d4e8fa911023c7f2d088ce4e46ac2346f;

    /**
     * @notice Gets Actions struct hash
     * @param action the Action to retrieve
     * @return the keccak hash Action struct
     */
    function getActionStructHash(Action memory action) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    ACTION_TYPEHASH,
                    keccak256(bytes(action.actionName)),
                    keccak256(bytes(action.answer)),
                    action.account,
                    action.referralId
                )
            );
    }

    /**
     * @notice Gets Actions typed data hash
     * @param action the Action to retrieve
     * @return actionHash actionHash the keccak Action hash
     */
    function getActionTypedDataHash(Action memory action, bytes32 DOMAIN_SEPARATOR)
        internal
        pure
        returns (bytes32 actionHash)
    {
        actionHash = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, getActionStructHash(action)));
    }

    /**
     * @notice Verifies that an action has been signed by the action.account.
     * @param action The action to verify the signature for.
     * @param signature Proof that the hash has been signed by action.account.
     * @return True if the address recovered from the provided signature matches the action.account.
     */
    function isValidSignature(
        Action memory action,
        bytes memory signature,
        bytes32 DOMAIN_SEPARATOR
    ) internal pure returns (bool) {
        if (signature.length != 65) return false;

        bytes32 hash = getActionTypedDataHash(action, DOMAIN_SEPARATOR);
        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := and(mload(add(signature, 65)), 255)
        }

        address recovered = ecrecover(hash, v, r, s);

        require(recovered != address(0), "Recovered address should not be zero");

        return action.account == recovered;
    }
}
