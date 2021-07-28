import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const version = 'v0.1.0';
const contractName = 'ProjectManager';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts, getChainId} = hre;
  const {deploy} = deployments;

  const {deployer, proxyOwner} = await getNamedAccounts();
  const chainId = await getChainId();

  // Only for development stage
  if (+chainId !== 1) {
    await deploy(contractName, {
      contract: contractName,
      from: deployer,
      log: true,
      proxy: {
        owner: proxyOwner,
        methodName: 'initialize',
        proxyContract: 'OpenZeppelinTransparentProxy',
      },
    });
  }
  return true;
};

const id = contractName + version;

export default func;
func.tags = [id, version];
func.id = id;
