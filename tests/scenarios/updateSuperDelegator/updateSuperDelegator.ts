/** Happy Path
 * The objective of this test is to simulate a scenario where update the super delegator after create a project
 * Should do a full flow
 * Here's a list of "steps"
 *  Seeker publishes Investment (56 - 67)
 *  Update super delegator (70 - 82)
 *  SuperGovernance approves Investment (85)
 *  4 Funders stake, one for each tier (88 - 91)
 *  Funders declare their intention to buy a partition
 *   (effectively depositing their funds) (94 - 104)
 *  The lottery is run when all the partitions have been covered (107 - 108)
 *  FundingNFTs are minted and each Funder either receives their (111 - 121)
 *    NFT or their funds back in case they did not win the lottery
 *  Funders with a FundingNFT exchange it for their Investment tokens (124 - 137)
 *  Seeker claims the funding, when all investment tokens have been exchanged. (139)
 */

import {
  RALBT_REWARDS_PER_LEVEL,
  RALBT_REWARDS_PER_LEVEL_AFTER_FIRST_TIME,
} from '../../helpers/constants';
import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import chai, {expect} from 'chai';
import {solidity} from 'ethereum-waffle';
import {StakingType} from '../../helpers/ProjectEnums';
import {increaseTime} from '../../helpers/time';
import {
  fundersStake,
  getRALBTWithActions,
  requestInvestment,
  handleInvestmentRequest,
  runLottery,
  seekerClaimsFunding,
  addNewAction,
  batchDeclareIntentionForBuy,
  batchFunderClaimLotteryReward,
  batchExchangeNFTForInvestmentToken,
} from '../../helpers/modularTests';

const {expectRevert} = require('@openzeppelin/test-helpers');

chai.use(solidity);

export default async function suite() {
  it('Should do a full flow when update superGovernance', async function () {
    const lenders = [
      this.lender1Signer,
      this.lender2Signer,
      this.lender3Signer,
      this.lender4Signer,
    ];
    const amountOfPartitionsToShowInterest = BigNumber.from(6);
    const amountOfTicketsToLock = BigNumber.from(2);

    // 1) Seeker publishes Investment
    const amountOfTokensToBePurchased = ethers.utils.parseEther('1000');
    const totalAmountRequested = ethers.utils.parseEther('200');
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

    const investmentId = await requestInvestment(
      this.investmentTokenContract,
      amountOfTokensToBePurchased,
      this.lendingTokenContract,
      totalAmountRequested,
      ipfsHash,
      this.seekerSigner
    );

    // Update super governace
    this.governanceContract
      .connect(this.deployerSigner)
      .updateSuperDelegator(this.seeker);

    const superDelegator = await this.governanceContract.superDelegator();
    expect(superDelegator).to.be.equal(this.seeker);

    await expectRevert(
      this.governanceContract
        .connect(this.superDelegatorSigner)
        .superVoteForRequest(investmentId, true),
      'Only super delegator can call this function'
    );

    // 2) SuperGovernance approves Investment
    await handleInvestmentRequest(investmentId, this.seekerSigner, true);

    //3) 4 Funders stake, one for each tier
    await fundersStake(this.lender1Signer, StakingType.STAKER_LVL_1);
    await fundersStake(this.lender2Signer, StakingType.STAKER_LVL_2);
    await fundersStake(this.lender3Signer, StakingType.STAKER_LVL_3);
    await fundersStake(this.lender4Signer, StakingType.STAKER_LVL_3);

    // 4) Funders declare their intention to buy a partition
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

    // 5) The lottery is run when all the partitions have been covered
    await increaseTime(this.deployerSigner.provider, 5 * 24 * 60 * 60); // 5 day
    await runLottery(investmentId, this.lender1Signer, this.seekerSigner);

    //6) FundingNFTs are minted and each Funder either receives their NFT or their funds back in case they did not win the lottery
    const claimRewardData: any[] = [];
    for (let index = 0; index < lenders.length; index++) {
      const lender = lenders[index];
      claimRewardData.push({
        investmentId: investmentId,
        lenderSigner: lender,
        amountTicketsToBlock: amountOfTicketsToLock,
        lendingTokenContract: this.lendingTokenContract,
      });
    }
    await batchFunderClaimLotteryReward(claimRewardData);

    //7) Funders with a FundingNFT exchange it for their Investment tokens.
    const batchExchangeNFTForInvestmentTokenData: any[] = [];
    for (let index = 0; index < lenders.length; index++) {
      const lender = lenders[index];

      batchExchangeNFTForInvestmentTokenData.push({
        investmentId: investmentId,
        lenderSigner: lender,
        investmentTokenContract: this.investmentTokenContract,
      });
    }
    await batchExchangeNFTForInvestmentToken(
      batchExchangeNFTForInvestmentTokenData
    );

    //8) Seeker claims the funding, when all investment tokens have been exchanged.
    await seekerClaimsFunding(investmentId, this.seekerSigner);
  });
}
