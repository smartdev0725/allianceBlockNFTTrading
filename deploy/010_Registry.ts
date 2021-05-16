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
  AMOUNT_FOR_DAO_MEMBERSHIP,
} from '../utils/constants';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, get} = deployments;

  const {deployer} = await getNamedAccounts();

  const Escrow = await get('Escrow_Proxy');
  const Governance = await get('Governance_Proxy');
  const LendingToken = await get('LendingToken');
  const MainNFT = await get('MainNFT_Proxy');
  const FundingNFT = await get('FundingNFT_Proxy');
  const Staking = await get('Staking_Proxy');

  await deploy('Registry', {
    contract: 'Registry',
    from: deployer,
    proxy: {
      owner: deployer,
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

  const registryProxyContract = await deployments.get('Registry_Proxy');

  const fundingNFTProxyContract = await deployments.get('FundingNFT_Proxy');
  const fundingNFTContract = await ethers.getContractAt(
    'FundingNFT',
    fundingNFTProxyContract.address
  );

  const mainNFTProxyContract = await deployments.get('MainNFT_Proxy');
  const mainNFTContract = await ethers.getContractAt(
    'MainNFT',
    mainNFTProxyContract.address
  );

  const governanceProxyContract = await deployments.get('Governance_Proxy');
  const governanceContract = await ethers.getContractAt(
    'Governance',
    governanceProxyContract.address
  );

  const escrowProxyContract = await deployments.get('Escrow_Proxy');
  const escrowContract = await ethers.getContractAt(
    'Escrow',
    escrowProxyContract.address
  );

  const registryAddress = await escrowContract.registry();
  if (registryAddress === ethers.constants.AddressZero) {
    await escrowContract.setRegistry(registryProxyContract.address);
  }

  const governanceAddress = await governanceContract.registry();
  const stakingAddress = await governanceContract.staking();
  if (
    governanceAddress === ethers.constants.AddressZero &&
    stakingAddress === ethers.constants.AddressZero
  ) {
    await governanceContract.setRegistryAndStaking(
      registryProxyContract.address,
      Staking.address
    );
  }

  // Add roles.
  const hasRoleMinter = await fundingNFTContract.hasRole(
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes('MINTER_ROLE')),
    registryProxyContract.address,
    {from: deployer}
  );
  if (!hasRoleMinter) {
    await fundingNFTContract.grantRole(
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('MINTER_ROLE')),
      registryProxyContract.address,
      {from: deployer}
    );
  }

  const hasRolePauser = await fundingNFTContract.hasRole(
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes('PAUSER_ROLE')),
    registryProxyContract.address,
    {from: deployer}
  );
  if (!hasRolePauser) {
    await fundingNFTContract.grantRole(
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('PAUSER_ROLE')),
      registryProxyContract.address,
      {from: deployer}
    );
  }
};
export default func;
func.tags = ['Registry'];
