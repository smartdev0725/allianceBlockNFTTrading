// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

/**
 * @dev Interface of the Staking contract.
 */
interface IStaking {
	function provideStakingForDaoMembership(address staker) external;
	function provideStakingForDaoDelegator(address staker) external;
}
