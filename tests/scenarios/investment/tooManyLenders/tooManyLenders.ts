/** Too many lenders
 * The objective of this test is to simulate a scenario where there is more than 50, 100 and 200 lenders
 * showing interest in a project.
 */

import {ethers, web3} from 'hardhat';
import {BigNumber, Contract} from 'ethers';
import chai from 'chai';
import {solidity} from 'ethereum-waffle';
import {ProjectStatusTypes, StakingType} from '../../../helpers/ProjectEnums';
import {increaseTime} from '../../../helpers/time';
import {
  fundersStake,
  requestInvestment,
  handleInvestmentRequest,
  seekerClaimsFunding,
  batchDeclareIntentionForBuy,
  batchFunderClaimLotteryReward,
  batchExchangeNFTForInvestmentToken,
} from '../../../helpers/modularTests';
import {getContracts, getSigners} from '../../../helpers/utils';

chai.use(solidity);

export default async function suite() {
  const executeHappyPathWithMultipleLenders = async (
    amountOfLenders: number,
    amountOfPartitionsToShowInterest: BigNumber,
    amountOfTicketsToLock: BigNumber,
    totalAmountRequested: BigNumber
  ) => {
    // Get signers
    const {deployerSigner, seekerSigner, superDelegatorSigner} =
      await getSigners();

    // Get contracts
    const {
      investmentContract,
      governanceContract,
      lendingTokenContract,
      investmentTokenContract,
      stakingContract,
      ALBTContract,
    } = await getContracts();

    // 1) Seeker publishes Investment
    const amountOfTokensToBePurchased = ethers.utils.parseEther('1000');
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

    const investmentId = await requestInvestment(
      investmentTokenContract,
      amountOfTokensToBePurchased,
      lendingTokenContract,
      totalAmountRequested,
      ipfsHash,
      seekerSigner
    );

    // 2) SuperGovernance approves Investment
    await handleInvestmentRequest(investmentId, superDelegatorSigner, true);

    const lenders = [];
    // Create lenders
    for (let index = 0; index < amountOfLenders; index++) {
      let newAddress = ethers.Wallet.createRandom();
      const provider = deployerSigner.provider;
      newAddress = new ethers.Wallet(newAddress.privateKey, provider);
      await deployerSigner.sendTransaction({
        to: newAddress.address,
        value: ethers.utils.parseEther('1.0'),
      });

      const amountToTransfer = ethers.utils.parseEther('10000000');
      // Transfer lending tokens
      await lendingTokenContract
        .connect(deployerSigner)
        .mint(newAddress.address, amountToTransfer);
      await lendingTokenContract
        .connect(newAddress)
        .approve(investmentContract.address, amountToTransfer);

      // Transfer ALBT
      await ALBTContract.connect(deployerSigner).mint(
        newAddress.address,
        amountToTransfer
      );
      await ALBTContract.connect(newAddress).approve(
        stakingContract.address,
        amountToTransfer
      );
      lenders.push(newAddress);
    }
    //3)Funders stake
    for (let index = 0; index < lenders.length; index = index + 3) {
      await fundersStake(lenders[index], StakingType.STAKER_LVL_3);
      await fundersStake(lenders[index + 1], StakingType.STAKER_LVL_2);
      await fundersStake(lenders[index + 2], StakingType.STAKER_LVL_1);
    }

    // 4) Funders declare their intention to buy a partition
    const declareIntentionForBuyData = [];
    for (let index = 0; index < lenders.length; index++) {
      const lender = lenders[index];
      declareIntentionForBuyData.push({
        investmentId: investmentId,
        lenderSigner: lender,
        numberOfPartitions: amountOfPartitionsToShowInterest,
        lendingTokenContract: lendingTokenContract,
      });
    }
    await batchDeclareIntentionForBuy(declareIntentionForBuyData);

    // 5) The lottery is run when all the partitions have been covered
    await increaseTime(deployerSigner.provider, 5 * 24 * 60 * 60); // 5 day
    await governanceContract.connect(superDelegatorSigner).checkCronjobs();
    let projectStatus = await investmentContract.projectStatus(investmentId);
    while (projectStatus.toString() === ProjectStatusTypes.STARTED) {
      await investmentContract
        .connect(lenders[0])
        .executeLotteryRun(investmentId);
      projectStatus = await investmentContract.projectStatus(investmentId);
    }

    //6) FundingNFTs are minted and each Funder either receives their NFT or their funds back in case they did not win the lottery
    const claimRewardData: any[] = [];
    for (let index = 0; index < lenders.length; index++) {
      const lender = lenders[index];
      claimRewardData.push({
        investmentId: investmentId,
        lenderSigner: lender,
        amountTicketsToBlock: amountOfTicketsToLock,
        lendingTokenContract: lendingTokenContract,
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
        investmentTokenContract: investmentTokenContract,
      });
    }
    await batchExchangeNFTForInvestmentToken(
      batchExchangeNFTForInvestmentTokenData
    );

    //8) Seeker claims the funding, when all investment tokens have been exchanged.
    await seekerClaimsFunding(investmentId, seekerSigner);
  };

  it('Should do a full flow with more than 50 lenders', async function () {
    await executeHappyPathWithMultipleLenders(
      51,
      BigNumber.from(200000),
      BigNumber.from(2),
      ethers.utils.parseEther('20000')
    );
  });
  it('Should do a full flow with more than 100 lenders', async function () {
    await executeHappyPathWithMultipleLenders(
      102,
      BigNumber.from(200000),
      BigNumber.from(2),
      ethers.utils.parseEther('20000')
    );
  });
  it('Should do a full flow with more than 200 lenders', async function () {
    await executeHappyPathWithMultipleLenders(
      300,
      BigNumber.from(200000),
      BigNumber.from(2),
      ethers.utils.parseEther('20000')
    );
  });
}
