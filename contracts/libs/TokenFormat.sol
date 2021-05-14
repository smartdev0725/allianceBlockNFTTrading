// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.7.0;

library TokenFormat {
    // Use a split bit implementation.
    // Store the generation in the upper 128 bits..
    // ..and the non-fungible loan id in the lower 128
    uint256 private constant _LOAN_ID_MASK = uint128(~0);

    /**
     * @dev Format tokenId into generation and index
     */
    function formatTokenId(uint tokenId) internal pure returns(uint generation, uint loanId) {
        generation = tokenId >> 128;
        loanId = tokenId & _LOAN_ID_MASK;
    }

    /**
     * @dev get tokenId from generation and loanId
     */
    function getTokenId(uint gen, uint loanId) internal pure returns(uint tokenId) {
        return (gen << 128) | loanId;
    }
}
