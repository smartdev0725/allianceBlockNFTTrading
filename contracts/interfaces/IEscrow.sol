// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

/**
 * @dev Interface of the Escrow.
 */
interface IEscrow {
    function receiveFunding(uint256 loanId, uint256 amount) external;
}
