// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./staking/StakingDetails.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title AllianceBlock Staking contract
 * @notice Responsible for ALBT Staking
 * @dev Extends  Initializable, StakingDetails, OwnableUpgradeable
 */
contract Staking is Initializable, StakingDetails, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /**
     * @notice Initialize
     * @dev Initialize of the contract.
     * @param albt_ the albt IERC20 token
     * @param escrow_ the escrow address
     * @param stakingTypeAmounts_ the array of Staking Type Amounts
     * @param reputationalStakingTypeAmounts_ the array of Reputation Staking Type Amounts
     */
    function initialize(
        address albt_,
        address escrow_,
        uint256[] memory stakingTypeAmounts_,
        uint256[] memory reputationalStakingTypeAmounts_
    ) external initializer {
        require(albt_ != address(0), "Cannot initialize albt with 0 address");
        require(escrow_ != address(0), "Cannot initialize escrow_ with 0 address");
        require(stakingTypeAmounts_.length != 0, "Cannot initialize stakingTypeAmounts_ with 0");
        require(
            reputationalStakingTypeAmounts_.length != 0,
            "Cannot initialize reputationalStakingTypeAmounts_ with 0"
        );

        __Ownable_init();
        __ReentrancyGuard_init();

        albt = IERC20(albt_);
        escrow = IEscrow(escrow_);

        for (uint256 i = 0; i < stakingTypeAmounts_.length; i++) {
            stakingTypeAmounts[i] = stakingTypeAmounts_[i];
        }

        for (uint256 i = 0; i < reputationalStakingTypeAmounts_.length; i++) {
            reputationalStakingTypeAmounts[i] = reputationalStakingTypeAmounts_[i];
        }
    }

    /**
     * @notice Stake
     * @param stakingType The staking type
     * @dev requires not Delegator and cannot repeat staking type
     */
    function stake(StakingType stakingType) external nonReentrant() {
        require(balance[msg.sender] < stakingTypeAmounts[uint256(stakingType)], "Cannot stake for same type again");
        uint256 amount = stakingTypeAmounts[uint256(stakingType)];

        uint256 stakingTypeIndex = _getStakingType(msg.sender);

        _applyReputation(msg.sender, stakingTypeIndex, uint256(stakingType).add(1));

        uint256 amountToStake = amount.sub(balance[msg.sender]);
        _stake(msg.sender, amountToStake);
        emit Staked(msg.sender, amountToStake);
    }

    /**
     * @notice Unstake
     * @param stakingType The staking type to drop to
     * @dev msg.sender withdraws till reaching stakingType
     */
    function unstake(StakingType stakingType) external nonReentrant() {
        require(balance[msg.sender] > stakingTypeAmounts[uint256(stakingType)], "Can only drop to lower level");

        uint256 stakingTypeIndex = _getStakingType(msg.sender);
        uint256 amount = stakingTypeAmounts[uint256(stakingType)];

        _applyReputation(msg.sender, stakingTypeIndex, uint256(stakingType).add(1));

        uint256 amountToWithdraw = balance[msg.sender].sub(amount);
        _withdraw(msg.sender, amountToWithdraw);
    }

    /**
     * @notice Exit
     * @dev msg.sender withdraws and exits
     */
    function exit() external nonReentrant() {
        uint256 stakingTypeIndex = _getStakingType(msg.sender);

        _applyReputation(msg.sender, stakingTypeIndex, 0);

        uint256 amountToWithdraw = balance[msg.sender];

        _withdraw(msg.sender, amountToWithdraw);
    }

    /**
     * @notice Returns true if account is staker Lvl2 or more
     * @param account The staker to check for
     */
    function getEligibilityForActionProvision(address account) external view returns (bool) {
        if (balance[account] >= stakingTypeAmounts[1]) return true;
        return false;
    }

    /**
     * @notice Get Staking Type
     * @param account the address
     * @return the staking type
     */
    function _getStakingType(address account) internal view returns (uint256) {
        for (uint256 i = 0; i < 3; i++) {
            if (balance[account] == stakingTypeAmounts[i]) {
                return i.add(1);
            }
        }
        return 0;
    }

    /**
     * @notice Apply Reputation
     * @param account the address
     * @param previousLevelIndex The index of the previous level
     * @param newLevelIndex the index for the new level
     */
    function _applyReputation(
        address account,
        uint256 previousLevelIndex,
        uint256 newLevelIndex
    ) internal {
        if (previousLevelIndex < newLevelIndex) {
            uint256 amountToMint = _findAmount(newLevelIndex, previousLevelIndex);
            escrow.mintReputationalToken(account, amountToMint);
        } else {
            uint256 amountToBurn = _findAmount(previousLevelIndex, newLevelIndex);
            escrow.burnReputationalToken(account, amountToBurn);
        }
    }

    /**
     * @notice Find Amount
     * @param bigIndex ???
     * @param smallIndex ???
     * @return amount of reputation
     */
    function _findAmount(uint256 bigIndex, uint256 smallIndex) internal view returns (uint256 amount) {
        if (smallIndex == 0) {
            amount = reputationalStakingTypeAmounts[bigIndex.sub(1)];
        } else {
            amount = reputationalStakingTypeAmounts[bigIndex.sub(1)].sub(
                reputationalStakingTypeAmounts[smallIndex.sub(1)]
            );
        }
    }
}
