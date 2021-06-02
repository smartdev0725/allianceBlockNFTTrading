// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "./BytesReader.sol";

/**
 * @title Signature Verifier Library
*/
library SignatureVerifier {
    using BytesReader for bytes;
    struct EIP712Domain {
        string  name;
        string  version;
        uint256 chainId;
        address verifyingContract;
    }

    struct Action {
        string actionName;
        string answer;
        address account;
        uint256 referralId;
    }

    bytes32 constant ACTION_TYPEHASH = 0x1f76bf6993440811cef7b51dc00dee9d4e8fa911023c7f2d088ce4e46ac2346f;

    bytes32 constant DOMAIN_SEPARATOR = 0x1dfa77e97babb94d286b16b99eb32c73720eb70b034d837f9cc6c0d2b01ba2ce;

    /**
     * @notice Gets Actions struct hash
     * @param action the Action to retrieve
     * @return the keccak hash Action struct
    */
    function getActionStructHash(Action memory action) internal view returns (bytes32) {
        return keccak256(abi.encode(
            ACTION_TYPEHASH,
            keccak256(bytes(action.actionName)),
            keccak256(bytes(action.answer)),
            action.account,
            action.referralId
        ));
    }

    /**
     * @notice Gets Actions typed data hash
     * @param action the Action to retrieve
     * @return actionHash actionHash the keccak Action hash
    */
    function getActionTypedDataHash(Action memory action) internal view returns (bytes32 actionHash) {
        actionHash = keccak256(abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            getActionStructHash(action)
        ));
    }

    /**
     * @notice Verifies that an action has been signed by the action.account.
     * @param action The action to verify the signature for.
     * @param signature Proof that the hash has been signed by action.account.
     * @return True if the address recovered from the provided signature matches the action.account.
    */
    function isValidSignature(
        Action memory action,
        bytes memory signature
    )
        internal
        view
        returns (bool)
    {
        if (signature.length != 65) return false;

        bytes32 hash = getActionTypedDataHash(action);

        uint8 v = uint8(signature[0]);
        bytes32 r = signature.readBytes32(1);
        bytes32 s = signature.readBytes32(33);

        address recovered = ecrecover(hash, v, r, s);

        return action.account == recovered;
    }
}
