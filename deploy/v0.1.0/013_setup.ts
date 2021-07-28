import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {ethers} from 'hardhat';

const version = 'v0.1.0';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const signers = await ethers.getSigners();
  const deployerSigner = signers[0];

  const stakingContract = await ethers.getContract('Staking');
  const investmentContract = await ethers.getContract('Investment');
  const fundingNFTContract = await ethers.getContract('FundingNFT');
  const stakerMedalNFTContract = await ethers.getContract('StakerMedalNFT');
  const escrowContract = await ethers.getContract('Escrow');
  const actionVerifierContract = await ethers.getContract('ActionVerifier');
  const rALBTAddress = await escrowContract.reputationalALBT();

  // Setup escrow
  const escrowActionVerifierAddress = await escrowContract.actionVerifier();
  const escrowStakingAddress = await escrowContract.staking();
  if (
    escrowActionVerifierAddress === ethers.constants.AddressZero &&
    escrowStakingAddress === ethers.constants.AddressZero
  ) {
    await escrowContract.afterInitialize(
      actionVerifierContract.address,
      stakingContract.address
    );
  }

  // Setup FundingNFT
  const hasRoleMinter = await fundingNFTContract.hasRole(
    ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']),
    investmentContract.address
  );
  if (!hasRoleMinter) {
    await fundingNFTContract
      .connect(deployerSigner)
      .grantRole(
        ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']),
        investmentContract.address
      );
    await fundingNFTContract
      .connect(deployerSigner)
      .grantRole(
        ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']),
        escrowContract.address
      );
  }
  const hasRolePauser = await fundingNFTContract.hasRole(
    ethers.utils.solidityKeccak256(['string'], ['PAUSER_ROLE']),
    investmentContract.address
  );
  if (!hasRolePauser) {
    await fundingNFTContract
      .connect(deployerSigner)
      .grantRole(
        ethers.utils.solidityKeccak256(['string'], ['PAUSER_ROLE']),
        investmentContract.address
      );
  }

  // Setup StakerMedalNFT
  const hasRoleMinterMedalContract = await stakerMedalNFTContract.hasRole(
    ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']),
    stakingContract.address
  );
  if (!hasRoleMinterMedalContract) {
    await stakerMedalNFTContract
      .connect(deployerSigner)
      .grantRole(
        ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']),
        stakingContract.address
      );
  }

  // Setup investment
  const totalTicketsPerRun = 20;
  const rAlbtPerLotteryNumber = ethers.utils.parseEther('1000');
  const blocksLockedForReputation = 20;
  const lotteryNumbersForImmediateTicket = 6;
  await investmentContract
    .connect(deployerSigner)
    .initializeInvestment(
      rALBTAddress,
      totalTicketsPerRun,
      rAlbtPerLotteryNumber,
      blocksLockedForReputation,
      lotteryNumbersForImmediateTicket
    );
  return true;
};

const id = 'Setup' + version;

export default func;
func.tags = [id, version];
func.id = id;
