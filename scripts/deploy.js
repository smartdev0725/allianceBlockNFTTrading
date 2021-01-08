const { ethers, upgrades } = require("hardhat");

async function main() {
  const Protocol = await ethers.getContractFactory("Protocol");
  const protocol = await upgrades.deployProxy(Protocol, [100], {
    initializer: "store",
  });
  console.log("Protocol deployed to:", protocol.address);

  const value = await protocol.retrieve();
  console.log("Current value:", Number(value));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
