// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "./InvestmentDetails.sol";
import "../../libs/SafeERC20.sol";
import "../../libs/TokenFormat.sol";

contract InvestmentWithMilestones is Initializable, InvestmentDetails, ReentrancyGuardUpgradeable {
    using SafeMath for uint256;
    using TokenFormat for uint256;
    using SafeERC20 for IERC20;

    function initialize(
        address escrowAddress,
        address governanceAddress_,
        address[] memory lendingTokens_,
        address fundingNFT_,
        address projectManager_,
        uint256 baseAmountForEachPartition_
    ) public initializer {
        require(escrowAddress != address(0), "Cannot initialize escrowAddress with 0 address");
        require(governanceAddress_ != address(0), "Cannot initialize governanceAddress_ with 0 address");
        require(fundingNFT_ != address(0), "Cannot initialize fundingNFT_ with 0 address");
        require(projectManager_ != address(0), "Cannot initialize projectManager with 0 address");
        require(baseAmountForEachPartition_ != 0, "Cannot initialize baseAmountForEachPartition_ with 0");

        __ReentrancyGuard_init();
        __BaseProject_init();

        escrow = IEscrow(escrowAddress);
        baseAmountForEachPartition = baseAmountForEachPartition_;
        governance = IGovernance(governanceAddress_);
        fundingNFT = IERC1155Mint(fundingNFT_);
        projectManager = IProjectManager(projectManager_);

        for (uint256 i = 0; i < lendingTokens_.length; i++) {
            require(lendingTokens_[i] != address(0), "Cannot initialize lendingToken_ with 0 address");
            isValidLendingToken[lendingTokens_[i]] = true;
        }
    }

    function requestInvestmentWithMilestones(
        address investmentToken,
        uint256[] memory amountPerMilestone,
        uint256[] memory milestoneDurations,
        address lendingToken,
        uint256 totalAmountRequested_,
        string calldata extraInfo
    ) external nonReentrant() {
        require(isValidLendingToken[lendingToken], "Lending token not supported");
        require(amountPerMilestone.length == milestoneDurations.length, "Should be the same milestone length");

        uint256 totalAmountOfInvestmentTokens = _storeMilestoneDetailsAndGetTotalAmount(amountPerMilestone, milestoneDurations);

        require(
            totalAmountRequested_.mod(baseAmountForEachPartition) == 0 &&
                totalAmountOfInvestmentTokens.mod(totalAmountRequested_.div(baseAmountForEachPartition)) == 0,
            "Token amount and price should result in integer amount of tickets"
        );

        uint256 projectId = _storeInvestmentDetails(
            lendingToken,
            totalAmountRequested_,
            investmentToken,
            totalAmountOfInvestmentTokens,
            extraInfo
        );

        IERC20(investmentToken).safeTransferFrom(msg.sender, address(escrow), amountPerMilestone[0]);

        fundingNFT.mintGen0(address(escrow), investmentDetails[projectId].totalPartitionsToBePurchased, projectId);

    }
}