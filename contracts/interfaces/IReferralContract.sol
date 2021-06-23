// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

/**
 * @title Interface of every referral contract.
 */
interface IReferralContract {
    function isValidReferralId(uint256 referralId) external view returns (bool);
}
