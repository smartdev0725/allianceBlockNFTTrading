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
  requestInvestment,
  handleInvestmentRequest,
  runLottery,
} from '../../helpers/functions';
const {expectRevert} = require('@openzeppelin/test-helpers');

chai.use(solidity);

export default async function suite() {
  it('should do a full flow', async function () {
    // Allows Seeker publishes Investment
    const amountOfTokensToBePurchased = ethers.utils.parseEther('100000');
    const totalAmountRequested = ethers.utils.parseEther('10000');
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

    const investmentId = await requestInvestment(
      this.investmentTokenContract,
      amountOfTokensToBePurchased,
      this.lendingTokenContract,
      totalAmountRequested,
      ipfsHash,
      this.seekerSigner
    );

    // SuperGovernance approves Investment
    await handleInvestmentRequest(
      investmentId,
      this.superDelegatorSigner,
      true
    );

    // Lender 1,2 and 3 stake
    await fundersStake(
      this.lender1,
      this.lender1Signer,
      StakingType.STAKER_LVL_1
    );
    await fundersStake(
      this.lender2,
      this.lender2Signer,
      StakingType.STAKER_LVL_2
    );
    await fundersStake(
      this.lender3,
      this.lender3Signer,
      StakingType.STAKER_LVL_3
    );

    // Lender4 get rALDT from actions
    await getRALBTWithActions(
      this.lender4,
      this.lender3Signer,
      this.deployerSigner
    );

    // Lenders declare their intention to buy a partition (effectively depositing their funds)
    await declareIntentionForBuy(
      investmentId,
      this.lender1,
      this.lender1Signer,
      BigNumber.from(1000),
      this.lendingTokenContract
    );
    await declareIntentionForBuy(
      investmentId,
      this.lender2,
      this.lender2Signer,
      BigNumber.from(1000),
      this.lendingTokenContract
    );
    await declareIntentionForBuy(
      investmentId,
      this.lender3,
      this.lender3Signer,
      BigNumber.from(1000),
      this.lendingTokenContract
    );
    await declareIntentionForBuy(
      investmentId,
      this.lender4,
      this.lender4Signer,
      BigNumber.from(1000),
      this.lendingTokenContract
    );

    //5) The lottery is run when all the partitions have been covered
    await increaseTime(this.deployerSigner.provider, 5 * 24 * 60 * 60); // 5 day

    await runLottery(
      this.governanceContract,
      this.superDelegatorSigner,
      this.registryContract,
      investmentId,
      this.lender1Signer
    );
  });
}
