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
        const totalMilestones = new BN(1); // Only 1 milestone for investments
        const interestPercentage = new BN(20);
        let amountRequestedPerMilestone = new Array<BN>(totalMilestones);
        let milestoneDurations = new Array<BN>(totalMilestones);

        beforeEach(async function () {
            loanId = new BN(await this.registry.totalLoans());
            approvalRequest = new BN(await this.governance.totalApprovalRequests());

            const amountCollateralized = new BN(toWei('100000'));
            const projectTokenPrice = new BN("1");
            const discountPerMillion = new BN(400000);
            const paymentTimeInterval = new BN(20 * ONE_DAY);
            const ipfsHash = "QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ"

            const currentTime = await getCurrentTimestamp();

            // The milestone duration should be 0 for investment type since there are really no milestones to deliver
            milestoneDurations[0] = new BN(0);
            amountRequestedPerMilestone[0] = new BN(toWei('10000'));

            await this.registry.requestProjectLoan(
                amountRequestedPerMilestone,
                this.projectToken.address,
                amountCollateralized.toString(),
                projectTokenPrice,
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

            await this.governance.superVoteForRequest(approvalRequest, true, {
                from: this.owner
            });

            await this.registry.fundLoan(loanId, bigPartition, { from: this.lenders[0] });
            await this.registry.fundLoan(loanId, bigPartition, { from: this.lenders[1] });
        });

        it("when the first milestone is already approved after funding", async function () {
            const loanPayments = await this.registry.projectLoanPayments(loanId);

            expect(loanPayments.milestonesDelivered).to.be.bignumber.equal(new BN(1));
        });

        it("when all NFT can be converted after funding", async function () {
            const convertibleAmountLender0 = await this.registry.getAvailableLoanNFTForConversion(loanId, this.lenders[0]);

            expect(convertibleAmountLender0).to.be.bignumber.equal(bigPartition);

            const balanceLenderBefore = await this.projectToken.balanceOf(this.lenders[0]);
            const balanceEscrowBefore = await this.projectToken.balanceOf(this.escrow.address);
            const balanceNFTLenderBefore = await this.registry.balanceOfAllLoanNFTGenerations(loanId, this.lenders[0]);

            // Test getter first
            const getterProjectTokenAmount = await this.registry.getAmountOfProjectTokensToReceive(loanId, convertibleAmountLender0, { from: this.lenders[0] });
            // Request to receive project tokens as repayment for all of the convertible NFT
            const tx1 = await this.registry.receivePayment(loanId, convertibleAmountLender0, true, { from: this.lenders[0] });

            const balanceNFTLenderAfter = await this.registry.balanceOfAllLoanNFTGenerations(loanId, this.lenders[0]);
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
    })
};
