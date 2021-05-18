// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

/**
 * @dev Interface of the Escrow.
 */
interface IEscrow {
    function receiveFunding(uint256 loanId, uint256 amount) external;

    function transferFundingNFT(
        uint256 loanId,
        uint256 partitionsToPurchase,
        address receiver
    ) external;

    function transferLendingToken(address seeker, uint256 amount) external;

    function transferCollateralToken(
        address collateralToken,
        address seeker,
        uint256 amount
    ) external;
    function mintReputationalToken(address recipient, uint256 amount) external;
    function burnReputationalToken(address from, uint256 amount) external;

    function multiMintReputationalToken(address[] memory recipients, uint256[] memory amounts) external;
}
