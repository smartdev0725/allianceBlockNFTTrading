// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

/**
 * @dev Interface of the rALBT.
 */
interface IrALBT {
    function mint(uint256 amountToMint) external;
    function burn(uint256 amountToBurn) external;
}
