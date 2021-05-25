import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, proxyOwner} = await getNamedAccounts();

  await deploy('MainNFT', {
    contract: 'MainNFT',
    from: deployer,
    proxy: {
      owner: proxyOwner,
      methodName: 'initialize',
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
    args: ['Alliance Block Custody NFT', 'bNFT'],
    log: true,
  });
};
export default func;
func.tags = ['MainNFT'];
