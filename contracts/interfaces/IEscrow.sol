// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

/**
 * @dev Interface of the Escrow.
 */
interface IEscrow {
    function receiveFunding(uint256 loanId, uint256 amount) external;
    function transferLoanNFT(uint256 loanId, uint256 partitionsToPurchase) external;
    function transferLendingToken(address borrower, uint256 amount) external;
}
