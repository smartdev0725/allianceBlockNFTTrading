import BN from 'bn.js';
import { toWei } from 'web3-utils';
import { expect } from 'chai';
import { ONE_DAY, BASE_AMOUNT } from "../../helpers/constants";
import { getCurrentTimestamp, increaseTime } from "../../helpers/time";
const { expectEvent } = require("@openzeppelin/test-helpers");

export default async function suite() {
    describe('Succeeds', async () => {
        let loanId: BN;
        let approvalRequest: BN;
        let bigPartition: BN;
        let totalPartitions: BN;
        let totalAmountRequested: BN;
        const totalMilestones = new BN(3);
        const interestPercentage = new BN(20);
        let amountRequestedPerMilestone = new Array<BN>(totalMilestones);
        let milestoneDurations = new Array<BN>(totalMilestones);

        beforeEach(async function () {
            loanId = new BN(await this.registry.totalLoans());
            approvalRequest = new BN(await this.governance.totalApprovalRequests());

            const amountCollateralized = new BN(toWei('100000'));
            const discountPerMillion = new BN(400000);
            const paymentTimeInterval = new BN(20 * ONE_DAY);
            const ipfsHash = "QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ"

            const currentTime = await getCurrentTimestamp();

            for (let i = 0; i < Number(totalMilestones); i++) {
                milestoneDurations[i] = currentTime.add(new BN((i + 1) * ONE_DAY))
                amountRequestedPerMilestone[i] = new BN(toWei('10000'));
            }

            await this.registry.requestProjectLoan(
                amountRequestedPerMilestone,
                this.projectToken.address,
                amountCollateralized.toString(),
                interestPercentage,
                discountPerMillion,
                totalMilestones,
                milestoneDurations,
                paymentTimeInterval,
                ipfsHash,
                { from: this.projectOwner }
            );

            totalAmountRequested = amountRequestedPerMilestone[0].mul(totalMilestones);
            totalPartitions = totalAmountRequested.div(new BN(toWei(BASE_AMOUNT.toString())));
            bigPartition = totalPartitions.div(new BN(2));

            await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[0] });
            await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[1] });

            await this.registry.fundLoan(loanId, bigPartition, { from: this.lenders[0] });
            await this.registry.fundLoan(loanId, bigPartition, { from: this.lenders[1] });

            /*
            console.log(await this.registry.getTotalLoanNFTBalance(loanId, { from: this.lenders[0] }));
            console.log(await this.registry.getLoanNFTBalanceOfGeneration(loanId, new BN(0), { from: this.lenders[0] }));
            console.log(await this.registry.getLoanNFTBalanceOfGeneration(loanId, new BN(1), { from: this.lenders[0] }));
            console.log(await this.registry.getLoanNFTBalanceOfGeneration(loanId, new BN(2), { from: this.lenders[0] }));
            */
        });
        it("when project tokens can not be claimed if no milestones are delivered yet", async function () {
            const convertibleAmountLender0 = await this.registry.getAvailableLoanNFTForConversion(loanId, this.lenders[0]);
            const convertibleAmountLender1 = await this.registry.getAvailableLoanNFTForConversion(loanId, this.lenders[1]);

            expect(convertibleAmountLender0).to.be.bignumber.equal(new BN(0));
            expect(convertibleAmountLender1).to.be.bignumber.equal(new BN(0));
        });
        it("when a percent of NFT can be converted after delivering the first milestone", async function () {
            approvalRequest = new BN(await this.governance.totalApprovalRequests());
            await this.registry.applyMilestone(loanId, { from: this.projectOwner });
            await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[0] });
            await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[1] });

            const convertibleAmountLender0 = await this.registry.getAvailableLoanNFTForConversion(loanId, this.lenders[0]);
            const expectedAmount = bigPartition.mul(amountRequestedPerMilestone[0]).div(totalAmountRequested);

            expect(convertibleAmountLender0).to.be.bignumber.equal(expectedAmount);

            const balanceLenderBefore = await this.projectToken.balanceOf(this.lenders[0]);
            const balanceEscrowBefore = await this.projectToken.balanceOf(this.escrow.address);
            const balanceNFTLenderBefore = await this.registry.balanceOfTotalLoanNFT(loanId, this.lenders[0]);

            // Test getter first
            const getterProjectTokenAmount = await this.registry.getAmountOfProjectTokensToReceive(loanId, convertibleAmountLender0, { from: this.lenders[0] });
            // Request to receive project tokens as repayment for all of the convertible NFT
            const tx1 = await this.registry.receivePayment(loanId, convertibleAmountLender0, true, { from: this.lenders[0] });

            const balanceNFTLenderAfter = await this.registry.balanceOfTotalLoanNFT(loanId, this.lenders[0]);
            const balanceLenderAfter = await this.projectToken.balanceOf(this.lenders[0]);
            const balanceEscrowAfter = await this.projectToken.balanceOf(this.escrow.address);
            const loanPayments = await this.registry.projectLoanPayments(loanId);
            const expectedAmountToReceive = convertibleAmountLender0.mul(new BN(toWei(BASE_AMOUNT.toString())));
            const tokenPrice = await this.registry.getProjectTokenPrice(loanId);
            const discountedPrice = tokenPrice.sub(
                tokenPrice
                    .mul(loanPayments.discountPerMillion)
                    .div(new BN(1000000))
            );
            const expectedProjectTokenAmount = expectedAmountToReceive.div(discountedPrice);
            const remainingLendingAmountToPayBack = totalAmountRequested.sub(expectedAmountToReceive);
            const amountToBeRepaid = remainingLendingAmountToPayBack.add(remainingLendingAmountToPayBack.mul(interestPercentage).div(new BN(100)));

            // Correct balances
            expect(getterProjectTokenAmount).to.be.bignumber.equal(expectedProjectTokenAmount);
            expect(balanceNFTLenderBefore.sub(convertibleAmountLender0)).to.be.bignumber.equal(balanceNFTLenderAfter);
            expect(balanceLenderBefore.add(expectedProjectTokenAmount)).to.be.bignumber.equal(balanceLenderAfter);
            expect(balanceEscrowBefore.sub(expectedProjectTokenAmount)).to.be.bignumber.equal(balanceEscrowAfter);
            // TODO: check balances of token from generation 1

            // Correct partitions paid in project tokens tracked and updated amount to settle the loan
            expect(loanPayments.partitionsPaidInProjectTokens).to.be.bignumber.equal(convertibleAmountLender0);
            expect(await this.registry.getAmountToBeRepaid(loanId)).to.be.bignumber.equal(amountToBeRepaid);

            // Correct Event.
            expectEvent(tx1.receipt, 'PaymentReceived', { loanId, amountOfTokens: convertibleAmountLender0, generation: new BN(0), onProjectTokens: true, user: this.lenders[0] });
            expectEvent(tx1.receipt, 'ProjectTokenPaymentReceived', { loanId, user: this.lenders[0], amountOfProjectTokens: expectedProjectTokenAmount, discountedPrice });

        });
        it("when more NFT can be converted after delivering the second milestone", async function () {
            let milestonesToDeliver = 2;
            for (let i = 0; i < milestonesToDeliver; i++) {
                approvalRequest = new BN(await this.governance.totalApprovalRequests());
                await this.registry.applyMilestone(loanId, { from: this.projectOwner });
                await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[0] });
                await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[1] });

                await increaseTime(milestoneDurations[i]);
            }

            const convertibleAmountLender0 = await this.registry.getAvailableLoanNFTForConversion(loanId, this.lenders[0]);
            const expectedAmount = bigPartition.mul(amountRequestedPerMilestone[0].add(amountRequestedPerMilestone[1])).div(totalAmountRequested);

            expect(convertibleAmountLender0).to.be.bignumber.equal(expectedAmount);

            const balanceLenderBefore = await this.projectToken.balanceOf(this.lenders[0]);
            const balanceEscrowBefore = await this.projectToken.balanceOf(this.escrow.address);
            const balanceNFTLenderBefore = await this.registry.balanceOfTotalLoanNFT(loanId, this.lenders[0]);

            // Test getter first
            const getterProjectTokenAmount = await this.registry.getAmountOfProjectTokensToReceive(loanId, convertibleAmountLender0, { from: this.lenders[0] });
            // Request to receive project tokens as repayment
            const tx1 = await this.registry.receivePayment(loanId, convertibleAmountLender0, true, { from: this.lenders[0] });

            const balanceNFTLenderAfter = await this.registry.balanceOfTotalLoanNFT(loanId, this.lenders[0]);
            const balanceLenderAfter = await this.projectToken.balanceOf(this.lenders[0]);
            const balanceEscrowAfter = await this.projectToken.balanceOf(this.escrow.address);
            const loanPayments = await this.registry.projectLoanPayments(loanId);
            const expectedAmountToReceive = convertibleAmountLender0.mul(new BN(toWei(BASE_AMOUNT.toString())));
            const tokenPrice = await this.registry.getProjectTokenPrice(loanId);
            const discountedPrice = tokenPrice.sub(
                tokenPrice
                    .mul(loanPayments.discountPerMillion)
                    .div(new BN(1000000))
            );
            const expectedProjectTokenAmount = expectedAmountToReceive.div(discountedPrice);
            const remainingLendingAmountToPayBack = totalAmountRequested.sub(expectedAmountToReceive);
            const amountToBeRepaid = remainingLendingAmountToPayBack.add(remainingLendingAmountToPayBack.mul(interestPercentage).div(new BN(100)));

            // Correct balances
            expect(getterProjectTokenAmount).to.be.bignumber.equal(expectedProjectTokenAmount);
            expect(balanceNFTLenderBefore.sub(convertibleAmountLender0)).to.be.bignumber.equal(balanceNFTLenderAfter);
            expect(balanceLenderBefore.add(expectedProjectTokenAmount)).to.be.bignumber.equal(balanceLenderAfter);
            expect(balanceEscrowBefore.sub(expectedProjectTokenAmount)).to.be.bignumber.equal(balanceEscrowAfter);
            // TODO: check balances of token from generation 1

            // Correct partitions paid in project tokens tracked and updated amount to settle the loan
            expect(loanPayments.partitionsPaidInProjectTokens).to.be.bignumber.equal(convertibleAmountLender0);
            expect(await this.registry.getAmountToBeRepaid(loanId)).to.be.bignumber.equal(amountToBeRepaid);

            // Correct Event.
            expectEvent(tx1.receipt, 'PaymentReceived', { loanId, amountOfTokens: convertibleAmountLender0, generation: new BN(0), onProjectTokens: true, user: this.lenders[0] });
            expectEvent(tx1.receipt, 'ProjectTokenPaymentReceived', { loanId, user: this.lenders[0], amountOfProjectTokens: expectedProjectTokenAmount, discountedPrice });
        });
        it("when all NFT can be converted after delivering the third milestone", async function () {
            let milestonesToDeliver = 3;
            for (let i = 0; i < milestonesToDeliver; i++) {
                approvalRequest = new BN(await this.governance.totalApprovalRequests());
                await this.registry.applyMilestone(loanId, { from: this.projectOwner });
                await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[0] });
                await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[1] });

                await increaseTime(milestoneDurations[i]);
            }

            const convertibleAmountLender0 = await this.registry.getAvailableLoanNFTForConversion(loanId, this.lenders[0]);
            const expectedAmount = bigPartition;

            expect(convertibleAmountLender0).to.be.bignumber.equal(expectedAmount);
        });
    })
};
