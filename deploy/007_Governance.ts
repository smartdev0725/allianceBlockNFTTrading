import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import '@nomiclabs/hardhat-ethers';
import {ethers} from 'hardhat';

import {
  DAO_LOAN_APPROVAL_REQUEST_DURATION,
  DAO_MILESTONE_APPROVAL_REQUEST_DURATION,
  DAO_UPDATE_REQUEST_DURATION,
  APPLICATION_FOR_INVESTMENT_DURATION,
  LATE_APPLICATION_FOR_INVESTMENT_DURATION,
} from '../utils/constants';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, proxyOwner, superDelegator} = await getNamedAccounts();

  await deploy('Governance', {
    contract: 'Governance',
    from: deployer,
    proxy: {
      owner: proxyOwner,
      methodName: 'initialize',
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
    args: [
      superDelegator,
      DAO_LOAN_APPROVAL_REQUEST_DURATION,
      DAO_MILESTONE_APPROVAL_REQUEST_DURATION,
      DAO_UPDATE_REQUEST_DURATION,
      2,
      2,
      APPLICATION_FOR_INVESTMENT_DURATION,
      LATE_APPLICATION_FOR_INVESTMENT_DURATION,
    ],
    log: true,
  });
};
export default func;
func.tags = ['Governance'];
