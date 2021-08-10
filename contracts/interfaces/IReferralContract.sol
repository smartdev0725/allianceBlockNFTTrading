// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

/**
 * @title Interface of every referral contract.
 */
interface IReferralContract {
    function isValidReferralId(uint256 referralId) external view returns (bool);
}
