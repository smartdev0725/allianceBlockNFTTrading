// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

/**
 * @title Bytes Reader Library
 */
library BytesReader {
    /**
     * @notice Reads a bytes32 value from a position in a byte array.
     * @param b Byte array containing a bytes32 value.
     * @param index Index in byte array of bytes32 value.
     * @return result bytes32 value from byte array.
     */
    function readBytes32(bytes memory b, uint256 index) internal pure returns (bytes32 result) {
        if (b.length < index + 32) {
            return bytes32(0);
        }

        // Arrays are prefixed by a 256 bit length parameter
        index += 32;

        // Read the bytes32 from array memory
        assembly {
            result := mload(add(b, index))
        }

        return result;
    }
}
