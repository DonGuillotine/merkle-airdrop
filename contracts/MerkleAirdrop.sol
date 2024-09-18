// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MerkleAirdrop is ReentrancyGuard, Ownable {
    IERC20 public token;
    IERC721 public baycNFT;
    bytes32 public merkleRoot;
    mapping(address => bool) public hasClaimed;

    event TokensClaimed(address indexed account, uint256 amount);
    event MerkleRootUpdated(bytes32 newMerkleRoot);

    constructor(address _token, address _baycNFT, bytes32 _merkleRoot) Ownable(msg.sender) {
        token = IERC20(_token);
        baycNFT = IERC721(_baycNFT);
        merkleRoot = _merkleRoot;
    }

    function claim(uint256 amount, bytes32[] calldata merkleProof) external nonReentrant {
        require(!hasClaimed[msg.sender], "Address has already claimed");
        require(baycNFT.balanceOf(msg.sender) > 0, "Must own a BAYC NFT to claim");

        bytes32 node = keccak256(abi.encodePacked(msg.sender, amount));
        require(MerkleProof.verify(merkleProof, merkleRoot, node), "Invalid merkle proof");

        hasClaimed[msg.sender] = true;
        require(token.transfer(msg.sender, amount), "Token transfer failed");

        emit TokensClaimed(msg.sender, amount);
    }

    function updateMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
        emit MerkleRootUpdated(_merkleRoot);
    }

    function withdrawRemainingTokens(address to) external onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        require(token.transfer(to, balance), "Token transfer failed");
    }
}