import {BASE_AMOUNT} from '../../helpers/constants';
import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import chai, {expect} from 'chai';
import {solidity} from 'ethereum-waffle';
import {StakingType, InvestmentStatus} from '../../helpers/registryEnums';
const {expectRevert} = require('@openzeppelin/test-helpers');

chai.use(solidity);

export default async function suite() {
  describe('Show investment interest', async () => {
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

    });

  });
}
