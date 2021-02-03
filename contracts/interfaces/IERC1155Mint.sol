// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

/**
 * @dev Interface of the IERC1155 mint function.
 */
interface IERC1155Mint {
    function mintGen0(address to, uint amount) external virtual;
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external virtual;
    function pauseTokenTransfer(uint loanId) external virtual;
    function unpauseTokenTransfer(uint tokenId) external virtual;
}
