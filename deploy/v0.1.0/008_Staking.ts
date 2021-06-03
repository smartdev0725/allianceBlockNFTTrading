import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import '@nomiclabs/hardhat-ethers';
import {ethers} from 'hardhat';

const version = 'v0.1.0';
const contractName = 'Staking';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, get} = deployments;

  const albtContractAddress = process.env.ALBT_TOKEN_ADDRESS ? process.env.ALBT_TOKEN_ADDRESS: (await get('ALBT')).address;
  const governanceContractAddress = (await get('Governance')).address;
  const escrowContractAddress = (await get('Escrow')).address;
  const {deployer, proxyOwner} = await getNamedAccounts();

  const stakingTypeAmounts = [
    ethers.utils.parseEther('5000'),
    ethers.utils.parseEther('20000'),
    ethers.utils.parseEther('50000'),
    ethers.utils.parseEther('200000'),
  ];
  const reputationalStakingTypeAmounts = [
    ethers.utils.parseEther('1000'),
    ethers.utils.parseEther('5000'),
    ethers.utils.parseEther('13000'),
  ];

  await deploy(contractName, {
    contract: contractName,
    from: deployer,
    proxy: {
      owner: proxyOwner,
      methodName: 'initialize',
      proxyContract: 'OpenZeppelinTransparentProxy',
    },
    args: [
      albtContractAddress,
      governanceContractAddress,
      escrowContractAddress,
      stakingTypeAmounts,
      reputationalStakingTypeAmounts,
    ],
    log: true,
  });
  return true;
};

const id = contractName + version;

export default func;
func.tags = [id, version];
func.dependencies = ['Governance', 'Escrow'];
func.id = id;
