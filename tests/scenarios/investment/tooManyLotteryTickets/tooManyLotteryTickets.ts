/** Too many lottery tickets
 * The objective of this test is to simulate a scenario where there is too many lottery tickets, and how does affect in the gas used
 */
import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import chai, {expect} from 'chai';
import {solidity} from 'ethereum-waffle';
import {StakingType, ProjectStatusTypes} from '../../../helpers/ProjectEnums';
import {increaseTime} from '../../../helpers/time';
import {
  declareIntentionForBuy,
  fundersStake,
  requestInvestment,
  handleInvestmentRequest,
} from '../../../helpers/modularTests';
chai.use(solidity);

export default async function suite() {
  it('When lottery needs to run many times', async function () {
    // Allows Seeker publishes Investment
    const amountOfTokensToBePurchased = ethers.utils.parseEther('1000000');
    const totalAmountRequested = ethers.utils.parseEther('100000');
    const ticketsInterest = BigNumber.from(5000);
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

    const investmentId = await requestInvestment(
      this.investmentTokenContract,
      amountOfTokensToBePurchased,
      this.lendingTokenContract,
      totalAmountRequested,
      ipfsHash,
      this.seekerSigner
    );

    const investmentDetails = await this.investmentContract.investmentDetails(
      investmentId
    );

    // SuperGovernance approves Investment
    await handleInvestmentRequest(
      investmentId,
      this.superDelegatorSigner,
      true
    );

    // Lender 1,2 and 3 stake
    await fundersStake(this.lender1Signer, StakingType.STAKER_LVL_1);
    await fundersStake(this.lender2Signer, StakingType.STAKER_LVL_2);
    await fundersStake(this.lender3Signer, StakingType.STAKER_LVL_3);
    await fundersStake(this.lender4Signer, StakingType.STAKER_LVL_3);

    // Lenders declare their intention to buy a partition (effectively depositing their funds)
    await declareIntentionForBuy(
      investmentId,
      this.lender1Signer,
      ticketsInterest,
      this.lendingTokenContract
    );
    await declareIntentionForBuy(
      investmentId,
      this.lender2Signer,
      ticketsInterest,
      this.lendingTokenContract
    );
    await declareIntentionForBuy(
      investmentId,
      this.lender3Signer,
      ticketsInterest,
      this.lendingTokenContract
    );
    await declareIntentionForBuy(
      investmentId,
      this.lender4Signer,
      ticketsInterest,
      this.lendingTokenContract
    );

    //5) The lottery is run when all the partitions have been covered
    await increaseTime(this.deployerSigner.provider, 5 * 24 * 60 * 60); // 5 day
    await this.governanceContract
      .connect(this.superDelegatorSigner)
      .checkCronjobs();

    let projectStatusTypesAfter = await this.investmentContract.projectStatus(
      investmentId
    );
    let counter = 0;

    while (projectStatusTypesAfter.toString() === ProjectStatusTypes.STARTED) {
      counter++;
      await this.investmentContract
        .connect(this.lender1Signer)
        .executeLotteryRun(investmentId);
      projectStatusTypesAfter = await this.investmentContract.projectStatus(
        investmentId
      );
    }
    // Amount of tickets it bigger than 1000
    expect(investmentDetails.totalPartitionsToBePurchased).to.be.gt(1000);
    // Amount of times bigger than 80
    expect(counter).to.be.gt(100);
  });
}
