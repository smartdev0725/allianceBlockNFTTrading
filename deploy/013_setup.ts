import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {ethers} from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {get} = deployments;

  const {deployer, proxyOwner, rewardDistributor} = await getNamedAccounts();

  const Staking = await get('Staking');
  const Escrow = await get('Escrow');
  const ActionVerifier = await get('ActionVerifier');

  const stakingContract = await ethers.getContract('Staking');
  await stakingContract.setRewardDistribution(rewardDistributor);


  const registryContract = await ethers.getContract('Registry');
  const fundingNFTContract = await ethers.getContract('FundingNFT');
  const mainNFTContract = await ethers.getContract('MainNFT');
  const governanceContract = await ethers.getContract('Governance');
  const escrowContract = await ethers.getContract('Escrow');
  const actionVerifierContract = await ethers.getContract('ActionVerifier');

  // Setup escrow
  const escrowRegistryAddress = await escrowContract.registry();
  const escrowActionVerifierAddress = await escrowContract.actionVerifier();
  const escrowStakingAddress = await escrowContract.staking();
  if (escrowRegistryAddress === ethers.constants.AddressZero &&
    escrowActionVerifierAddress === ethers.constants.AddressZero &&
    escrowStakingAddress === ethers.constants.AddressZero
  ) {
    await escrowContract.afterInitialize(registryContract.address, actionVerifierContract.address, stakingContract.address);
  }

  // Setup governance
  const governanceAddress = await governanceContract.registry();
  const stakingAddress = await governanceContract.staking();
  if (
    governanceAddress === ethers.constants.AddressZero &&
    stakingAddress === ethers.constants.AddressZero
  ) {
    await governanceContract.setRegistryAndStaking(
      registryContract.address,
      Staking.address
    );
  }

  // Setup FundingNFT
  const hasRoleMinter = await fundingNFTContract.hasRole(
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes('MINTER_ROLE')),
    registryContract.address,
    {from: deployer}
  );
  if (!hasRoleMinter) {
    await fundingNFTContract.grantRole(
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('MINTER_ROLE')),
      registryContract.address,
      {from: deployer}
    );
  }
  const hasRolePauser = await fundingNFTContract.hasRole(
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes('PAUSER_ROLE')),
    registryContract.address,
    {from: deployer}
  );
  if (!hasRolePauser) {
    await fundingNFTContract.grantRole(
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('PAUSER_ROLE')),
      registryContract.address,
      {from: deployer}
    );
  }

  // Setup registry

};
export default func;
func.runAtTheEnd = true;
func.tags = ['Setup'];
