// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

/**
 * @title Interface of the Governance contract.
 */
interface IGovernance {
    function requestApproval(
        uint256 investmentId
    ) external;

    function storeInvestmentTriggering(uint256 investmentId) external;
}
