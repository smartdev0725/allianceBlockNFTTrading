import {BASE_AMOUNT} from '../../helpers/constants';
import {ethers, web3} from 'hardhat';
import {BigNumber} from 'ethers';
import chai, {expect} from 'chai';
import {solidity} from 'ethereum-waffle';
import {StakingType, InvestmentStatus} from '../../helpers/registryEnums';
import {getSignature} from '../../helpers/utils';
import {increaseTime} from '../../helpers/time';
const {expectRevert} = require('@openzeppelin/test-helpers');

chai.use(solidity);

export default async function suite() {
  it('should do a full flow', async function () {
    const investmentId = await this.registryContract.totalInvestments();
    const amountOfTokensToBePurchased = ethers.utils.parseEther('100000');
    const totalAmountRequested = ethers.utils.parseEther('10000');
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';
    
    //1) Seeker publishes Investment
    await this.registryContract
    .connect(this.seekerSigner)
    .requestInvestment(
      this.investmentTokenContract.address,
      amountOfTokensToBePurchased,
      this.lendingTokenContract.address,
      totalAmountRequested,
      ipfsHash
    );

    const investmentId2 = await this.registryContract.totalInvestments();
    expect(Number(investmentId2)).to.be.equal(Number(investmentId)+1);

    //2) SuperGovernance approves Investment
    const status = await this.registryContract.investmentStatus(investmentId);
    expect(String(status)).to.be.equal(String(InvestmentStatus.REQUESTED));

    await this.governanceContract
      .connect(this.superDelegatorSigner)
      .superVoteForRequest(investmentId, true);

    const status2 = await this.registryContract.investmentStatus(investmentId);
    expect(String(status2)).to.be.equal(String(InvestmentStatus.APPROVED));

    //3) 4 Funders stake, one for each tier
    const staker1StakingAmountBefore = await this.stakingContract.getBalance(
      this.lender1
    );
    const staker2StakingAmountBefore = await this.stakingContract.getBalance(
      this.lender2
    );
    const staker3StakingAmountBefore = await this.stakingContract.getBalance(
      this.lender3
    );

    const amountToStake1 = (
      await this.stakingContract.stakingTypeAmounts(StakingType.STAKER_LVL_1)
    ).sub(staker1StakingAmountBefore);
    const amountToStake2 = (
      await this.stakingContract.stakingTypeAmounts(StakingType.STAKER_LVL_2)
    ).sub(staker2StakingAmountBefore);
    const amountToStake3 = (
      await this.stakingContract.stakingTypeAmounts(StakingType.STAKER_LVL_3)
    ).sub(staker3StakingAmountBefore);

    const staker1ALBTBalanceBefore = await this.ALBTContract.balanceOf(
      this.lender1
    );
    const staker2ALBTBalanceBefore = await this.ALBTContract.balanceOf(
      this.lender2
    );
    const staker3ALBTBalanceBefore = await this.ALBTContract.balanceOf(
      this.lender3
    );

    const stakingContractALBTBalanceBefore =
      await this.ALBTContract.balanceOf(this.stakingContract.address);
    const stakedSupplyBefore = await this.stakingContract.totalSupply();
    const rALBTBalanceBefore1 = await this.rALBTContract.balanceOf(
      this.lender1
    );
    const rALBTBalanceBefore2 = await this.rALBTContract.balanceOf(
      this.lender2
    );
    const rALBTBalanceBefore3 = await this.rALBTContract.balanceOf(
      this.lender3
    );

    await expect(
      this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_1)
    )
      .to.emit(this.stakingContract, 'Staked')
      .withArgs(this.lender1, amountToStake1);

    await expect(
      this.stakingContract
        .connect(this.lender2Signer)
        .stake(StakingType.STAKER_LVL_2)
    )
      .to.emit(this.stakingContract, 'Staked')
      .withArgs(this.lender2, amountToStake2);

    await expect(
      this.stakingContract
        .connect(this.lender3Signer)
        .stake(StakingType.STAKER_LVL_3)
    )
      .to.emit(this.stakingContract, 'Staked')
      .withArgs(this.lender3, amountToStake3);


    const staker1StakingAmounAfter = await this.stakingContract.getBalance(
      this.lender1
    );
    const staker2StakingAmounAfter = await this.stakingContract.getBalance(
      this.lender2
    );
    const staker3StakingAmounAfter = await this.stakingContract.getBalance(
      this.lender3
    );
    const stakedSupplyAfter = await this.stakingContract.totalSupply();
    const staker1ALBTBalanceAfter = await this.ALBTContract.balanceOf(
      this.lender1
    );
    const staker2ALBTBalanceAfter = await this.ALBTContract.balanceOf(
      this.lender2
    );
    const staker3ALBTBalanceAfter = await this.ALBTContract.balanceOf(
      this.lender3
    );
    const stakingContractALBTBalanceAfter = await this.ALBTContract.balanceOf(
      this.stakingContract.address
    );
    const rALBTBalanceAfter1 = await this.rALBTContract.balanceOf(
      this.lender1
    );
    const rALBTBalanceAfter2 = await this.rALBTContract.balanceOf(
      this.lender2
    );
    const rALBTBalanceAfter3 = await this.rALBTContract.balanceOf(
      this.lender3
    );

    const levelOfStakerAfter1 = await this.stakerMedalNFTContract.getLevelOfStaker(this.lender1);
    const levelOfStakerAfter2 = await this.stakerMedalNFTContract.getLevelOfStaker(this.lender2);
    const levelOfStakerAfter3 = await this.stakerMedalNFTContract.getLevelOfStaker(this.lender3);

    const balanceStaker1Medal1 = await this.stakerMedalNFTContract.balanceOf(this.lender1, 1);
    const balanceStaker1Medal2 = await this.stakerMedalNFTContract.balanceOf(this.lender1, 2);
    const balanceStaker1Medal3 = await this.stakerMedalNFTContract.balanceOf(this.lender1, 3);

    const balanceStaker2Medal1 = await this.stakerMedalNFTContract.balanceOf(this.lender2, 1);
    const balanceStaker2Medal2 = await this.stakerMedalNFTContract.balanceOf(this.lender2, 2);
    const balanceStaker2Medal3 = await this.stakerMedalNFTContract.balanceOf(this.lender2, 3);

    const balanceStaker3Medal1 = await this.stakerMedalNFTContract.balanceOf(this.lender3, 1);
    const balanceStaker3Medal2 = await this.stakerMedalNFTContract.balanceOf(this.lender3, 2);
    const balanceStaker3Medal3 = await this.stakerMedalNFTContract.balanceOf(this.lender3, 3);

    // Then
    expect(balanceStaker1Medal1.toString()).to.be.equal('1');
    expect(balanceStaker1Medal2.toString()).to.be.equal('0');
    expect(balanceStaker1Medal3.toString()).to.be.equal('0');

    expect(balanceStaker2Medal1.toString()).to.be.equal('0');
    expect(balanceStaker2Medal2.toString()).to.be.equal('1');
    expect(balanceStaker2Medal3.toString()).to.be.equal('0');

    expect(balanceStaker3Medal1.toString()).to.be.equal('0');
    expect(balanceStaker3Medal2.toString()).to.be.equal('0');
    expect(balanceStaker3Medal3.toString()).to.be.equal('1');

    expect(levelOfStakerAfter1.toString()).to.be.equal('1');
    expect(levelOfStakerAfter2.toString()).to.be.equal('2');
    expect(levelOfStakerAfter3.toString()).to.be.equal('3');

    expect(Number(staker1StakingAmounAfter)).to.be.greaterThan(
      Number(staker1StakingAmountBefore)
    );
    expect(Number(staker2StakingAmounAfter)).to.be.greaterThan(
      Number(staker2StakingAmountBefore)
    );
    expect(Number(staker3StakingAmounAfter)).to.be.greaterThan(
      Number(staker3StakingAmountBefore)
    );

    expect(Number(staker1ALBTBalanceAfter)).to.be.equal(
      Number(staker1ALBTBalanceBefore.sub(amountToStake1))
    );
    expect(Number(staker2ALBTBalanceAfter)).to.be.equal(
      Number(staker2ALBTBalanceBefore.sub(amountToStake2))
    );
    expect(Number(staker3ALBTBalanceAfter)).to.be.equal(
      Number(staker3ALBTBalanceBefore.sub(amountToStake3))
    );

    expect(Number(stakingContractALBTBalanceAfter)).to.be.equal(
      Number(stakingContractALBTBalanceBefore.add(amountToStake1).add(amountToStake2).add(amountToStake3))
    );

    expect(Number(stakedSupplyAfter)).to.be.equal(
      Number(stakedSupplyBefore.add(amountToStake1).add(amountToStake2).add(amountToStake3))
    );
    expect(Number(rALBTBalanceAfter1)).to.be.greaterThan(
      Number(rALBTBalanceBefore1)
    );
    expect(Number(rALBTBalanceAfter2)).to.be.greaterThan(
      Number(rALBTBalanceBefore2)
    );
    expect(Number(rALBTBalanceAfter3)).to.be.greaterThan(
      Number(rALBTBalanceBefore3)
    );

    //4) Funders declare their intention to buy a partition (effectively depositing their funds)
    // Given
    const numberOfPartitions = BigNumber.from(3);
    const amountOfLendingTokens = numberOfPartitions.mul(
      ethers.utils.parseEther(BASE_AMOUNT + '')
    );
    const initLenderLendingTokenBalance1 =
      await this.lendingTokenContract.balanceOf(this.lender1);
    const initLenderLendingTokenBalance2 =
      await this.lendingTokenContract.balanceOf(this.lender2);
    const initLenderLendingTokenBalance3 =
      await this.lendingTokenContract.balanceOf(this.lender3);
    const initLenderLendingTokenBalance4 =
      await this.lendingTokenContract.balanceOf(this.lender4);
    const initEscrowLendingTokenBalance =
      await this.lendingTokenContract.balanceOf(this.escrowContract.address);

    await this.registryContract
      .connect(this.lender1Signer)
      .showInterestForInvestment(this.investmentId, numberOfPartitions);

    await this.registryContract
      .connect(this.lender2Signer)
      .showInterestForInvestment(this.investmentId, numberOfPartitions);

    await this.registryContract
      .connect(this.lender3Signer)
      .showInterestForInvestment(this.investmentId, numberOfPartitions);
    
    //simulates lender4 has rALBT from other methods besides staking
    //GET rALBT HERE!!
    const addressZero = '0x0000000000000000000000000000000000000000';
    const actions = [
      {
        account: this.lender4,
        actionName: 'Wallet Connect',
        answer: 'Yes',
        referralId: '0',
      },
    ];

    // Given
    const reputationalAlbtRewardsPerLevel = [
      ethers.utils.parseEther('500').toString(),
      ethers.utils.parseEther('500').toString(),
      ethers.utils.parseEther('500').toString(),
      ethers.utils.parseEther('500').toString(),
    ];

    const reputationalAlbtRewardsPerLevelAfterFirstTime = [
      ethers.utils.parseEther('10').toString(),
      ethers.utils.parseEther('10').toString(),
      ethers.utils.parseEther('10').toString(),
      ethers.utils.parseEther('10').toString(),
    ];

    await this.actionVerifierContract
      .connect(this.deployerSigner)
      .importAction(
        'Wallet Connect',
        reputationalAlbtRewardsPerLevel,
        reputationalAlbtRewardsPerLevelAfterFirstTime,
        2,
        addressZero,
      );

    let signature = await getSignature(
      'Wallet Connect',
      'Yes',
      this.lender4,
      0,
      this.actionVerifierContract.address,
      web3
    );

    const signatures = [signature];

    await this.actionVerifierContract
      .connect(this.lender3Signer)
      .provideRewardsForActions(actions, signatures);

    for (let i = 0; i < 50; i++) {
      await increaseTime(this.deployerSigner.provider, 1 * 24 * 60 * 60); // 1 day
  
      await this.actionVerifierContract
        .connect(this.lender3Signer)
        .provideRewardsForActions(actions, signatures);
    }

    await this.registryContract
      .connect(this.lender4Signer)
      .showInterestForInvestment(this.investmentId, numberOfPartitions);

    const lenderLendingTokenBalanceAfter1 =
      await this.lendingTokenContract.balanceOf(this.lender1);
    const lenderLendingTokenBalanceAfter2 =
      await this.lendingTokenContract.balanceOf(this.lender2);
    const lenderLendingTokenBalanceAfter3 =
      await this.lendingTokenContract.balanceOf(this.lender3);
    const lenderLendingTokenBalanceAfter4 =
      await this.lendingTokenContract.balanceOf(this.lender4);
    const escrowLendingTokenBalanceAfter =
      await this.lendingTokenContract.balanceOf(this.escrowContract.address);

    expect(lenderLendingTokenBalanceAfter1).to.be.equal(
      initLenderLendingTokenBalance1.sub(amountOfLendingTokens)
    );

    expect(lenderLendingTokenBalanceAfter2).to.be.equal(
      initLenderLendingTokenBalance2.sub(amountOfLendingTokens)
    );

    expect(lenderLendingTokenBalanceAfter3).to.be.equal(
      initLenderLendingTokenBalance3.sub(amountOfLendingTokens)
    );

    expect(lenderLendingTokenBalanceAfter4).to.be.equal(
      initLenderLendingTokenBalance4.sub(amountOfLendingTokens)
    );

    expect(escrowLendingTokenBalanceAfter).to.be.equal(
      initEscrowLendingTokenBalance.add(amountOfLendingTokens).add(amountOfLendingTokens).add(amountOfLendingTokens).add(amountOfLendingTokens)
    );

    //5) The lottery is run when all the partitions have been covered
    const investmentDetails =
      await this.registryContract.investmentDetails(this.investmentId);

    const numberOfPartitionsToBuy = BigNumber.from(Number(investmentDetails.totalPartitionsToBePurchased)-Number(investmentDetails.partitionsRequested));

    await this.registryContract
      .connect(this.lender1Signer)
      .showInterestForInvestment(this.investmentId, numberOfPartitionsToBuy);

    await this.governanceContract
      .connect(this.superDelegatorSigner)
      .checkCronjobs();

    const investmentStatusAfter =
      await this.registryContract.investmentStatus(this.investmentId);

    expect(investmentStatusAfter).to.be.equal(2);

    await expect(
      this.registryContract
        .connect(this.lender3Signer)
        .executeLotteryRun(this.investmentId)
    )
      .to.emit(this.registryContract, 'LotteryExecuted')
      .withArgs(this.investmentId);

    const ticketsRemainingAfter =
      await this.registryContract.ticketsRemaining(this.investmentId);
    expect(ticketsRemainingAfter.toNumber()).to.be.equal(0);

    //6) FundingNFTs are minted and each Funder either receives their NFT or their funds back in case they did not win the lottery

    //7) Funders with a FundingNFT exchange it for their Investment tokens

    //8) Seeker claims the funding, when all investment tokens have been exchanged.
  });
}