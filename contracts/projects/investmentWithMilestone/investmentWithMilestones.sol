// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "./InvestmentWithMilestoneDetails.sol";
import "../../libs/SafeERC20.sol";
import "../../libs/TokenFormat.sol";

contract InvestmentWithMilestones is Initializable, InvestmentWithMilestoneDetails, ReentrancyGuardUpgradeable {
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

        currentMilestonePerProject[projectId] += 1;

        // Add event for investment request
        emit ProjectRequested(projectId, msg.sender, totalAmountRequested_);

    }

    /**
     * @notice user show interest for investment
     * @dev This function is called by the investors who are interested to invest in a specific investment token.
     * @dev require Approval state and valid partition
     * @param projectId The id of the investment.
     * @param amountOfPartitions The amount of partitions this specific investor wanna invest in.
     */
    function showInterestForInvestment(uint256 projectId, uint256 amountOfPartitions) external  nonReentrant() {
        require(
            projectStatus[projectId] == ProjectLibrary.ProjectStatus.APPROVED,
            "Can show interest only in Approved state"
        );
        require(amountOfPartitions > 0, "Cannot show interest for 0 partitions");

        IERC20(investmentMilestoneDetails[projectId].lendingToken).safeTransferFrom(
            msg.sender, address(escrow), amountOfPartitions.mul(baseAmountForEachPartition)
        );

        investmentMilestoneDetails[projectId].partitionsRequested = investmentMilestoneDetails[projectId].partitionsRequested.add(
            amountOfPartitions
        );

        // if it's not the first time calling the function lucky numbers are not provided again.
        if (remainingTicketsPerAddress[projectId][msg.sender] > 0 || ticketsWonPerAddress[projectId][msg.sender] > 0) {
            remainingTicketsPerAddress[projectId][msg.sender] =
                remainingTicketsPerAddress[projectId][msg.sender].add(amountOfPartitions);
        }
        else {
            // _applyImmediateTicketsAndProvideLuckyNumbers(projectId, amountOfPartitions);
        }

        // Add event for investment interest
        emit ProjectInterest(projectId, amountOfPartitions);

    }


    /**
     * @notice Convert Investment Tickets to Nfts.
     * @dev This function is called by an investor to convert his tickets won to NFTs.
     * @dev require Settled state and enough tickets won
     * @param projectId The id of the investment.
     */
    function convertInvestmentTicketsToNfts(
        uint256 projectId
    ) external  nonReentrant() {
        require(projectStatus[projectId] == ProjectLibrary.ProjectStatus.SETTLED, "Can convert only in Settled state");
        require(
            ticketsWonPerAddress[projectId][msg.sender] > 0,
            "Not enough tickets won"
        );

        uint256 ticketsToConvert = ticketsWonPerAddress[projectId][msg.sender];
        ticketsWonPerAddress[projectId][msg.sender] = 0;

        escrow.transferFundingNFT(projectId, ticketsToConvert, msg.sender);

        if (remainingTicketsPerAddress[projectId][msg.sender] > 0) {
            _withdrawAmountProvidedForNonWonTickets(projectId);
        }

        // emit ConvertInvestmentTickets(projectId, msg.sender, ticketsToConvert);
    }

    function decideForProject(uint256 projectId, bool decision) external onlyGovernance() {
        if (decision) _approveInvestment(projectId);
        else _rejectInvestment(projectId);
    }

    function startLotteryPhase(uint256 projectId) external onlyGovernance() {
        _startInvestment(projectId);
    }

    // This is called by seeker
    function requestNextMilestoneStep(uint256 projectId) external {
        uint currentStep = currentMilestonePerProject[projectId];
        IERC20(investmentMilestoneDetails[projectId].investmentToken).safeTransferFrom(msg.sender, address(escrow), investmentMilestoneDetails[projectId].investmentTokensAmountPerMilestone[currentStep]);
        currentMilestonePerProject[projectId] += 1;
    }

    /**
     * @dev This function is called by the seeker to withdraw the lending tokens provided by investors after lottery ends.
     * @param projectId The id of the investment.
     */
    function withdrawInvestment(uint256 projectId, uint256 step) external nonReentrant() {
        require(projectStatus[projectId] == ProjectLibrary.ProjectStatus.SETTLED, "Can withdraw only in Settled state");
        require(projectSeeker[projectId] == msg.sender, "Only seeker can withdraw");
        require(currentMilestonePerProject[projectId] > step, "Insufficient withdraw");
        require(!investmentWithdrawnPerMilestone[projectId][step], "Already withdrawn");
        uint256 amountToWithdraw = investmentMilestoneDetails[projectId].eachAmountToBeRaisedPerMilestone[step];
        investmentWithdrawnPerMilestone[projectId][step] = true;

        escrow.transferLendingToken(investmentMilestoneDetails[projectId].lendingToken, msg.sender, amountToWithdraw);
        // TODO : emit seekerWithdrawInvestment(projectId, amountToWithdraw);
    }

    function decideForNextMilestone(uint256 projectId, bool decision) external onlyGovernance() {
        if (decision) _approveInvestment(projectId);
        else _rejectInvestment(projectId);
    }

    function _withdrawAmountProvidedForNonWonTickets(uint256 projectId_) internal {
        uint256 amountToReturnForNonWonTickets =
            remainingTicketsPerAddress[projectId_][msg.sender].mul(baseAmountForEachPartition);
        remainingTicketsPerAddress[projectId_][msg.sender] = 0;

        escrow.transferLendingToken(investmentMilestoneDetails[projectId_].lendingToken, msg.sender, amountToReturnForNonWonTickets);

        // Add event for withdraw amount provided for non tickets
        // emit LotteryLoserClaimedFunds(projectId_, amountToReturnForNonWonTickets);
    }

    function _startInvestment(uint256 projectId_) internal {
        // In order to start a project, it has to be in approved status
        require(projectStatus[projectId_] == ProjectLibrary.ProjectStatus.APPROVED, "Can start a project only if is approved");

        projectStatus[projectId_] = ProjectLibrary.ProjectStatus.STARTED;
        investmentMilestoneDetails[projectId_].startingDate = block.timestamp;

        emit ProjectStarted(projectId_);
    }

    function _approveInvestment(uint256 projectId_) internal {
        projectStatus[projectId_] = ProjectLibrary.ProjectStatus.APPROVED;
        investmentMilestoneDetails[projectId_].approvalDate = block.timestamp;
        ticketsRemaining[projectId_] = investmentMilestoneDetails[projectId_].totalPartitionsToBePurchased;
        // governance.storeInvestmentTriggering(projectId_);
        // emit ProjectApproved(projectId_);
    }

    function _checkCurrentMilestone(uint256 currentStep) internal returns (bool) {
        
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