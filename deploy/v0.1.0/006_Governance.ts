import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import '@nomiclabs/hardhat-ethers';
import {ethers} from 'hardhat';

import {
  APPLICATION_FOR_INVESTMENT_DURATION,
  LATE_APPLICATION_FOR_INVESTMENT_DURATION,
} from '../../utils/constants';

const version = 'v0.1.0';
const contractName = 'Governance';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, proxyOwner, superDelegator} = await getNamedAccounts();

  await deploy(contractName, {
    contract: contractName,
    from: deployer,
    proxy: {
      owner: proxyOwner,
      methodName: 'initialize',
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
    args: [
      superDelegator,
      APPLICATION_FOR_INVESTMENT_DURATION,
      LATE_APPLICATION_FOR_INVESTMENT_DURATION,
    ],
    log: true,
  });
  return true;
};

const id = contractName + version;

export default func;
func.tags = [id, version];
func.id = id;
