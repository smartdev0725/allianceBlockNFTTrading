// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.7.0;

/**
 * @title The Token Format library
*/
library TokenFormat {
    // Use a split bit implementation.
    // Store the generation in the upper 128 bits..
    // ..and the non-fungible loan id in the lower 128
    uint256 private constant _LOAN_ID_MASK = uint128(~0);

    /**
     * @notice Format tokenId into generation and index
     * @param tokenid The Id of the token
     * @return (the generation of the token, the loan ID)
     */
    function formatTokenId(uint tokenId) internal pure returns(uint generation, uint loanId) {
        generation = tokenId >> 128;
        loanId = tokenId & _LOAN_ID_MASK;
    }

    /**
     * @notice get tokenId from generation and loanId
     * @param gen the generation
     * @param loanid the loanID
     * @return the token id
     */
    function getTokenId(uint gen, uint loanId) internal pure returns(uint tokenId) {
        return (gen << 128) | loanId;
    }
}
