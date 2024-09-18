const hre = require("hardhat");

async function main() {
  const DonGuilloToken = await hre.ethers.getContractFactory("DonGuilloToken");
  const donGuilloToken = await DonGuilloToken.deploy(hre.ethers.parseEther("1000000"));

  await donGuilloToken.waitForDeployment();

  console.log("DonGuilloToken deployed to:", await donGuilloToken.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });