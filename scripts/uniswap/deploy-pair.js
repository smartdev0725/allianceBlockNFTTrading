async function main() {
  const accounts = await web3.eth.getAccounts();
  const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");

  const factory = await UniswapV2Factory.deploy(accounts[0]);
  console.log("Uniswap Factory deployed to:", factory.address);

  const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
  const ALBT_ADDRESS = "0x00a8b738E453fFd858a7edf03bcCfe20412f0Eb0";

  await factory.createPair(WETH_ADDRESS, ALBT_ADDRESS);

  const pair = await factory.getPair(WETH_ADDRESS, ALBT_ADDRESS);
  console.log("Uniswap pair deployed to:", pair);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
