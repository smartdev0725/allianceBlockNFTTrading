import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import '@nomiclabs/hardhat-ethers';
import { ethers } from 'hardhat';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;

  const ALBTContract = await get('ALBT');
  const governanceContract = await get('Governance');
  const escrowContract = await get('Escrow');
  const { deployer, proxyOwner } = await getNamedAccounts();
  const stakingTypeAmounts = [ethers.utils.parseEther('5000'), ethers.utils.parseEther('20000'), ethers.utils.parseEther('50000'), ethers.utils.parseEther('200000')];
  const reputationalStakingTypeAmounts = [ethers.utils.parseEther('1000'), ethers.utils.parseEther('5000'), ethers.utils.parseEther('13000')];

  await deploy('Staking', {
    contract: 'Staking',
    from: deployer,
    proxy: {
      owner: proxyOwner,
      methodName: 'initialize',
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
    args: [ALBTContract.address, governanceContract.address, escrowContract.address, stakingTypeAmounts, reputationalStakingTypeAmounts],
    log: true,
  });

};
export default func;
func.tags = ['Staking'];
