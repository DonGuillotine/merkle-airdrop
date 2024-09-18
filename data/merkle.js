const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const csv = require('csv-parser');
const fs = require('fs');

function generateMerkleRoot() {
  return new Promise((resolve, reject) => {
    const leaves = [];
    fs.createReadStream('merged_bayc_and_mockaroo.csv')
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

generateMerkleRoot()
  .then((root) => {
    console.log('Merkle Root:', root);
  })
  .catch((error) => {
    console.error('Error generating Merkle root:', error);
  });