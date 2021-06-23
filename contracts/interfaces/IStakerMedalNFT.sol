// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

/**
 * @title Interface of the StakerMedalNFT contract.
 */
interface IStakerMedalNFT {
    function getLevelOfStaker(address account) external view returns (uint256);
}
