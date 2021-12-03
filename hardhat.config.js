require('@nomiclabs/hardhat-waffle');
require('hardhat-gas-reporter');
require('hardhat-typechain');
// import { task } from 'hardhat/config';

const timeout = 2000000;

module.exports = {
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545',
    },
    hardhat: {
      timeout,
      // See its defaults
    },
  },
  paths: {
    sources: './contracts',
    artifacts: './artifacts',
    cache: './.cache',
  },
  solidity: {
    version: '0.8.10',
    settings: {
      optimizer: {
        enabled: true,
      },
    },
  },
  typechain: {
    outDir: 'src/typechain',
    target: 'ethers-v5',
    runOnCompile: true,
  },
  gasReporter: {
    enabled: true,
  },
  mocha: {
    timeout,
  },
};
