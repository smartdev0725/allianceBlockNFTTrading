// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

/**
 * @dev Interface of the IERC1155 mint function.
 */
interface IERC1155Mint {
    function mintGen0(address to, uint256 amount) external;

    function mintOfGen(
        address to,
        uint256 amount,
        uint256 generation
    ) external;

    function decreaseGenerations(
        uint256 tokenId,
        address user,
        uint256 amount,
        uint256 generationsToDecrease
    ) external;

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external;

    function pauseTokenTransfer(uint256 loanId) external;

    function unpauseTokenTransfer(uint256 tokenId) external;

    function increaseGenerations(
        uint256 tokenId,
        address user,
        uint256 amount,
        uint256 generationsToAdd
    ) external;

    function balanceOf(address account, uint256 id)
        external
        view
        returns (uint256);

    function burn(
        address account,
        uint256 id,
        uint256 amount
    ) external;
}
