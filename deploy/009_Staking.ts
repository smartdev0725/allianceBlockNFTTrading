import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import '@nomiclabs/hardhat-ethers';
import {ethers} from 'hardhat';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, get} = deployments;

  const ALBTContract = await get('ALBT');
  const governanceContract = await get('Governance');
  const escrowContract = await get('Escrow');
  const {deployer, proxyOwner} = await getNamedAccounts();

  await deploy('Staking', {
    contract: 'Staking',
    from: deployer,
    proxy: {
      owner: proxyOwner,
      methodName: 'initialize',
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
    args: [ALBTContract.address, governanceContract.address, escrowContract.address, [3, 3], [3, 3]],
    log: true,
  });

};
export default func;
func.tags = ['Staking'];
