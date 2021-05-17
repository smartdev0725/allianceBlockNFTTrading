// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

/**
 * @dev Interface of the Governance contract used by staking contract.
 */
interface IGovernanceStaking {
    function isDaoAssociated(address account, uint256 epoch) external view returns(bool, bool, uint256, uint256);
}
