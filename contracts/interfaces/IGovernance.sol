// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

/**
 * @title Interface of the Governance contract.
 */
interface IGovernance {
    function requestApproval(
        uint256 investmentId
    ) external;

    function storeInvestmentTriggering(uint256 investmentId) external;
}
