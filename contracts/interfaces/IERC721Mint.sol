// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

/**
 * @title Interface of the IERC721 mint function.
 */
interface IERC721Mint {
    function mint(address to) external virtual;
}
