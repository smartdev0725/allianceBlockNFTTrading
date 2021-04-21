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

    /**
     * @dev This function is used for potential borrowing project to request a loan.
     * @param amountRequestedPerMilestone The lending amounts project is looking to get for each milestone.
     * @param collateralToken The token that will be used by the proect as collateral.
     * @param collateralAmount The amount of tokens that will be used by the project as collateral.
     * @param interestPercentage The interest percentage that will be obtained after whole repayment.
     * @param totalMilestones The total amount of Milestones project is requesting funds for.
     * @param milestoneDurations The duration of each Milestone.
     * @param timeDiffBetweenDeliveryAndRepayment The time interval between the last milestone delivery by the project and
     *                                            the repayment of the loan by the project.
     * @param extraInfo The ipfs hash where more specific details for loan request are stored.
     */
    function requestProjectLoan(
        uint256[] calldata amountRequestedPerMilestone,
        address collateralToken,
        uint256 collateralAmount,
        uint256 interestPercentage,
        uint256 totalMilestones,
        uint256[] calldata milestoneDurations,
        uint256 timeDiffBetweenDeliveryAndRepayment,
        string memory extraInfo
    ) external onlyAcceptedNumberOfMilestones(totalMilestones) {
        uint256 totalAmountRequested;

        for (uint256 i = 0; i < totalMilestones; i++) {
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

        _storeLoanDetails(
            totalAmountRequested,
            collateralToken,
            collateralAmount,
            interestPercentage,
            extraInfo
        );

        _storeProjectLoanPayments(
            totalMilestones,
            timeDiffBetweenDeliveryAndRepayment
        );

        loanDetails[totalLoans].loanType = LoanLibrary.LoanType.PROJECT;

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
            projectLoanPayments[loanId_]
                .currentMilestoneStartingTimestamp = block.timestamp;
            projectLoanPayments[loanId_]
                .currentMilestoneDeadlineTimestamp = block.timestamp.add(
                projectLoanPayments[loanId_].timeDiffBetweenDeliveryAndRepayment
            );

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
        uint256 totalMilestones_,
        uint256 timeDiffBetweenDeliveryAndRepayment_
    ) internal {
        projectLoanPayments[totalLoans].totalMilestones = totalMilestones_;
        projectLoanPayments[totalLoans]
            .timeDiffBetweenDeliveryAndRepayment = timeDiffBetweenDeliveryAndRepayment_;
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

    function _executeProjectLoanPayment(uint256 loanId_)
        internal
        onlyBetweenMilestoneTimeframe(loanId_)
        onlyOnProjectRepayment(loanId_)
    {
        IERC20(lendingToken).transferFrom(
            msg.sender,
            address(escrow),
            getAmountToBeRepaid(loanId_)
        );
    }

    function _receiveProjectLoanPayment(
        uint256 loanId_,
        uint256 generation_,
        uint256 amountOfTokens_,
        bool onProjectTokens_
    ) internal {
        if (onProjectTokens_) {
            _receiveProjectTokenPayment(loanId_, generation_, amountOfTokens_);
        } else {
            _receiveLendingTokenPayment(loanId_, generation_, amountOfTokens_);
        }
    }

    function _receiveLendingTokenPayment(
        uint256 loanId_,
        uint256 generation_,
        uint256 amountOfTokens_
    ) internal onlySettledLoan(loanId_) {
        require(
            !(generation_ > 0),
            "This NFT was already used to claim project tokens."
        );

        uint256 amountToReceive =
            getAmountToBeRepaid(loanId_).mul(amountOfTokens_).div(
                loanDetails[loanId_].totalPartitions.sub(
                    projectLoanPayments[loanId_].partitionsPaidInProjectTokens
                )
            );

        loanNFT.burn(msg.sender, loanId_, amountOfTokens_);
        escrow.transferLendingToken(msg.sender, amountToReceive);
    }

    function _receiveProjectTokenPayment(
        uint256 loanId_,
        uint256 generation_,
        uint256 amountOfTokens_
    ) internal {
        uint256 milestonesToBePaid =
            projectLoanPayments[loanId_].milestonesDelivered.sub(generation_);
        require(milestonesToBePaid > 0, "Not eligible for payment");
        require(
            loanStatus[loanId_] != LoanLibrary.LoanStatus.SETTLED ||
                generation_ > 0,
            "The loan is already settled so payment has been done in lending token, project tokens can not be claimed anymore with NFT of generation 0"
        );

        // Calculate the amount of project tokens to receive
        uint256 totalMilestoneLendingAmounts;
        for (uint256 i = 0; i < milestonesToBePaid; i++) {
            // Calculate the amount to receive based on the amount lended for the milestone and the amount of NFT's
            uint256 totalMilestoneLendingAmounts =
                totalMilestoneLendingAmounts.add(
                    projectLoanPayments[loanId_].milestoneLendingAmount[i]
                );
        }
        uint256 amountToReceive =
            _paymentAmountToAmountForNFTHolder(
                loanDetails[loanId_].totalPartitions,
                totalMilestoneLendingAmounts,
                amountOfTokens_
            );
        // TODO: Get the real price from a price oracle (Mock the price oracle and test repayment with different token prices)
        uint256 projectTokenPrice = 1;
        // Calculate amount of project tokens based on the actual listed price and the discount
        // TODO: Discount should be set somewhere, at request loan? Should the discount really be expressed in discount per million? Why not percentage?
        uint256 amountOfProjectTokens =
            amountToReceive.div(
                projectTokenPrice.sub(
                    projectTokenPrice
                        .mul(projectLoanPayments[loanId_].discountPerMillion)
                        .div(1000000)
                )
            );

        // Burn the NFT's used to receive the payment
        if (
            projectLoanPayments[loanId_].milestonesDelivered <
            projectLoanPayments[loanId_].totalMilestones
        ) {
            loanNFT.increaseGenerations(
                generation_.getTokenId(loanId_),
                msg.sender,
                amountOfTokens_,
                milestonesToBePaid
            );
        } else {
            loanNFT.burn(msg.sender, loanId_, amountOfTokens_);
        }

        escrow.transferCollateralToken(
            loanDetails[loanId_].collateralToken,
            msg.sender,
            amountOfProjectTokens
        );

        // Store the number of partitions used to reduce them from the amount of lending tokens to pay to settle the loan
        projectLoanPayments[loanId_]
            .partitionsPaidInProjectTokens = projectLoanPayments[loanId_]
            .partitionsPaidInProjectTokens
            .add(amountOfTokens_);
    }

    function _paymentAmountToAmountForNFTHolder(
        uint256 totalPartitions,
        uint256 paymentAmount,
        uint256 amountOfLoanNFT
    ) internal pure returns (uint256 amount) {
        amount = paymentAmount.mul(amountOfLoanNFT).div(totalPartitions);
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
     * @param loanId_ The id of the loan to get the amount to be repaid from.
     * @return amount The total amount to be paid in lending tokens to settle the loan.
     */
    function getAmountToBeRepaid(uint256 loanId_)
        public
        view
        returns (uint256 amount)
    {
        // Substract the partitions already paid in project tokens from the lending amount to pay back
        uint256 lendingTokenAmount =
            loanDetails[loanId_].lendingAmount.sub(
                projectLoanPayments[loanId_].partitionsPaidInProjectTokens *
                    baseAmountForEachPartition
            );
        // Calculate the interest only over what is left to pay in the lending token
        uint256 interest =
            lendingTokenAmount.mul(loanDetails[loanId_].interestPercentage).div(
                100
            );
        amount = lendingTokenAmount.add(interest);
    }

    /**
     * @dev getTotalInterest is a function to obtain the total amount of interest to pay back
     * taking into account the interest free amount paid back with project tokens and the interest percentage set for the loan.
     * @param loanId_ The id of the loan to get the interest percentage from.
     * @return totalInterest The total amount of interest to be paid to settle the loan.
     */
    function getTotalInterest(uint256 loanId_)
        public
        view
        returns (uint256 totalInterest)
    {
        // Substract the partitions already paid in project tokens from the lending amount to pay back
        uint256 lendingTokenAmount =
            loanDetails[loanId_].lendingAmount.sub(
                projectLoanPayments[loanId_].partitionsPaidInProjectTokens *
                    baseAmountForEachPartition
            );
        // Calculate the interest only over what is left to pay in the lending token
        totalInterest = lendingTokenAmount
            .mul(loanDetails[loanId_].interestPercentage)
            .div(100);
    }
}
