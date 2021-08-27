/**
 * superVoteRequestMultipleProjects
 * The objective of this test is to simulate what happens with the gas when a lot of projects
 * are accepted or rejected
 * Here's a list of "test"
 * 1) Create all project and then approve (28-74)
 * 2) Create all project and then reject (76 - 122)
 * 3) Create and approve one by one (124 - 162)
 * 4) Create,approve, show interest and run lottery one by one (164 - 237)
 * The conclusions were that when approve and there are cronJobs waiting to be excuted the gasUsed increment
 *
 */
import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import chai, {expect} from 'chai';
import {solidity} from 'ethereum-waffle';
import {StakingType} from '../../../helpers/ProjectEnums';
import {increaseTime} from '../../../helpers/time';
import {
  batchDeclareIntentionForBuy,
  batchRequestInvestment,
  fundersStake,
  requestInvestment,
  runLottery,
} from '../../../helpers/modularTests';

chai.use(solidity);

export default async function suite() {
  it('When create all project and then approve, the gas increase', async function () {
    // Allows Seeker publishes Investment
    const amountOfTokensToBePurchased = ethers.utils.parseEther('1000');
    const totalAmountRequested = ethers.utils.parseEther('200');
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

    // Create 50 invvestment and rejected all
    const batchInvestmentData = [];

    for (let i = 0; i <= 20; i++) {
      batchInvestmentData.push({
        investmentTokenContract: this.investmentTokenContract,
        amountOfTokensToBePurchased: amountOfTokensToBePurchased,
        lendingTokenContract: this.lendingTokenContract,
        totalAmountRequested: totalAmountRequested,
        ipfsHash: ipfsHash,
        seekerSigner: this.seekerSigner,
      });
    }
    const investmentsId: BigNumber[] = await batchRequestInvestment(
      batchInvestmentData
    );

    // Allow to approve investment
    let lastGasUsed = BigNumber.from(0);
    for (let index = 0; index < investmentsId.length; index++) {
      // const isApproved  = Math.random() > 0.5 ? true : false;
      const isApproved = true;
      const superVoteForRequest = await this.governanceContract
        .connect(this.superDelegatorSigner)
        .superVoteForRequest(investmentsId[index], isApproved);

      const superVoteForRequestTransactionReceipt =
        await ethers.provider.getTransactionReceipt(superVoteForRequest.hash);

      // Verify that after second time the gas increase
      if (!lastGasUsed.isZero && index > 1) {
        expect(superVoteForRequestTransactionReceipt.gasUsed).to.be.gt(
          lastGasUsed
        );
      }
      lastGasUsed = superVoteForRequestTransactionReceipt.gasUsed;
    }
  });

  it('When create all project and then reject, the gas dont increase', async function () {
    // Allows Seeker publishes Investment
    const amountOfTokensToBePurchased = ethers.utils.parseEther('1000');
    const totalAmountRequested = ethers.utils.parseEther('200');
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

    // Create 50 invvestment and rejected all
    const batchInvestmentData = [];

    for (let i = 0; i <= 20; i++) {
      batchInvestmentData.push({
        investmentTokenContract: this.investmentTokenContract,
        amountOfTokensToBePurchased: amountOfTokensToBePurchased,
        lendingTokenContract: this.lendingTokenContract,
        totalAmountRequested: totalAmountRequested,
        ipfsHash: ipfsHash,
        seekerSigner: this.seekerSigner,
      });
    }
    const investmentsId: BigNumber[] = await batchRequestInvestment(
      batchInvestmentData
    );

    // Allow to reject investment
    let lastGasUsed = BigNumber.from(0);
    for (let index = 0; index < investmentsId.length; index++) {
      const isApproved = false;
      const superVoteForRequest = await this.governanceContract
        .connect(this.superDelegatorSigner)
        .superVoteForRequest(investmentsId[index], isApproved);

      const superVoteForRequestTransactionReceipt =
        await ethers.provider.getTransactionReceipt(superVoteForRequest.hash);

      // Verify that after second time the gas don't increase
      if (!lastGasUsed.isZero() && index > 1) {
        expect(superVoteForRequestTransactionReceipt.gasUsed).to.be.lte(
          lastGasUsed
        );
      }
      lastGasUsed = superVoteForRequestTransactionReceipt.gasUsed;
    }
  });

  it('When create and approve one by one, the gas increase', async function () {
    // Allows Seeker publishes Investment
    const amountOfTokensToBePurchased = ethers.utils.parseEther('1000');
    const totalAmountRequested = ethers.utils.parseEther('200');
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

    // Create 50 invvestment and rejected all
    let lastGasUsed = BigNumber.from(0);

    for (let index = 0; index <= 20; index++) {
      const investmentId = await requestInvestment(
        this.investmentTokenContract,
        amountOfTokensToBePurchased,
        this.lendingTokenContract,
        totalAmountRequested,
        ipfsHash,
        this.seekerSigner
      );

      const isApproved = true;
      const superVoteForRequest = await this.governanceContract
        .connect(this.superDelegatorSigner)
        .superVoteForRequest(investmentId, isApproved);

      const superVoteForRequestTransactionReceipt =
        await ethers.provider.getTransactionReceipt(superVoteForRequest.hash);

      // Verify that after second time the gas increase
      if (!lastGasUsed.isZero() && index > 1) {
        expect(superVoteForRequestTransactionReceipt.gasUsed).to.be.gt(
          lastGasUsed
        );
      }
      lastGasUsed = superVoteForRequestTransactionReceipt.gasUsed;
    }
  });

  it('When create,approve, show interest and run lottery one by one, the gas dont increase', async function () {
    const lenders = [
      this.lender1Signer,
      this.lender2Signer,
      this.lender3Signer,
      this.lender4Signer,
    ];
    const amountOfPartitionsToShowInterest = BigNumber.from(6);
    // Lender 1,2 and 3 stake
    await fundersStake(this.lender1Signer, StakingType.STAKER_LVL_1);
    await fundersStake(this.lender2Signer, StakingType.STAKER_LVL_2);
    await fundersStake(this.lender3Signer, StakingType.STAKER_LVL_3);
    await fundersStake(this.lender4Signer, StakingType.STAKER_LVL_3);

    // Allows Seeker publishes Investment
    const amountOfTokensToBePurchased = ethers.utils.parseEther('1000');
    const totalAmountRequested = ethers.utils.parseEther('200');
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

    // Create 50 invvestment and rejected all
    let lastGasUsed = BigNumber.from(0);

    for (let index = 0; index < 20; index++) {
      const investmentId = await requestInvestment(
        this.investmentTokenContract,
        amountOfTokensToBePurchased,
        this.lendingTokenContract,
        totalAmountRequested,
        ipfsHash,
        this.seekerSigner
      );

      // Allow to approve investment
      const isApproved = true;
      const superVoteForRequest = await this.governanceContract
        .connect(this.superDelegatorSigner)
        .superVoteForRequest(investmentId, isApproved);

      const superVoteForRequestTransactionReceipt =
        await ethers.provider.getTransactionReceipt(superVoteForRequest.hash);

      // Verify that after second time the gas don't increase
      if (!lastGasUsed.isZero() && index > 1) {
        expect(superVoteForRequestTransactionReceipt.gasUsed).to.be.lte(
          lastGasUsed
        );
      }
      lastGasUsed = superVoteForRequestTransactionReceipt.gasUsed;

      // Lenders declare their intention to buy a partition (effectively depositing their funds)
      const declareIntentionForBuyData = [];
      for (let index = 0; index < lenders.length; index++) {
        const lender = lenders[index];
        declareIntentionForBuyData.push({
          investmentId: investmentId,
          lenderSigner: lender,
          numberOfPartitions: amountOfPartitionsToShowInterest,
          lendingTokenContract: this.lendingTokenContract,
        });
      }
      await batchDeclareIntentionForBuy(declareIntentionForBuyData);

      //The lottery is run when all the partitions have been covered
      await increaseTime(this.deployerSigner.provider, 5 * 24 * 60 * 60); // 5 day
      await runLottery(
        investmentId,
        this.lender1Signer,
        this.superDelegatorSigner
      );
    }
  });
}
