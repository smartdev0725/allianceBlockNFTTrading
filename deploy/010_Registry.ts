import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import '@nomiclabs/hardhat-ethers';
import {deployments, ethers} from 'hardhat';

import {
  BASE_AMOUNT,
  MINIMUM_INTEREST_PERCENTAGE,
  MAX_MILESTONES,
  MILESTONE_EXTENSION,
  VESTING_BATCHES,
  VESTING_TIME_INTERVAL,
  FUNDING_TIME_INTERVAL,
} from '../utils/constants';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, get} = deployments;

  const {deployer, proxyOwner} = await getNamedAccounts();

  const Escrow = await get('Escrow');
  const Governance = await get('Governance');
  const LendingToken = await get('LendingToken');
  const MainNFT = await get('MainNFT');
  const FundingNFT = await get('FundingNFT');
  const Staking = await get('Staking');

  await deploy('Registry', {
    contract: 'Registry',
    from: deployer,
    proxy: {
      owner: proxyOwner,
      methodName: 'initialize',
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
    args: [
      Escrow.address,
      Governance.address,
      LendingToken.address,
      MainNFT.address,
      FundingNFT.address,
      ethers.utils.parseEther(BASE_AMOUNT + '').toString(), // Same as toWei in web3
      MINIMUM_INTEREST_PERCENTAGE,
      MAX_MILESTONES,
      MILESTONE_EXTENSION,
      VESTING_BATCHES,
      VESTING_TIME_INTERVAL,
      FUNDING_TIME_INTERVAL,
    ],
    log: true,
  });

  const registryContract = await ethers.getContract('Registry');
  const fundingNFTContract = await ethers.getContract('FundingNFT');
  const mainNFTContract = await ethers.getContract('MainNFT');
  const governanceContract = await ethers.getContract('Governance');
  const escrowContract = await ethers.getContract('Escrow');

  const registryAddress = await escrowContract.registry();
  if (registryAddress === ethers.constants.AddressZero) {
    await escrowContract.setRegistry(registryContract.address);
  }

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

  // Add roles.
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
};
export default func;
func.tags = ['Registry'];
func.dependencies = ['FundingNFT', 'MainNFT', 'Staking', 'Governance', 'Escrow'];
