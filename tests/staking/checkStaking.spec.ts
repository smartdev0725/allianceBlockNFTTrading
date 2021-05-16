import BN from 'bn.js';
import {ethers, deployments, getNamedAccounts} from 'hardhat';
import {toWei} from 'web3-utils';
import {expect} from 'chai';
import {ONE_DAY} from '../helpers/constants';
import {increaseTime} from '../helpers/time';
import {getContracts, getSigners, initializeTransfers} from '../helpers/utils';
import {BigNumber} from 'ethers';

describe('Check Staking', async () => {
  let registryContract: any;
  let governanceContract: any;
  let fundingNFTContract: any;
  let escrowContract: any;
  let lendingTokenContract: any;
  let projectTokenContract: any;
  let collateralTokenContract: any;
  let ALBTContract: any;
  let stakingContract: any;

  beforeEach(async function () {
    // Deploy fixtures
    await deployments.fixture();

    // Get accounts
    const {
      deployer,
      seeker,
      lender1,
      lender2,
      staker1,
      staker2,
      rewardDistributor,
    } = await getNamedAccounts();
    const {
      deployerSigner,
      lender1Signer,
      lender2Signer,
      seekerSigner,
      rewardDistributorSigner,
      staker1Signer,
      staker2Signer,
      delegator1Signer,
      delegator2Signer,
    } = await getSigners();

    // Get contracts
    ({
      registryContract,
      governanceContract,
      fundingNFTContract,
      escrowContract,
      lendingTokenContract,
      projectTokenContract,
      collateralTokenContract,
      ALBTContract,
      stakingContract,
    } = await getContracts());

    // Initialize Transfers
    await initializeTransfers(
      {
        registryContract,
        lendingTokenContract,
        projectTokenContract,
        collateralTokenContract,
      },
      {lender1, lender2, seeker, deployer},
      {deployerSigner, lender1Signer, lender2Signer, seekerSigner}
    );

    // Transfer tokens to reward distributor
    const amountForDistributor = ethers.utils.parseEther('100000000');
    // Signer 0 is the deployer
    await ALBTContract.connect(deployerSigner).mint(
      rewardDistributor,
      amountForDistributor
    );
    // Signer 6 is the rewardDistributor, see hardhat file config
    await ALBTContract.connect(rewardDistributorSigner).approve(
      stakingContract.address,
      amountForDistributor
    );

    // Transfer ALBT tokens to stakers
    const amountForStakers = new BN(toWei('1000000')).toString();

    // Staker1
    await ALBTContract.connect(deployerSigner).mint(staker1, amountForStakers);
    await ALBTContract.connect(staker1Signer).approve(
      stakingContract.address,
      amountForStakers
    );
    // Staker2
    await ALBTContract.connect(deployerSigner).mint(staker2, amountForStakers);
    await ALBTContract.connect(staker2Signer).approve(
      stakingContract.address,
      amountForStakers
    );

    await stakingContract
      .connect(rewardDistributorSigner)
      .notifyRewardAmount(BigNumber.from(0));
  });

  it('when staking tokens and getting rewards', async function () {
    //Given
    const {staker1, staker2} = await getNamedAccounts();

    const {rewardDistributorSigner, staker1Signer} = await getSigners();

    const stakingProxyContract = await deployments.get('Staking_Proxy');
    const stakingContract = await ethers.getContractAt(
      'Staking',
      stakingProxyContract.address
    );
    const stakeAmount = ethers.utils.parseEther('1000');

    // When
    await stakingContract.connect(staker1Signer).stake(stakeAmount.toString());
    const rewardAmount = ethers.utils.parseEther('1000');
    await stakingContract
      .connect(rewardDistributorSigner)
      .notifyRewardAmount(rewardAmount.toString());

    await increaseTime(staker1Signer.provider, ONE_DAY);

    const reward = await stakingContract.rewardPerToken();

    expect(rewardAmount.div(stakeAmount).toNumber()).to.be.equal(
      reward.toNumber()
    );

    await stakingContract.connect(staker1Signer).stake(stakeAmount.toString());
    await stakingContract
      .connect(rewardDistributorSigner)
      .notifyRewardAmount(rewardAmount.toString());

    await increaseTime(staker1Signer.provider, ONE_DAY);

    const earnedFirstStaker = await stakingContract.earned(staker1);
    const earnedSecondStaker = await stakingContract.earned(staker2);

    //Then
    // Avoid scientific exponential numbers. (toLocaleString())
    expect(
      rewardAmount.mul(BigNumber.from(3)).div(BigNumber.from(2))
    ).to.be.equal(
      Math.round(earnedFirstStaker).toLocaleString('fullwide', {
        useGrouping: false,
      })
    );
    expect(rewardAmount.div(BigNumber.from(2))).to.be.equal(
      new BN(Math.round(earnedSecondStaker).toString())
    );
  });
});
