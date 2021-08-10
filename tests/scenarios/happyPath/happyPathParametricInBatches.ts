import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import chai from 'chai';
import {solidity} from 'ethereum-waffle';
import {StakingType} from '../../helpers/registryEnums';

import {
  batchRequestInvestment,
  batchHandleInvestmentRequest,
  batchFundersStake,
  batchGetRALBTWithActions,
  batchDeclareIntentionForBuy,
  batchRunLottery,
  batchFunderClaimLotteryReward,
  batchExchangeNFTForInvestmentToken,
  batchAddNewAction,
  batchSeekerClaimsFunding,
} from '../../helpers/modularTests';

chai.use(solidity);

export default async function suite() {
  it('should do a full flow', async function () {
    // Allows Seeker publishes Investment
    const amountOfTokensToBePurchased = ethers.utils.parseEther('1000');
    const totalAmountRequested = ethers.utils.parseEther('200');
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

    const batchInvestmentData = [];

    for (let i = 0; i <= 10; i++) {
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
    const batchApproveInvestmentData: any[] = [];
    for (let index = 0; index < investmentsId.length; index++) {
      batchApproveInvestmentData.push({
        investmentId: investmentsId[index],
        approve: true,
      });
    }
    await batchHandleInvestmentRequest(
      batchApproveInvestmentData,
      this.superDelegatorSigner
    );

    // Stake
    const batchStakeData: any[] = [
      {
        lenderSigner: this.lender1Signer,
        stakingLevel: StakingType.STAKER_LVL_1,
      },
      {
        lenderSigner: this.lender2Signer,
        stakingLevel: StakingType.STAKER_LVL_2,
      },
      {
        lenderSigner: this.lender3Signer,
        stakingLevel: StakingType.STAKER_LVL_3,
      },
    ];
    await batchFundersStake(batchStakeData);

    // Add new aaction
    const actionData = {
      account: this.lender4,
      actionName: 'Wallet Connect',
      answer: 'Yes',
      referralId: 0,
    };
    const actionData1 = {
      account: this.lender4,
      actionName: 'Comment',
      answer: 'Yes',
      referralId: 1,
    };
    const addNewActionData = [
      {
        action: actionData,
        reputationalAlbtRewardsPerLevel: [
          ethers.utils.parseEther('500'),
          ethers.utils.parseEther('500'),
          ethers.utils.parseEther('500'),
          ethers.utils.parseEther('500'),
        ],
        reputationalAlbtRewardsPerLevelAfterFirstTime: [
          ethers.utils.parseEther('10'),
          ethers.utils.parseEther('10'),
          ethers.utils.parseEther('10'),
          ethers.utils.parseEther('10'),
        ],
      },
      {
        action: actionData1,
        reputationalAlbtRewardsPerLevel: [
          ethers.utils.parseEther('500'),
          ethers.utils.parseEther('500'),
          ethers.utils.parseEther('500'),
          ethers.utils.parseEther('500'),
        ],
        reputationalAlbtRewardsPerLevelAfterFirstTime: [
          ethers.utils.parseEther('10'),
          ethers.utils.parseEther('10'),
          ethers.utils.parseEther('10'),
          ethers.utils.parseEther('10'),
        ],
      },
    ];
    await batchAddNewAction(this.deployerSigner, addNewActionData);

    // Get rALBT
    const getRALBTFromActionsData = {
      lenderSigner: this.lender4Signer,
      actionCallerSigner: this.lender3Signer,
      actions: [
        actionData,
        {...actionData, account: this.lender1},
        {...actionData, account: this.lender2},
        {...actionData, account: this.lender3},
        {...actionData1, account: this.lender2},
        {...actionData1, account: this.lender3},
        actionData1,
      ],
    };

    const getRALBTFromActionsDataArray = [];
    for (let i = 0; i < 55; i++) {
      getRALBTFromActionsDataArray.push(getRALBTFromActionsData);
    }
    await batchGetRALBTWithActions(
      getRALBTFromActionsDataArray,
      this.deployerSigner
    );

    // Declare Intention For Buy
    const declareIntentionForBuyData = [];
    for (let index = 0; index < investmentsId.length; index++) {
      const investment = investmentsId[index];
      declareIntentionForBuyData.push({
        investmentId: investment,
        lenderSigner: this.lender1Signer,
        numberOfPartitions: BigNumber.from(6),
        lendingTokenContract: this.lendingTokenContract,
      });
      declareIntentionForBuyData.push({
        investmentId: investment,
        lenderSigner: this.lender2Signer,
        numberOfPartitions: BigNumber.from(6),
        lendingTokenContract: this.lendingTokenContract,
      });
      declareIntentionForBuyData.push({
        investmentId: investment,
        lenderSigner: this.lender3Signer,
        numberOfPartitions: BigNumber.from(6),
        lendingTokenContract: this.lendingTokenContract,
      });
      declareIntentionForBuyData.push({
        investmentId: investment,
        lenderSigner: this.lender4Signer,
        numberOfPartitions: BigNumber.from(6),
        lendingTokenContract: this.lendingTokenContract,
      });
    }
    await batchDeclareIntentionForBuy(declareIntentionForBuyData);

    // Run Lottery
    const runLotteryData = [];
    for (let index = 0; index < investmentsId.length; index++) {
      runLotteryData.push({
        investmentId: investmentsId[index],
        lotteryRunnerSigner: this.lender3Signer,
      });
    }
    await batchRunLottery(runLotteryData, this.superDelegatorSigner);

    // Clain Reward
    const claimRewardData: any[] = [];
    for (let index = 0; index < investmentsId.length; index++) {
      claimRewardData.push({
        investmentId: investmentsId[index],
        lenderSigner: this.lender1Signer,
        amountTicketsToBlock: BigNumber.from(1),
        lendingTokenContract: this.lendingTokenContract,
      });
      claimRewardData.push({
        investmentId: investmentsId[index],
        lenderSigner: this.lender2Signer,
        amountTicketsToBlock: BigNumber.from(1),
        lendingTokenContract: this.lendingTokenContract,
      });
      claimRewardData.push({
        investmentId: investmentsId[index],
        lenderSigner: this.lender3Signer,
        amountTicketsToBlock: BigNumber.from(1),
        lendingTokenContract: this.lendingTokenContract,
      });
      claimRewardData.push({
        investmentId: investmentsId[index],
        lenderSigner: this.lender4Signer,
        amountTicketsToBlock: BigNumber.from(1),
        lendingTokenContract: this.lendingTokenContract,
      });
    }
    await batchFunderClaimLotteryReward(claimRewardData);

    // Exchange nft
    const batchExchangeNFTForInvestmentTokenData: any[] = [];
    for (let index = 0; index < investmentsId.length; index++) {
      batchExchangeNFTForInvestmentTokenData.push({
        investmentId: investmentsId[index],
        lenderSigner: this.lender1Signer,
        investmentTokenContract: this.investmentTokenContract,
      });
      batchExchangeNFTForInvestmentTokenData.push({
        investmentId: investmentsId[index],
        lenderSigner: this.lender2Signer,
        investmentTokenContract: this.investmentTokenContract,
      });
      batchExchangeNFTForInvestmentTokenData.push({
        investmentId: investmentsId[index],
        lenderSigner: this.lender3Signer,
        investmentTokenContract: this.investmentTokenContract,
      });
      batchExchangeNFTForInvestmentTokenData.push({
        investmentId: investmentsId[index],
        lenderSigner: this.lender4Signer,
        investmentTokenContract: this.investmentTokenContract,
      });
    }
    await batchExchangeNFTForInvestmentToken(
      batchExchangeNFTForInvestmentTokenData
    );

    // Seeker withdraw funds
    const batchSeekerClaimsFundingData: any[] = [];
    for (let index = 0; index < investmentsId.length; index++) {
      batchSeekerClaimsFundingData.push({
        investmentId: investmentsId[index],
        seekerSigner: this.seekerSigner,
      });
    }
    await batchSeekerClaimsFunding(batchSeekerClaimsFundingData);
  });
}
