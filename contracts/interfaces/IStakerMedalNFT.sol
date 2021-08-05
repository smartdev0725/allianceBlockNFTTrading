// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

/**
 * @title Interface of the StakerMedalNFT contract.
 */
interface IStakerMedalNFT {
    function getLevelOfStaker(address account) external view returns (uint256);
}
