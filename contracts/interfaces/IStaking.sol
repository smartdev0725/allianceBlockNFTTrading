// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

/**
 * @dev Interface of the Staking contract.
 */
interface IStaking {
    function getBalance(address staker_) external view returns (uint256);
	function provideStakingForDaoMembership(address staker) external;
	function provideStakingForDaoDelegator(address staker) external;
	function provideRewards(uint256 amountForDaoMembers, uint256 amountForDaoDelegators, uint256 epoch) external;
	function unstakeDao(address staker, bool isDaoMember) external;
	function getAmountsToStake() external view returns (uint256, uint256, uint256);
}
