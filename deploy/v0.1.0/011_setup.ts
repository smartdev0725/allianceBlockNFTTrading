import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {ethers} from 'hardhat';

const version = 'v0.1.0';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const signers = await ethers.getSigners();
  const deployerSigner = signers[0];

  const stakingContract = await ethers.getContract('Staking');

  const registryContract = await ethers.getContract('Registry');
  const fundingNFTContract = await ethers.getContract('FundingNFT');
  const governanceContract = await ethers.getContract('Governance');
  const escrowContract = await ethers.getContract('Escrow');
  const actionVerifierContract = await ethers.getContract('ActionVerifier');
  const rALBTAddress = await escrowContract.reputationalALBT();

  // Setup escrow
  const escrowRegistryAddress = await escrowContract.registry();
  const escrowActionVerifierAddress = await escrowContract.actionVerifier();
  const escrowStakingAddress = await escrowContract.staking();
  if (
    escrowRegistryAddress === ethers.constants.AddressZero &&
    escrowActionVerifierAddress === ethers.constants.AddressZero &&
    escrowStakingAddress === ethers.constants.AddressZero
  ) {
    await escrowContract.afterInitialize(
      registryContract.address,
      actionVerifierContract.address,
      stakingContract.address
    );
  }

  // Setup governance
  const governanceAddress = await governanceContract.registry();
  if (governanceAddress === ethers.constants.AddressZero) {
    await governanceContract.setRegistry(registryContract.address);
  }

  // Setup FundingNFT
  const hasRoleMinter = await fundingNFTContract.hasRole(
    ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']),
    registryContract.address
  );
  if (!hasRoleMinter) {
    await fundingNFTContract
      .connect(deployerSigner)
      .grantRole(
        ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']),
        registryContract.address
      );
  }
  const hasRolePauser = await fundingNFTContract.hasRole(
    ethers.utils.solidityKeccak256(['string'], ['PAUSER_ROLE']),
    registryContract.address
  );
  if (!hasRolePauser) {
    await fundingNFTContract
      .connect(deployerSigner)
      .grantRole(
        ethers.utils.solidityKeccak256(['string'], ['PAUSER_ROLE']),
        registryContract.address
      );
  }

  // Setup registry
  const totalTicketsPerRun = 50;
  const rAlbtPerLotteryNumber = ethers.utils.parseEther('1000');
  const blocksLockedForReputation = 20;
  const lotteryNumbersForImmediateTicket = 10;
  await registryContract
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
