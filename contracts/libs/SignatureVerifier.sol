// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;
pragma experimental ABIEncoderV2;

library SignatureVerifier {    
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

    bytes32 constant DOMAIN_SEPARATOR = 0x026c87c5ea84034c02b2828527576ab446ce44a5d09b63e31d0ee33f2a71444e;

    function hash(Action memory action) internal view returns (bytes32) {
        return keccak256(abi.encode(
            ACTION_TYPEHASH,
            keccak256(bytes(action.actionName)),
            keccak256(bytes(action.answer)),
            action.account,
            action.referralId
        ));
    }

    function verify(Action memory action, uint8 v, bytes32 r, bytes32 s) internal view returns (bool) {
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            hash(action)
        ));

        return ecrecover(digest, v, r, s) == action.account;
    }
}
