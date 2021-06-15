// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

/**
 * @title Interface of the Governance contract.
 */
interface IGovernance {
    function requestApproval(
        uint256 loanId,
        bool isMilestone,
        uint256 milestoneNumber
    ) external;

    function storeInvestmentTriggering(uint256 loanId) external;
}
