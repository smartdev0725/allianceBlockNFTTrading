import BN from 'bn.js';
import { toWei } from 'web3-utils';
import { expect } from 'chai';
import { LoanStatus } from '../../helpers/registryEnums';
import { ONE_DAY, BASE_AMOUNT } from "../../helpers/constants";
import { getCurrentTimestamp } from "../../helpers/time";
const { expectEvent } = require("@openzeppelin/test-helpers");

export default async function suite() {
    describe('Succeeds', async () => {
        let loanId: BN;
        let approvalRequest: BN;
        let bigPartition: BN;

        beforeEach(async function () {
            loanId = new BN(await this.registry.totalLoans());
            approvalRequest = new BN(await this.governance.totalApprovalRequests());

            const amountCollateralized = new BN(toWei('100000'));
            const interestPercentage = new BN(20);
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
                totalMilestones,
                milestoneDurations,
                timeDiffBetweenDeliveryAndRepayment,
                ipfsHash,
                { from: this.projectOwner }
            );

            const totalAmountRequested = amountRequestedPerMilestone[0].mul(totalMilestones);
            const totalPartitions = totalAmountRequested.div(new BN(toWei(BASE_AMOUNT.toString())));
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
            const amountOnProjectTokens = bigPartition.div(new BN(2));

            console.log("loanId in tests", loanId);
            const tx = await this.registry.receivePayment(loanId, amountOnProjectTokens, true, { from: this.lenders[0] });

            // Correct Event.
            expectEvent(tx.receipt, 'PaymentReceived', { loanId, amountOfTokens: amountOnProjectTokens, generation, onProjectTokens: true, user: this.lenders[0] });

        });
    });
}
