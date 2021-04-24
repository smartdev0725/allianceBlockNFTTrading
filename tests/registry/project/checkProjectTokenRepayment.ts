import BN from 'bn.js';
import { toWei } from 'web3-utils';
import { expect } from 'chai';
import { ONE_DAY, BASE_AMOUNT } from "../../helpers/constants";
import { getCurrentTimestamp } from "../../helpers/time";
const { expectEvent } = require("@openzeppelin/test-helpers");

export default async function suite() {
    describe('Succeeds', async () => {
        let loanId: BN;
        let approvalRequest: BN;
        let bigPartition: BN;
        let totalPartitions: BN;

        beforeEach(async function () {
            loanId = new BN(await this.registry.totalLoans());
            approvalRequest = new BN(await this.governance.totalApprovalRequests());

            const amountCollateralized = new BN(toWei('100000'));
            const interestPercentage = new BN(20);
            const discountPerMillion = new BN(400000);
            const totalMilestones = new BN(3);
            const timeDiffBetweenDeliveryAndRepayment = new BN(3600);
            const ipfsHash = "QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ"

            let milestoneDurations = new Array<BN>(totalMilestones);
            let amountRequestedPerMilestone = new Array<BN>(totalMilestones);
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

            const totalAmountRequested = amountRequestedPerMilestone[0].mul(totalMilestones);
            totalPartitions = totalAmountRequested.div(new BN(toWei(BASE_AMOUNT.toString())));
            bigPartition = totalPartitions.div(new BN(2));

            await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[0] });
            await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[1] });

            await this.registry.fundLoan(loanId, bigPartition, { from: this.lenders[0] });
            await this.registry.fundLoan(loanId, bigPartition, { from: this.lenders[1] });

            approvalRequest = new BN(await this.governance.totalApprovalRequests());
            await this.registry.applyMilestone(loanId, { from: this.projectOwner });
            await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[0] });
            await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[1] });
        });
        it("when receiving payments in project tokens", async function () {
            // Lender 0 uses half of its tokens to get the project tokens for the first milestone
            let generation = new BN(0);
            let tokenId = loanId;
            const projectTokenPrice = new BN(1);
            const halfAmountOfNFTsOfLender = bigPartition.div(new BN(2));
            const balanceNFTLenderBefore = await this.loanNft.balanceOf(this.lenders[0], tokenId);
            const balanceLenderBefore = await this.projectToken.balanceOf(this.lenders[0]);
            const balanceEscrowBefore = await this.projectToken.balanceOf(this.escrow.address);

            // Request to receive project tokens as repayment for half of the NFT the lender holds
            const tx1 = await this.registry.receivePayment(tokenId, halfAmountOfNFTsOfLender, true, { from: this.lenders[0] });

            const balanceNFTLenderAfter = await this.loanNft.balanceOf(this.lenders[0], tokenId);
            const balanceLenderAfter = await this.projectToken.balanceOf(this.lenders[0]);
            const balanceEscrowAfter = await this.projectToken.balanceOf(this.escrow.address);
            const loanPayments = await this.registry.projectLoanPayments(loanId);
            const { amount } = await this.registry.getMilestonesInfo(loanId, 0);
            const expectedAmountToReceive = amount.mul(halfAmountOfNFTsOfLender).div(totalPartitions);
            const expectedProjectTokenAmount = expectedAmountToReceive.div(
                projectTokenPrice.sub(
                    projectTokenPrice
                        .mul(loanPayments.discountPerMillion)
                        .div(new BN(1000000))
                )
            );

            // Correct balances
            expect(balanceNFTLenderBefore.sub(halfAmountOfNFTsOfLender)).to.be.bignumber.equal(balanceNFTLenderAfter);
            expect(balanceLenderBefore.add(expectedProjectTokenAmount)).to.be.bignumber.equal(balanceLenderAfter);
            expect(balanceEscrowBefore.sub(expectedProjectTokenAmount)).to.be.bignumber.equal(balanceEscrowAfter);
            // TODO: check balances of token from generation 1

            // Correct partitions used in project tokens
            expect(loanPayments.partitionsPaidInProjectTokens).to.be.bignumber.equal(halfAmountOfNFTsOfLender);

            // Correct Event.
            expectEvent(tx1.receipt, 'PaymentReceived', { loanId, amountOfTokens: halfAmountOfNFTsOfLender, generation, onProjectTokens: true, user: this.lenders[0] });
            expectEvent(tx1.receipt, 'ProjectTokenPaymentReceived', { loanId, user: this.lenders[0], amountOfProjectTokens: expectedProjectTokenAmount });


            //generation = generation.add(new BN(1));
            //tokenId = new BN((generation.toNumber() << 128) | loanId.toNumber());

            //console.log("generation 2 in tests", generation.toNumber());
            //console.log("tokenId 2 in tests", tokenId.toNumber());

            //const tx2 = await this.registry.receivePayment(tokenId, amountOnProjectTokens, true, { from: this.lenders[0] });
            //// Correct Event.
            //expectEvent(tx2.receipt, 'PaymentReceived', { loanId, amountOfTokens: amountOnProjectTokens, generation, onProjectTokens: true, user: this.lenders[0] });

        });
    });
}
