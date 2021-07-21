import {BASE_AMOUNT} from '../../helpers/constants';
import {ethers, web3} from 'hardhat';
import {BigNumber} from 'ethers';
import chai, {expect} from 'chai';
import {solidity} from 'ethereum-waffle';
import {StakingType, InvestmentStatus} from '../../helpers/registryEnums';
import {getSignature} from '../../helpers/utils';
import {increaseTime} from '../../helpers/time';
import {
  declareIntentionForBuy,
  fundersStake,
  getRALBTWithActions,
  batchRequestInvestment,
  handleInvestmentRequest,
  runLottery,
  funderClaimLotteryReward,
  exchangeNFTForInvestmentToken,
  batchHandleInvestmentRequest,
  batchFundersStake,
  batchGetRALBTWithActions,
  batchDeclareIntentionForBuy,
  batchRunLottery,
  batchFunderClaimLotteryReward,
  batchExchangeNFTForInvestmentToken,
} from '../../helpers/functions';
const {expectRevert} = require('@openzeppelin/test-helpers');

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
    const investmentsId = await batchRequestInvestment(batchInvestmentData);

    const batchApproveInvestmentData: any[] = [];
    investmentsId.forEach((investment) => {
      batchApproveInvestmentData.push({
        investmentId: investment,
        approve: true,
      });
    });

    await batchHandleInvestmentRequest(
      batchApproveInvestmentData,
      this.superDelegatorSigner
    );

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

    const getRALBTFromActionsData = [
      //  data = {lenderSigner: any, actionCallerSigner: any}
      {
        lenderSigner: this.lender4Signer,
        actionCallerSigner: this.lender3Signer,
      },
      {
        lenderSigner: this.lender4Signer,
        actionCallerSigner: this.lender3Signer,
      },
      {
        lenderSigner: this.lender4Signer,
        actionCallerSigner: this.lender3Signer,
      },
    ];
    await batchGetRALBTWithActions(
      getRALBTFromActionsData,
      this.deployerSigner
    );

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

    const runLotteryData = [];
    for (let index = 0; index < investmentsId.length; index++) {
      const investment = investmentsId[index];
      runLotteryData.push({
        investmentId: investment,
        lotteryRunnerSigner: this.lender3Signer,
      });
    }
    await batchRunLottery(runLotteryData, this.superDelegatorSigner);

    const claimRewardData = [];
    for (let index = 0; index < investmentsId.length; index++) {
      claimRewardData.push({
        investmentId: investmentsId[index],
        lenderSigner: this.lender1Signer,
        lendingTokenContract: this.lendingTokenContract,
      });
      claimRewardData.push({
        investmentId: investmentsId[index],
        lenderSigner: this.lender2Signer,
        lendingTokenContract: this.lendingTokenContract,
      });
      claimRewardData.push({
        investmentId: investmentsId[index],
        lenderSigner: this.lender3Signer,
        lendingTokenContract: this.lendingTokenContract,
      });
      claimRewardData.push({
        investmentId: investmentsId[index],
        lenderSigner: this.lender4Signer,
        lendingTokenContract: this.lendingTokenContract,
      });
    }
    await batchFunderClaimLotteryReward(claimRewardData);

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
  });
}
