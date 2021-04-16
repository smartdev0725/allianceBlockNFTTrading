pragma solidity ^0.7.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./StakingTypesAndStorage.sol";
import "hardhat/console.sol";

contract DaoStaking is StakingTypesAndStorage {
    using SafeMath for uint256;

    function provideStakingForDaoMembership(address staker) external onlyGovernance() {
        require(balance[staker] == stakingTypeAmounts[uint256(StakingType.STAKER)], "Must be already a staker");

        uint256 amount = stakingTypeAmounts[uint256(StakingType.DAO_MEMBER)].sub(
            stakingTypeAmounts[uint256(StakingType.STAKER)]);

        freezed[staker] = true;

        _stake(staker, amount);
    }

    function provideStakingForDaoDelegator(address staker) external onlyGovernance() {
        require(balance[staker] == stakingTypeAmounts[uint256(StakingType.DAO_MEMBER)], "Must be already a dao member subscriber");

        uint256 amount = stakingTypeAmounts[uint256(StakingType.DAO_DELEGATOR)].sub(
            stakingTypeAmounts[uint256(StakingType.DAO_MEMBER)]);

        _stake(staker, amount);
    }

    function provideRewards(uint256 amountForDaoMembers, uint256 amountForDaoDelegators) external onlyGovernance() {
        rewardsPerEpochForDaoMembers[currentEpoch] = amountForDaoMembers;
        rewardsPerEpochForDaoDelegators[currentEpoch] = amountForDaoDelegators;

        currentEpoch = currentEpoch.add(1);
    }

    function withdrawRewardsForDaoEpoch(uint256 epoch) external {
        require(epoch < currentEpoch, "Can withdraw only for previous epoch");

        (bool isDaoMember, bool isDaoDelegator, uint256 amountOfDaoMembers, uint256 amountOfDaoDelegators) =
            governance.isDaoAssociated(msg.sender, epoch);
        require(isDaoMember || isDaoDelegator, "Should be part of the dao");

        require(!hasWithdrawn[msg.sender], "Already withdrawn");
        hasWithdrawn[msg.sender] = true;

        uint256 amountToWithdraw;

        if(isDaoMember) {
            amountToWithdraw = rewardsPerEpochForDaoMembers[epoch].div(amountOfDaoMembers);
        } else {            
            amountToWithdraw = rewardsPerEpochForDaoDelegators[epoch].div(amountOfDaoDelegators);
        }

        _withdraw(msg.sender, amountToWithdraw);
    }

    function _withdraw(address staker_, uint256 amount_) internal {
        totalSupply = totalSupply.sub(amount_);
        balance[staker_] = balance[staker_].sub(amount_);
        albt.transfer(staker_, amount_);
    }

    function _stake(address staker_, uint256 amount_) internal {
        albt.transferFrom(staker_, address(this), amount_);
        totalSupply = totalSupply.add(amount_);
        balance[staker_] = balance[staker_].add(amount_);
    }
}
