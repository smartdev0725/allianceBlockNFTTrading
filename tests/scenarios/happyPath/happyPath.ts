/** Happy Path
 * The objective of this test is to simulate a scenario where every action taken
 * by the users is "positive".
 * Here's a list of "steps"
 * 1) Seeker publishes Investment (56 - 67)
 * 2) SuperGovernance approves Investment (69 - 74)
 * 3) 4 Funders stake, one for each tier (76 - 98)
 * 4) Funders declare their intention to buy a partition
 *    (effectively depositing their funds) (100 - 111)
 * 5) The lottery is run when all the partitions have been covered (113 - 118)
 * 6) FundingNFTs are minted and each Funder either receives their (121 - 131)
 *    NFT or their funds back in case they did not win the lottery
 * 7) Funders with a FundingNFT exchange it for their Investment tokens (134 - 146)
 * 8) Seeker claims the funding, when all investment tokens have been exchanged. (149)
 */

import {
  RALBT_REWARDS_PER_LEVEL,
  RALBT_REWARDS_PER_LEVEL_AFTER_FIRST_TIME,
} from '../../helpers/constants';
import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import chai from 'chai';
import {solidity} from 'ethereum-waffle';
import {StakingType} from '../../helpers/ProjectEnums';
import {getSignature} from '../../helpers/utils';
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
  it('should do a full flow', async function () {
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

    // 2) SuperGovernance approves Investment
    await handleInvestmentRequest(
      investmentId,
      this.superDelegatorSigner,
      true
    );

    //3) 4 Funders stake, one for each tier
    await fundersStake(this.lender1Signer, StakingType.STAKER_LVL_1);
    await fundersStake(this.lender2Signer, StakingType.STAKER_LVL_2);
    await fundersStake(this.lender3Signer, StakingType.STAKER_LVL_3);

    // Lender4 get rALDT from actions
    const action = {
      account: this.lender4,
      actionName: 'Wallet Connect',
      answer: 'Yes',
      referralId: 0,
    };

    await addNewAction(
      this.deployerSigner,
      action,
      RALBT_REWARDS_PER_LEVEL,
      RALBT_REWARDS_PER_LEVEL_AFTER_FIRST_TIME
    );
    for (let i = 0; i < 60; i++) {
      await getRALBTWithActions(this.lender3Signer, [action]);
    }

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
    await runLottery(
      investmentId,
      this.lender1Signer,
      this.superDelegatorSigner
    );

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
