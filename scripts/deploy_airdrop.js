const hre = require("hardhat");
const { generateMerkleRoot } = require("../data/merkle");

async function main() {
  const merkleRoot = await generateMerkleRoot();

  const DonGuilloToken = await hre.ethers.getContractFactory("DonGuilloToken");
  const donGuilloToken = await DonGuilloToken.attach("0x8B8e531d86f39B6D4F26A623793A030d8A79ed14");

  const MerkleAirdrop = await hre.ethers.getContractFactory("MerkleAirdrop");
  const merkleAirdrop = await MerkleAirdrop.deploy(
    donGuilloToken.getAddress(),
    "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
    merkleRoot
  );

  await merkleAirdrop.waitForDeployment();

  console.log("MerkleAirdrop deployed to:", await merkleAirdrop.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });