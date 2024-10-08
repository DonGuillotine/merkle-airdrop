const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

function generateMerkleRoot() {
  return new Promise((resolve, reject) => {
    const leaves = [];
    const csvFilePath = path.join(__dirname, 'merged_bayc_and_mockaroo.csv');
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        const address = row.Address;
        const amount = parseInt(row.Amount);
        const leaf = keccak256(Buffer.from(address.toLowerCase() + amount.toString(16).padStart(64, '0'), 'hex'));
        leaves.push(leaf);
      })
      .on('end', () => {
        const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
        const root = merkleTree.getHexRoot();
        resolve(root);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

module.exports = {
  generateMerkleRoot
};
