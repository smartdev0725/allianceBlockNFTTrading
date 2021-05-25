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
};
export default func;
func.tags = ['Registry'];
func.dependencies = [
  'FundingNFT',
  'MainNFT',
  'Staking',
  'Governance',
  'Escrow',
];
