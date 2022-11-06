const { ethers } = require("hardhat");

const networkConfig = {
  default: {
    name: "hardhat",
  },
  31337: {
    name: "localhost",
    subscriptionId: "588",
    gasLane:
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", // 30 gwei
    callbackGasLimit: "2500000", // 500,000 gas
    aave: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb", // Aave polygon mainnet pool addresses provider
    // aave: "0x6C9fB0D5bD9429eb9Cd96B85B81d872281771E6B", // polygon testnet pool addresses provider
  },
  1: {
    name: "mainnet",
  },
  80001: {
    name: "mumbai",
    subscriptionId: "2313",
    gasLane:
      "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f", // 500 gwei Key Hash
    maticUsdPriceFeed: "0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada",
    callbackGasLimit: "2500000", // 500,000 gas
    vrfCoordinatorV2: "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed",
    //  aave: "0x5343b5bA672Ae99d627A1C87866b8E53F47Db2E6", // Pool admin
    aave: "0x5343b5bA672Ae99d627A1C87866b8E53F47Db2E6", // polygon testnet pool
  },
  137: {
    name: "polygon",
    subscriptionId: "tengo que crearla aún",
    gasLane:
      "0x6e099d640cde6de9d40ac749b4b594126b0169747122711109c9985d47751f93", // 200 gwei Key Hash
    maticUsdPriceFeed: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0",
    callbackGasLimit: "500000", // 500,000 gas
    vrfCoordinatorV2: "0xAE975071Be8F8eE67addBC1A82488F1C24858067",
    aave: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb", // Aave polygon mainnet pool
  },
};

const developmentChains = ["hardhat", "localhost"];
const VERIFICATION_BLOCK_CONFIRMATIONS = 6;
const frontEndContractsFile =
  "../nextjs-smartcontract-lottery-fcc/constants/contractAddresses.json";
const frontEndAbiFile =
  "../nextjs-smartcontract-lottery-fcc/constants/abi.json";

module.exports = {
  networkConfig,
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
  frontEndContractsFile,
  frontEndAbiFile,
};
