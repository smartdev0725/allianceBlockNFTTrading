// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.7.0;

/**
 * @title The Token Format library
 */
library TokenFormat {
    // Use a split bit implementation.
    // Store the generation in the upper 128 bits..
    // ..and the non-fungible investment id in the lower 128
    uint256 private constant _INVESTMENT_ID_MASK = uint128(~0);

    /**
     * @notice Format tokenId into generation and index
     * @param tokenId The Id of the token
     * @return generation
     * @return investmentId
     */
    function formatTokenId(uint256 tokenId) internal pure returns (uint256 generation, uint256 investmentId) {
        generation = tokenId >> 128;
        investmentId = tokenId & _INVESTMENT_ID_MASK;
    }

    /**
     * @notice get tokenId from generation and investmentId
     * @param gen the generation
     * @param investmentId the investmentID
     * @return tokenId the token id
     */
    function getTokenId(uint256 gen, uint256 investmentId) internal pure returns (uint256 tokenId) {
        return (gen << 128) | investmentId;
    }
}
