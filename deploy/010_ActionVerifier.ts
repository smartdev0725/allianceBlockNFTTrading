import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import '@nomiclabs/hardhat-ethers';
import {ethers} from 'hardhat';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, get} = deployments;

  const {deployer, proxyOwner} = await getNamedAccounts();

  const Escrow = await get('Escrow');

  await deploy('ActionVerifier', {
    contract: 'ActionVerifier',
    from: deployer,
    proxy: {
      owner: proxyOwner,
      methodName: 'initialize',
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
    args: [10, 10, Escrow.address],
    log: true,
  });
};
export default func;
func.tags = ['ActionVerifier'];
