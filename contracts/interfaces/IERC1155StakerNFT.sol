// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

/**
 * @title Interface of the IERC1155StakerNFT function.
 */
interface IERC1155StakerNFT {
    function burn(
        address account,
        uint256 id
    ) external;

    function mint(
        address account,
        uint256 id
    ) external;

    function balanceOf(address account, uint256 id) external view returns (uint256);

}
