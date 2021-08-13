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

        // uint256 totalAmountOfInvestmentTokens = _storeMilestoneDetailsAndGetTotalAmount(amountPerMilestone, milestoneDurations);

        (uint256 totalAmountOfInvestmentTokens, uint256 projectId) = _storeMilestoneDetailsAndGetTotalAmount(
            lendingToken,
            totalAmountRequested_,
            investmentToken,
            amountPerMilestone,
            milestoneDurations,
            extraInfo
        );

        require(
            totalAmountRequested_.mod(baseAmountForEachPartition) == 0 &&
                totalAmountOfInvestmentTokens.mod(totalAmountRequested_.div(baseAmountForEachPartition)) == 0,
            "Token amount and price should result in integer amount of tickets"
        );

        IERC20(investmentToken).safeTransferFrom(msg.sender, address(escrow), amountPerMilestone[0]);

        fundingNFT.mintGen0(address(escrow), investmentMilestoneDetails[projectId].totalPartitionsToBePurchased, projectId);

        investmentTokensPerTicket[projectId] = totalAmountOfInvestmentTokens.div(investmentMilestoneDetails[projectId].totalPartitionsToBePurchased);

        fundingNFT.pauseTokenTransfer(projectId); //Pause trades for ERC1155s with the specific investment ID.

        governance.requestApproval(projectId);

        // Add event for investment request
        emit ProjectRequested(projectId, msg.sender, totalAmountRequested_);

    }

    function _approveInvestment(uint256 projectId_) internal {
        projectStatus[projectId_] = ProjectLibrary.ProjectStatus.APPROVED;
        investmentMilestoneDetails[projectId_].approvalDate = block.timestamp;
        ticketsRemaining[projectId_] = investmentMilestoneDetails[projectId_].totalPartitionsToBePurchased;
        // governance.storeInvestmentTriggering(projectId_);
        // emit ProjectApproved(projectId_);
    }

    /**
     * @notice Reject Investment
     * @param projectId_ The id of the investment.
     */
    function _rejectInvestment(uint256 projectId_) internal {
        projectStatus[projectId_] = ProjectLibrary.ProjectStatus.REJECTED;
        escrow.transferInvestmentToken(
            investmentMilestoneDetails[projectId_].investmentToken,
            projectSeeker[projectId_],
            investmentMilestoneDetails[projectId_].investmentTokensAmountPerMilestone[0]
        );
        emit ProjectRejected(projectId_);
    }
}