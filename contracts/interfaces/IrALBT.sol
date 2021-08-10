// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

/**
 * @title Interface of the rALBT.
 */
interface IrALBT {
    function mint(uint256 amountToMint) external;

    function burn(uint256 amountToBurn) external;
}
