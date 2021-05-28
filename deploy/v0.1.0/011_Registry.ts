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
} from '../../utils/constants';

const version = 'v0.1.0';
const contractName = 'Registry';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, get} = deployments;

  const {deployer, proxyOwner} = await getNamedAccounts();

  const escrowAddress = (await get('Escrow')).address;
  const governanceAddress = (await get('Governance')).address;
  const lendingTokenAddress = process.env.LENDING_TOKEN_ADDRESS ? process.env.LENDING_TOKEN_ADDRESS: (await get('LendingToken')).address;
  const mainNFTAddress = (await get('MainNFT')).address;
  const fundingNFTAddress = (await get('FundingNFT')).address;

  await deploy(contractName, {
    contract: contractName,
    from: deployer,
    proxy: {
      owner: proxyOwner,
      methodName: 'initialize',
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
    args: [
      escrowAddress,
      governanceAddress,
      lendingTokenAddress,
      mainNFTAddress,
      fundingNFTAddress,
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
  return true;
};

const id = contractName + version;

export default func;
func.tags = [id, version];
func.dependencies = [
  'FundingNFT',
  'MainNFT',
  'Staking',
  'Governance',
  'Escrow',
];
func.id = id;
