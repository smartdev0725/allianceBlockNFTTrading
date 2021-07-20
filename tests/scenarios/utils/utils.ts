import {
  getContracts,
  getSigners,
  initializeTransfers,
} from '../../helpers/utils';
import {StakingType, InvestmentStatus} from '../../helpers/registryEnums';

import {deployments, ethers, getNamedAccounts} from 'hardhat';
import chai, {expect} from 'chai';

// Allows Seeker publishes Investment
export const requestInvestment = async (
  investmentTokenContract: any,
  amountOfTokensToBePurchased: number,
  lendingTokenContract: any,
  totalAmountRequested: number,
  ipfsHash: any,
  seeker: any
) => {
  const {registryContract} = await getContracts();

  const investmentId = await registryContract.totalInvestments();

  await registryContract
    .connect(seeker)
    .requestInvestment(
      investmentTokenContract.address,
      amountOfTokensToBePurchased,
      lendingTokenContract.address,
      totalAmountRequested,
      ipfsHash
    );

  const investmentId2 = await registryContract.totalInvestments();
  expect(Number(investmentId2)).to.be.equal(Number(investmentId) + 1);
};

// SuperGovernance approves Investment
export const superGovernanceApprove = async (
  investmentId: number,
  governanceContract: any,
  superDelegatorSigner: any
) => {
  const {registryContract} = await getContracts();

  const status = await registryContract.investmentStatus(investmentId);
  expect(String(status)).to.be.equal(String(InvestmentStatus.REQUESTED));

  await governanceContract
    .connect(superDelegatorSigner)
    .superVoteForRequest(investmentId, true);

  const status2 = await registryContract.investmentStatus(investmentId);
  expect(String(status2)).to.be.equal(String(InvestmentStatus.APPROVED));
};

// Funders stake
export const fundersStake = async (
  investmentId: number,
  lender: any,
  lenderSigner: any,
  stakingContract: any,
  stakingLevel: StakingType
) => {
  const {
    registryContract,
    ALBTContract,
    rALBTContract,
    stakerMedalNFTContract,
  } = await getContracts();

  if (stakingLevel === StakingType.STAKER_LVL_0) {
  } else {
    // Given
    const stakerStakingAmountBefore = await stakingContract.getBalance(lender);

    const amountToStake = (
      await stakingContract.stakingTypeAmounts(stakingLevel)
    ).sub(stakerStakingAmountBefore);

    const stakerALBTBalanceBefore = await ALBTContract.balanceOf(lender);

    const stakingContractALBTBalanceBefore = await ALBTContract.balanceOf(
      stakingContract.address
    );

    const stakedSupplyBefore = await stakingContract.totalSupply();

    const rALBTBalanceBefore = await rALBTContract.balanceOf(lender);

    // When
    await expect(stakingContract.connect(lenderSigner).stake(stakingLevel))
      .to.emit(stakingContract, 'Staked')
      .withArgs(lender, amountToStake);

    const stakerStakingAmounAfter = await stakingContract.getBalance(lender);

    const stakedSupplyAfter = await stakingContract.totalSupply();
    const stakerALBTBalanceAfter = await ALBTContract.balanceOf(lender);

    const stakingContractALBTBalanceAfter = await ALBTContract.balanceOf(
      stakingContract.address
    );
    const rALBTBalanceAfter = await rALBTContract.balanceOf(lender);

    const levelOfStakerAfter = await stakerMedalNFTContract.getLevelOfStaker(
      lender
    );

    const balanceStakerMedal1 = await stakerMedalNFTContract.balanceOf(
      lender,
      1
    );
    const balanceStakerMedal2 = await stakerMedalNFTContract.balanceOf(
      lender,
      2
    );
    const balanceStakerMedal3 = await stakerMedalNFTContract.balanceOf(
      lender,
      3
    );

    // Then
    const expectedMedals = () => {
      switch (stakingLevel) {
        case StakingType.STAKER_LVL_1:
          return ['1', '0', '0'];
        case StakingType.STAKER_LVL_2:
          return ['0', '1', '0'];
        case StakingType.STAKER_LVL_3:
          return ['0', '0', '1'];
        default:
          return ['0', '0', '0'];
      }
    };
    expect(balanceStakerMedal1.toString()).to.be.equal(expectedMedals()[0]);
    expect(balanceStakerMedal2.toString()).to.be.equal(expectedMedals()[1]);
    expect(balanceStakerMedal3.toString()).to.be.equal(expectedMedals()[2]);

    expect(levelOfStakerAfter.toString()).to.be.equal(stakingLevel);

    expect(Number(stakerStakingAmounAfter)).to.be.greaterThan(
      Number(stakerStakingAmountBefore)
    );

    expect(Number(stakerALBTBalanceAfter)).to.be.equal(
      Number(stakerALBTBalanceBefore.sub(amountToStake))
    );

    expect(Number(stakingContractALBTBalanceAfter)).to.be.equal(
      Number(stakingContractALBTBalanceBefore.add(amountToStake))
    );

    expect(Number(stakedSupplyAfter)).to.be.equal(
      Number(stakedSupplyBefore.add(amountToStake))
    );
    expect(Number(rALBTBalanceAfter)).to.be.greaterThan(
      Number(rALBTBalanceBefore)
    );
  }
};
