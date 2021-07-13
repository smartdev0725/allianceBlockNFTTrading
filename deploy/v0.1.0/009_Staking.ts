import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import '@nomiclabs/hardhat-ethers';
import {ethers} from 'hardhat';

const version = 'v0.1.0';
const contractName = 'Staking';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {deployments, getNamedAccounts, getChainId} = hre;
  const {deploy, get} = deployments;
  const {deployer, proxyOwner} = await getNamedAccounts();

  const chainId = await getChainId();
  if (+chainId === 1 && !process.env.ALBT_TOKEN_ADDRESS) {
    throw new Error("ALBT_TOKEN_ADDRESS env var should not be empty");
  }

  const albtContractAddress = (+chainId === 1)
    ? process.env.ALBT_TOKEN_ADDRESS
    : (await get('ALBT')).address;
  const escrowContractAddress = (await get('Escrow')).address;
  const stakerMedalNFTContractAddress = (await get('StakerMedalNFT')).address;

  const stakingTypeAmounts = [
    ethers.utils.parseEther('0'),
    ethers.utils.parseEther('5000'),
    ethers.utils.parseEther('20000'),
    ethers.utils.parseEther('50000'),
  ];
  const reputationalStakingTypeAmounts = [
    ethers.utils.parseEther('0'),
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
      escrowContractAddress,
      stakerMedalNFTContractAddress,
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
func.dependencies = ['Escrowv0.1.0', 'StakerMedalNFTv0.1.0'];
func.id = id;
