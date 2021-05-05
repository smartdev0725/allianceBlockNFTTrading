// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./LoanDetails.sol";
import "../libs/TokenFormat.sol";

/**
 * @title AllianceBlock ProjectLoan contract
 * @notice Functionality for Project Loan.
 */
contract ProjectLoan is LoanDetails {
    using SafeMath for uint256;
    using TokenFormat for uint256;

    // Events
    event ProjectLoanRequested(
        uint256 indexed loanId,
        address indexed user,
        uint256 amount
    );
    event ProjectLoanMilestoneApprovalRequested(
        uint256 indexed loanId,
        uint256 milestoneNumber
    );
    event ProjectLoanMilestoneDecided(uint256 indexed loanId, bool decision);
    event ProjectTokenPaymentReceived(
        uint256 indexed loanId,
        address indexed user,
        uint256 amountOfProjectTokens,
        uint256 discountedPrice
    );

    /**
     * @dev This function is used for potential borrowing project to request a loan.
     * @param amountRequestedPerMilestone The lending amounts project is looking to get for each milestone.
     * @param collateralToken The token that will be used by the proect as collateral.
     * @param collateralAmount The amount of tokens that will be used by the project as collateral.
     * @param projectTokenPrice The price the project wants to sell its token for.
     * @param interestPercentage The interest percentage that will be obtained after whole repayment.
     * @param discountPerMillion The discount given on the token price when funders claim repayment in project tokens.
     * @param totalMilestones The total amount of Milestones project is requesting funds for.
     * @param milestoneDurations The duration of each Milestone.
     * @param paymentTimeInterval The time interval between the last milestone delivery by the project and
     * the repayment of the loan by the project.
     * @param extraInfo The ipfs hash where more specific details for loan request are stored.
     */
    function requestProjectLoan(
        uint256[] calldata amountRequestedPerMilestone,
        address collateralToken,
        uint256 collateralAmount,
        uint256 projectTokenPrice,
        uint256 interestPercentage,
        uint256 discountPerMillion,
        uint256 totalMilestones,
        uint256[] calldata milestoneDurations,
        uint256 paymentTimeInterval,
        string memory extraInfo
    ) external onlyAcceptedNumberOfMilestones(totalMilestones) {
        require(
            (amountRequestedPerMilestone.length == totalMilestones) &&
                (milestoneDurations.length == totalMilestones),
            "Total milestones requested should coincide with requested amounts and durations"
        );

        uint256 totalAmountRequested =
            _storeMilestoneDetailsAndGetTotalAmount(
                amountRequestedPerMilestone,
                milestoneDurations,
                totalMilestones
            );

        _storeLoanDetails(
            LoanLibrary.LoanType.PROJECT,
            totalAmountRequested,
            collateralToken,
            collateralAmount,
            interestPercentage,
            extraInfo
        );

        _storeProjectLoanPayments(
            discountPerMillion,
            projectTokenPrice,
            totalMilestones,
            paymentTimeInterval
        );

        IERC20(collateralToken).transferFrom(
            msg.sender,
            address(escrow),
            collateralAmount
        );

        // TODO - Mint Correctly And Burn on Settlement
        // mainNFT.mint(address(escrow));
        loanNFT.mintOfGen(
            address(escrow),
            loanDetails[totalLoans].totalPartitions,
            totalMilestones.sub(1)
        );

        loanNFT.pauseTokenTransfer(totalLoans); //Pause trades for ERC1155s with the specific loan ID.

        governance.requestApproval(totalLoans, false, 0);

        emit ProjectLoanRequested(totalLoans, msg.sender, totalAmountRequested);

        totalLoans = totalLoans.add(1);
    }

    /**
     * @dev This function is used by the project to apply a milestone for a specific loan.
     * @param loanId The id of the loan.
     */
    function applyMilestone(uint256 loanId)
        external
        onlyBorrower(loanId)
        onlyActiveLoan(loanId)
        onlyProjectLoan(loanId)
        onlyBetweenMilestoneTimeframe(loanId)
    {
        loanStatus[loanId] = LoanLibrary.LoanStatus.AWAITING_MILESTONE_APPROVAL;
        governance.requestApproval(
            loanId,
            true,
            projectLoanPayments[loanId].milestonesDelivered
        );

        emit ProjectLoanMilestoneApprovalRequested(
            loanId,
            projectLoanPayments[loanId].milestonesDelivered
        );
    }

    /**
     * @dev This function is called by governance to approve or reject an applied milestone's request.
     * @param loanId The id of the loan.
     * @param decision The decision of the governance. [true -> approved] [false -> rejected]
     */
    function decideForMilestone(uint256 loanId, bool decision)
        external
        onlyGovernance()
        onlyWhenAwaitingMilestoneApproval(loanId)
        onlyProjectLoan(loanId)
    {
        if (decision) _approveMilestone(loanId);
        else _rejectMilestone(loanId);

        emit ProjectLoanMilestoneDecided(loanId, decision);
    }

    function _approveMilestone(uint256 loanId_) internal {
        projectLoanPayments[loanId_].milestonesDelivered = projectLoanPayments[
            loanId_
        ]
            .milestonesDelivered
            .add(1);

        // Milestones completed
        if (
            projectLoanPayments[loanId_].milestonesDelivered ==
            projectLoanPayments[loanId_].totalMilestones
        ) {
            loanStatus[loanId_] = LoanLibrary.LoanStatus.AWAITING_REPAYMENT;
            projectLoanPayments[loanId_].awaitingForRepaymentDate = block
                .timestamp;
            // Milestones missing
        } else {
            loanStatus[loanId_] = LoanLibrary
                .LoanStatus
                .AWAITING_MILESTONE_APPLICATION;
            escrow.transferLendingToken(
                loanBorrower[loanId_],
                projectLoanPayments[loanId_].milestoneLendingAmount[
                    projectLoanPayments[loanId_].milestonesDelivered
                ]
            );
            projectLoanPayments[loanId_]
                .currentMilestoneStartingTimestamp = block.timestamp;
            projectLoanPayments[loanId_]
                .currentMilestoneDeadlineTimestamp = block.timestamp.add(
                projectLoanPayments[loanId_].milestoneDuration[
                    projectLoanPayments[loanId_].milestonesDelivered
                ]
            );
            // TODO: get real price from DEX, Oracle or user input
            projectLoanPayments[loanId_].milestoneProjectTokenPrice[
                projectLoanPayments[loanId_].milestonesDelivered
            ] = _getMockedPriceForMilestone(0);
        }
    }

    function _rejectMilestone(uint256 loanId_) internal {
        loanStatus[loanId_] == LoanLibrary.LoanStatus.STARTED;
        if (
            projectLoanPayments[loanId_].currentMilestoneDeadlineTimestamp <=
            block.timestamp
        ) {
            _challengeProjectLoan(loanId_);
        }
    }

    function _storeProjectLoanPayments(
        uint256 discountPerMillion_,
        uint256 projectTokenPrice_,
        uint256 totalMilestones_,
        uint256 paymentTimeInterval_
    ) internal {
        projectLoanPayments[totalLoans]
            .discountPerMillion = discountPerMillion_;
        projectLoanPayments[totalLoans].milestoneProjectTokenPrice[
            0
        ] = projectTokenPrice_;
        projectLoanPayments[totalLoans].totalMilestones = totalMilestones_;
        projectLoanPayments[totalLoans]
            .paymentTimeInterval = paymentTimeInterval_;
    }

    function _storeMilestoneDetailsAndGetTotalAmount(
        uint256[] memory amountRequestedPerMilestone,
        uint256[] memory milestoneDurations,
        uint256 totalMilestones
    ) internal returns (uint256 totalAmountRequested) {
        for (uint256 i = 0; i < totalMilestones; i++) {
            require(
                amountRequestedPerMilestone[i].mod(
                    baseAmountForEachPartition
                ) == 0,
                "Requested milestone amounts must be multipliers of base amount"
            );
            projectLoanPayments[totalLoans].milestoneLendingAmount[
                i
            ] = amountRequestedPerMilestone[i];
            projectLoanPayments[totalLoans].milestoneDuration[
                i
            ] = milestoneDurations[i];

            totalAmountRequested = totalAmountRequested.add(
                amountRequestedPerMilestone[i]
            );
        }
    }

    function _startProjectLoan(uint256 loanId_) internal {
        projectLoanPayments[loanId_].currentMilestoneStartingTimestamp = block
            .timestamp;
        projectLoanPayments[loanId_].currentMilestoneDeadlineTimestamp = block
            .timestamp
            .add(projectLoanPayments[loanId_].milestoneDuration[0]);

        escrow.transferLendingToken(
            loanBorrower[loanId_],
            projectLoanPayments[loanId_].milestoneLendingAmount[0]
        );
    }

    function _getMockedPriceForMilestone(uint256 milestone)
        internal
        returns (uint256 price)
    {
        price = milestone.add(1);
    }

    function _challengeProjectLoan(uint256 loanId_) internal {
        projectLoanPayments[loanId_].milestonesExtended = projectLoanPayments[
            loanId_
        ]
            .milestonesExtended
            .add(1);

        if (projectLoanPayments[loanId_].milestonesExtended > 1) {
            loanStatus[loanId_] == LoanLibrary.LoanStatus.DEFAULT;
            // TODO - SPECIFY DEFAULT
        } else {
            projectLoanPayments[loanId_]
                .currentMilestoneDeadlineTimestamp = projectLoanPayments[
                loanId_
            ]
                .currentMilestoneDeadlineTimestamp
                .add(milestoneExtensionInterval);
        }
    }

    function _transferLoanNFTToProjectFunder(
        uint256 loanId_,
        uint256 partitionsFunded_,
        address funder_
    ) internal {
        uint256 tokenGeneration =
            projectLoanPayments[loanId_].totalMilestones.sub(1);
        uint256 tokenId = tokenGeneration.getTokenId(loanId_);
        escrow.transferLoanNFT(tokenId, partitionsFunded_, funder_);
        // Decrease the generation of a percentage of the tokens so they can already be converted in project tokens after every milestone instead of only being repaid at the end of the loan.
        for (
            uint256 i = 0;
            i < projectLoanPayments[loanId_].totalMilestones.sub(1);
            i++
        ) {
            uint256 partitionsToConvertAtMilestone =
                partitionsFunded_
                    .mul(projectLoanPayments[loanId_].milestoneLendingAmount[i])
                    .div(loanDetails[loanId_].lendingAmount);

            loanNFT.decreaseGenerations(
                tokenId,
                funder_,
                partitionsToConvertAtMilestone,
                tokenGeneration.sub(i)
            );
        }
    }

    function _executeProjectLoanPayment(uint256 loanId_)
        internal
        onlyOnProjectRepayment(loanId_)
    {
        IERC20(lendingToken).transferFrom(
            msg.sender,
            address(escrow),
            getAmountToBeRepaid(loanId_)
        );
        loanStatus[loanId_] = LoanLibrary.LoanStatus.SETTLED;
        escrow.transferCollateralToken(
            loanDetails[loanId_].collateralToken,
            loanBorrower[loanId_],
            loanDetails[loanId_].collateralAmount
        );
    }

    function _receiveProjectLoanPayment(
        uint256 loanId_,
        uint256 generation_,
        uint256 amountOfTokens_,
        bool onProjectTokens_
    ) internal {
        if (onProjectTokens_) {
            _receiveProjectTokenPayment(loanId_, amountOfTokens_);
        } else {
            _receiveLendingTokenPayment(loanId_, generation_, amountOfTokens_);
        }
    }

    function _receiveLendingTokenPayment(
        uint256 loanId_,
        uint256 generation_,
        uint256 amountOfTokens_
    ) internal onlySettledLoan(loanId_) {
        uint256 tokenId = generation_.getTokenId(loanId_);
        require(
            loanNFT.balanceOf(msg.sender, tokenId) >= amountOfTokens_,
            "Insufficient Loan NFT Balance"
        );
        uint256 amountToReceive =
            getAmountToBeRepaid(loanId_).mul(amountOfTokens_).div(
                loanDetails[loanId_].totalPartitions.sub(
                    projectLoanPayments[loanId_].partitionsPaidInProjectTokens
                )
            );

        loanNFT.burn(msg.sender, tokenId, amountOfTokens_);
        escrow.transferLendingToken(msg.sender, amountToReceive);
    }

    function _receiveProjectTokenPayment(
        uint256 loanId_,
        uint256 amountLoanNFT_
    ) internal {
        require(
            getAvailableLoanNFTForConversion(loanId_, msg.sender) >=
                amountLoanNFT_,
            "No loan NFT available for conversion to project tokens"
        );

        uint256 amount =
            getAmountOfProjectTokensToReceive(loanId_, amountLoanNFT_);

        // Keep track of the partitions paid in project tokens to reduce them from the settlement amount after milestone delivery
        projectLoanPayments[loanId_]
            .partitionsPaidInProjectTokens = projectLoanPayments[loanId_]
            .partitionsPaidInProjectTokens
            .add(amountLoanNFT_);

        // Burn the loan NFT used to claim the project tokens
        _burnLoanNFTAmountOverGenerations(loanId_, amountLoanNFT_);

        // Transfer the project tokens to the funder
        escrow.transferCollateralToken(
            loanDetails[loanId_].collateralToken,
            msg.sender,
            amount
        );

        emit ProjectTokenPaymentReceived(
            loanId_,
            msg.sender,
            amount,
            getDiscountedProjectTokenPrice(loanId_)
        );
    }

    function _burnLoanNFTAmountOverGenerations(
        uint256 loanId_,
        uint256 amountLoanNFT_
    ) internal {
        uint256 totalLoanNFTToBurn = amountLoanNFT_;
        for (
            uint256 i = 0;
            i < projectLoanPayments[loanId_].milestonesDelivered &&
                totalLoanNFTToBurn > 0;
            i++
        ) {
            uint256 loanNFTBalance =
                balanceOfLoanNFTGeneration(loanId_, i, msg.sender);
            uint256 loanNFTToBurn =
                loanNFTBalance > totalLoanNFTToBurn
                    ? totalLoanNFTToBurn
                    : loanNFTBalance;

            loanNFT.burn(msg.sender, i.getTokenId(loanId_), loanNFTToBurn);

            totalLoanNFTToBurn = totalLoanNFTToBurn.sub(loanNFTToBurn);
        }
    }

    // GETTERS
    function getMilestonesInfo(uint256 loanId_, uint256 milestone_)
        public
        view
        returns (uint256 amount, uint256 timestamp)
    {
        amount = projectLoanPayments[loanId_].milestoneLendingAmount[
            milestone_
        ];
        timestamp = projectLoanPayments[loanId_].milestoneDuration[milestone_];
    }

    /**
     * @dev getAmountToBeRepaid is a function to obtain the amount that should be paid to settle the loan
     * taking into account the amount paid back with project tokens and the interest percentage.
     * @param loanId The id of the loan to get the amount to be repaid from.
     * @return amount The total amount to be paid in lending tokens to settle the loan.
     */
    function getAmountToBeRepaid(uint256 loanId)
        public
        view
        returns (uint256 amount)
    {
        // Substract the partitions already paid in project tokens from the lending amount to pay back
        uint256 lendingTokenAmount =
            loanDetails[loanId].lendingAmount.sub(
                projectLoanPayments[loanId].partitionsPaidInProjectTokens.mul(
                    baseAmountForEachPartition
                )
            );
        // Calculate the interest only over what is left to pay in the lending token
        uint256 interest =
            lendingTokenAmount.mul(loanDetails[loanId].interestPercentage).div(
                100
            );
        amount = lendingTokenAmount.add(interest);
    }

    /**
     * @dev getTotalInterest is a function to obtain the total amount of interest to pay back
     * taking into account the interest free amount paid back with project tokens and the interest percentage set for the loan.
     * @param loanId The id of the loan to get the interest percentage from.
     * @return totalInterest The total amount of interest to be paid to settle the loan.
     */
    function getTotalInterest(uint256 loanId)
        public
        view
        returns (uint256 totalInterest)
    {
        // Substract the partitions already paid in project tokens from the lending amount to pay back
        uint256 lendingTokenAmount =
            loanDetails[loanId].lendingAmount.sub(
                projectLoanPayments[loanId].partitionsPaidInProjectTokens.mul(
                    baseAmountForEachPartition
                )
            );
        // Calculate the interest only over what is left to pay in the lending token
        totalInterest = lendingTokenAmount
            .mul(loanDetails[loanId].interestPercentage)
            .div(100);
    }

    function balanceOfAllLoanNFTGenerations(uint256 loanId, address funder)
        public
        view
        returns (uint256 balance)
    {
        for (
            uint256 i = 0;
            i < projectLoanPayments[loanId].totalMilestones;
            i++
        ) {
            balance = balance.add(
                balanceOfLoanNFTGeneration(loanId, i, funder)
            );
        }
    }

    function balanceOfLoanNFTGeneration(
        uint256 loanId,
        uint256 generation,
        address funder
    ) public view returns (uint256 balance) {
        balance = loanNFT.balanceOf(funder, generation.getTokenId(loanId));
    }

    function getProjectTokenPrice(uint256 loanId)
        public
        view
        returns (uint256 price)
    {
        // The price tokens can be reclaimed for after a milestone delivery
        uint256 milestonePriceWasSet =
            projectLoanPayments[loanId].milestonesDelivered > 0
                ? projectLoanPayments[loanId].milestonesDelivered.sub(1)
                : 0;
        price = projectLoanPayments[loanId].milestoneProjectTokenPrice[
            milestonePriceWasSet
        ];
    }

    function getDiscountedProjectTokenPrice(uint256 loanId)
        public
        view
        returns (uint256 price)
    {
        uint256 marketPrice = getProjectTokenPrice(loanId);
        price = marketPrice.sub(
            marketPrice.mul(projectLoanPayments[loanId].discountPerMillion).div(
                10**6
            )
        );
    }

    function getAvailableLoanNFTForConversion(uint256 loanId, address funder)
        public
        view
        returns (uint256 balance)
    {
        // If the loan is already settled, the borrower already paid everything back and also got its collateral back already
        if (loanStatus[loanId] == LoanLibrary.LoanStatus.SETTLED) {
            return 0;
        }

        for (
            uint256 i = 0;
            i < projectLoanPayments[loanId].milestonesDelivered;
            i++
        ) {
            balance = balance.add(
                balanceOfLoanNFTGeneration(loanId, i, funder)
            );
        }
    }

    function getAmountOfProjectTokensToReceive(
        uint256 loanId,
        uint256 amountLoanNFT
    ) public view returns (uint256 amount) {
        uint256 amountToReceiveInProjectTokens =
            amountLoanNFT.mul(baseAmountForEachPartition);
        // Calculate amount of project tokens based on the discounted price
        amount = amountToReceiveInProjectTokens.div(
            getDiscountedProjectTokenPrice(loanId)
        );
    }
}
