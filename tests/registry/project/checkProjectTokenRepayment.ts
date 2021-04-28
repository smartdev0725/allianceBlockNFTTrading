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
        let amountRequestedPerMilestone = new Array<BN>(totalMilestones);
        let milestoneDurations = new Array<BN>(totalMilestones);

        beforeEach(async function () {
            loanId = new BN(await this.registry.totalLoans());
            approvalRequest = new BN(await this.governance.totalApprovalRequests());

            const amountCollateralized = new BN(toWei('100000'));
            const interestPercentage = new BN(20);
            const discountPerMillion = new BN(400000);
            const timeDiffBetweenDeliveryAndRepayment = new BN(3600);
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
                timeDiffBetweenDeliveryAndRepayment,
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
            const convertibleAmountLender0 = await this.registry.getAvailableLoanNFTForConversion(loanId, { from: this.lenders[0] });
            const convertibleAmountLender1 = await this.registry.getAvailableLoanNFTForConversion(loanId, { from: this.lenders[1] });

            expect(convertibleAmountLender0).to.be.bignumber.equal(new BN(0));
            expect(convertibleAmountLender1).to.be.bignumber.equal(new BN(0));
        });
        it("when a percent of NFT can be converted after delivering the first milestone", async function () {
            approvalRequest = new BN(await this.governance.totalApprovalRequests());
            await this.registry.applyMilestone(loanId, { from: this.projectOwner });
            await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[0] });
            await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[1] });

            const convertibleAmountLender0 = await this.registry.getAvailableLoanNFTForConversion(loanId, { from: this.lenders[0] });
            const convertibleAmountLender1 = await this.registry.getAvailableLoanNFTForConversion(loanId, { from: this.lenders[1] });
            const expectedAmount = bigPartition.mul(amountRequestedPerMilestone[0]).div(totalAmountRequested);

            expect(convertibleAmountLender0).to.be.bignumber.equal(expectedAmount);
            expect(convertibleAmountLender1).to.be.bignumber.equal(expectedAmount);
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

            const convertibleAmountLender0 = await this.registry.getAvailableLoanNFTForConversion(loanId, { from: this.lenders[0] });
            const convertibleAmountLender1 = await this.registry.getAvailableLoanNFTForConversion(loanId, { from: this.lenders[1] });
            const expectedAmount = bigPartition.mul(amountRequestedPerMilestone[0].add(amountRequestedPerMilestone[1])).div(totalAmountRequested);

            expect(convertibleAmountLender0).to.be.bignumber.equal(expectedAmount);
            expect(convertibleAmountLender1).to.be.bignumber.equal(expectedAmount);
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

            const convertibleAmountLender0 = await this.registry.getAvailableLoanNFTForConversion(loanId, { from: this.lenders[0] });
            const convertibleAmountLender1 = await this.registry.getAvailableLoanNFTForConversion(loanId, { from: this.lenders[1] });
            const expectedAmount = bigPartition;

            expect(convertibleAmountLender0).to.be.bignumber.equal(expectedAmount);
            expect(convertibleAmountLender1).to.be.bignumber.equal(expectedAmount);
        });

        /*// Lender 0 uses half of its tokens to get the project tokens for the first milestone
        let generation = new BN(0);
        let tokenId = loanId;
        const projectTokenPrice = new BN(1);
        const halfAmountOfNFTsOfLender = bigPartition.div(new BN(2));
        const balanceNFTLenderBefore = await this.loanNft.balanceOf(this.lenders[0], tokenId);
        const balanceLenderBefore = await this.projectToken.balanceOf(this.lenders[0]);
        const balanceEscrowBefore = await this.projectToken.balanceOf(this.escrow.address);

        // Test getter first
        const getterProjectTokenAmount = await this.registry.getAmountOfProjectTokensToReceive(loanId, halfAmountOfNFTsOfLender, { from: this.lenders[0] });
        // Request to receive project tokens as repayment for half of the NFT the lender holds
        const tx1 = await this.registry.receivePayment(tokenId, halfAmountOfNFTsOfLender, true, { from: this.lenders[0] });

        const balanceNFTLenderAfter = await this.loanNft.balanceOf(this.lenders[0], tokenId);
        const balanceLenderAfter = await this.projectToken.balanceOf(this.lenders[0]);
        const balanceEscrowAfter = await this.projectToken.balanceOf(this.escrow.address);
        const loanPayments = await this.registry.projectLoanPayments(loanId);
        const { amount } = await this.registry.getMilestonesInfo(loanId, 0);
        const expectedAmountToReceive = amount.mul(halfAmountOfNFTsOfLender).div(totalPartitions);
        const discountedPrice = projectTokenPrice.sub(
            projectTokenPrice
                .mul(loanPayments.discountPerMillion)
                .div(new BN(1000000))
        );
        const expectedProjectTokenAmount = expectedAmountToReceive.div(discountedPrice);

        // Correct balances
        expect(getterProjectTokenAmount).to.be.bignumber.equal(expectedProjectTokenAmount);
        expect(balanceNFTLenderBefore.sub(halfAmountOfNFTsOfLender)).to.be.bignumber.equal(balanceNFTLenderAfter);
        expect(balanceLenderBefore.add(expectedProjectTokenAmount)).to.be.bignumber.equal(balanceLenderAfter);
        expect(balanceEscrowBefore.sub(expectedProjectTokenAmount)).to.be.bignumber.equal(balanceEscrowAfter);
        // TODO: check balances of token from generation 1

        // Correct partitions used in project tokens
        expect(loanPayments.partitionsPaidInProjectTokens).to.be.bignumber.equal(halfAmountOfNFTsOfLender);

        // Correct Event.
        expectEvent(tx1.receipt, 'PaymentReceived', { loanId, amountOfTokens: halfAmountOfNFTsOfLender, generation, onProjectTokens: true, user: this.lenders[0] });
        expectEvent(tx1.receipt, 'ProjectTokenPaymentReceived', { loanId, user: this.lenders[0], amountOfProjectTokens: expectedProjectTokenAmount, discountedPrice });


        //generation = generation.add(new BN(1));
        //tokenId = new BN((generation.toNumber() << 128) | loanId.toNumber());

        //console.log("generation 2 in tests", generation.toNumber());
        //console.log("tokenId 2 in tests", tokenId.toNumber());

        //const tx2 = await this.registry.receivePayment(tokenId, amountOnProjectTokens, true, { from: this.lenders[0] });
        //// Correct Event.
        //expectEvent(tx2.receipt, 'PaymentReceived', { loanId, amountOfTokens: amountOnProjectTokens, generation, onProjectTokens: true, user: this.lenders[0] });
*/
    })
};
