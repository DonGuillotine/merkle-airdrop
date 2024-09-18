const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

describe("MerkleAirdrop", function () {
  let DonGuilloToken, donGuilloToken, MerkleAirdrop, merkleAirdrop, MockBAYC, mockBAYC;
  let owner, addr1, addr2;
  let merkleTree, merkleRoot;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    MockBAYC = await ethers.getContractFactory("MockBAYC");
    mockBAYC = await MockBAYC.deploy();
    await mockBAYC.waitForDeployment();

    DonGuilloToken = await ethers.getContractFactory("DonGuilloToken");
    donGuilloToken = await DonGuilloToken.deploy(ethers.parseEther("1000000"));
    await donGuilloToken.waitForDeployment();

    const leaves = [
      [addr1.address, 100],
      [addr2.address, 200]
    ].map(([address, amount]) => 
      keccak256(
        ethers.solidityPacked(
          ["address", "uint256"],
          [address, amount]
        )
      )
    );

    merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    merkleRoot = merkleTree.getHexRoot();

    MerkleAirdrop = await ethers.getContractFactory("MerkleAirdrop");
    merkleAirdrop = await MerkleAirdrop.deploy(await donGuilloToken.getAddress(), await mockBAYC.getAddress(), merkleRoot);
    await merkleAirdrop.waitForDeployment();

    await donGuilloToken.transfer(await merkleAirdrop.getAddress(), ethers.parseEther("1000"));

    await mockBAYC.safeMint(addr1.address);
  });

  it("Should allow eligible user to claim tokens", async function () {
    const amount = 100;
    const leaf = keccak256(
      ethers.solidityPacked(
        ["address", "uint256"],
        [addr1.address, amount]
      )
    );
    const proof = merkleTree.getHexProof(leaf);

    const contractLeaf = await merkleAirdrop.getLeaf(addr1.address, amount);
    console.log("Test leaf:", leaf.toString('hex'));
    console.log("Contract leaf:", contractLeaf.slice(2));

    await expect(merkleAirdrop.connect(addr1).claim(amount, proof))
      .to.emit(merkleAirdrop, "TokensClaimed")
      .withArgs(addr1.address, amount);

    expect(await donGuilloToken.balanceOf(addr1.address)).to.equal(amount);
  });

  it("Should not allow non-BAYC holder to claim", async function () {
    const amount = 200;
    const proof = merkleTree.getHexProof(ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [addr2.address, amount]
      )
    ));

    await expect(merkleAirdrop.connect(addr2).claim(amount, proof))
      .to.be.revertedWith("Must own a BAYC NFT to claim");
  });

  it("Should not allow double claiming", async function () {
    const amount = 100;
    const leaf = keccak256(
      ethers.solidityPacked(
        ["address", "uint256"],
        [addr1.address, amount]
      )
    );
    const proof = merkleTree.getHexProof(leaf);
  
    await merkleAirdrop.connect(addr1).claim(amount, proof);
  
    await expect(merkleAirdrop.connect(addr1).claim(amount, proof))
      .to.be.revertedWith("Address has already claimed");
  });

  it("Should not allow claiming with invalid proof", async function () {
    const amount = 100;
    const leaf = keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [addr2.address, amount]
      )
    );
    const invalidProof = merkleTree.getProof(leaf);
  
    await expect(merkleAirdrop.connect(addr1).claim(amount, invalidProof))
      .to.be.revertedWith("Invalid merkle proof");
  });

  it("Should allow owner to update merkle root", async function () {
    const newLeaves = [
      [addr1.address, 150],
      [addr2.address, 250]
    ].map(([address, amount]) => 
      ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint256"],
          [address, amount]
        )
      )
    );

    const newMerkleTree = new MerkleTree(newLeaves, keccak256, { sortPairs: true });
    const newMerkleRoot = newMerkleTree.getHexRoot();

    await expect(merkleAirdrop.updateMerkleRoot(newMerkleRoot))
      .to.emit(merkleAirdrop, "MerkleRootUpdated")
      .withArgs(newMerkleRoot);

    expect(await merkleAirdrop.merkleRoot()).to.equal(newMerkleRoot);
  });

  it("Should allow owner to withdraw remaining tokens", async function () {
    const initialBalance = await donGuilloToken.balanceOf(await owner.getAddress());
    const contractBalance = await donGuilloToken.balanceOf(await merkleAirdrop.getAddress());

    await merkleAirdrop.withdrawRemainingTokens(await owner.getAddress());

    const finalBalance = await donGuilloToken.balanceOf(await owner.getAddress());

    expect(BigInt(finalBalance) - BigInt(initialBalance)).to.equal(BigInt(contractBalance));
  });

  it("Should not allow non-owner to withdraw tokens", async function () {
    await expect(merkleAirdrop.connect(addr1).withdrawRemainingTokens(addr1.address))
      .to.be.revertedWithCustomError(merkleAirdrop, "OwnableUnauthorizedAccount");
  });
});