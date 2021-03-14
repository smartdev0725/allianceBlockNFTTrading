// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

/**
 * @dev Interface of the Staking contract.
 */
interface IStaking {
    function balanceOf(address account) external view returns (uint256);
    function freeze(address staker) external;
    function unfreeze(address staker) external;
}
