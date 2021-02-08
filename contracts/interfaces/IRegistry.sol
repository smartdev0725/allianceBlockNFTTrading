// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

/**
 * @dev Interface of the Registry contract.
 */
interface IRegistry {
    function decideForLoan(uint256 loanId, bool decision) external;
    function decideForMilestone(uint256 loanId, bool decision) external;
}
