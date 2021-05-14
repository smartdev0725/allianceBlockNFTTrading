import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import '@nomiclabs/hardhat-ethers';
import {ethers} from 'hardhat';

import {
  DAO_LOAN_APPROVAL,
  DAO_MILESTONE_APPROVAL,
  AMOUNT_FOR_DAO_MEMBERSHIP,
} from '../utils/constants';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, get} = deployments;

  const {deployer, delegator1, delegator2} = await getNamedAccounts();

  await deploy('Governance', {
    contract: 'Governance',
    from: deployer,
    proxy: {
      owner: deployer,
      methodName: 'initialize',
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
    args: [
      [delegator1, delegator2],
      2,
      DAO_LOAN_APPROVAL,
      DAO_MILESTONE_APPROVAL,
      ethers.utils.parseEther(AMOUNT_FOR_DAO_MEMBERSHIP + '').toString(), // Same as toWei in web3
    ],
    log: true,
  });
};
export default func;
func.tags = ['Governance'];
