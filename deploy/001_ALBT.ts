import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts, getChainId} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  const chainId = await getChainId();

  // Only for development stage
  if (+chainId !== 1) {
    await deploy('ALBT', {
      contract: 'ALBT',
      from: deployer,
      log: true,
    });
  }
};
export default func;
func.tags = ['ALBT'];
