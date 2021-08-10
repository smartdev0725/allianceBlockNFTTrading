// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

/**
 * @title Interface of the Staking contract.
 */
interface IStaking {
    function getBalance(address staker_) external view returns (uint256);

    function getAmountsToStake()
        external
        view
        returns (
            uint256,
            uint256,
            uint256
        );

    function getEligibilityForActionProvision(address account) external view returns (bool);
}
