import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import '@nomiclabs/hardhat-ethers';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, get} = deployments;

  const ALBT = await get('ALBT');
  const {deployer} = await getNamedAccounts();

  await deploy('Staking', {
    contract: 'Staking',
    from: deployer,
    proxy: {
      owner: deployer,
      methodName: 'initialize',
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
    args: [ALBT.address],
    log: true,
  });
};
export default func;
func.tags = ['Staking'];
