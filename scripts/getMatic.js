const { ethers, getNamedAccounts, network } = require("hardhat");
const { networkConfig } = require("../helper-hardhat-config");

const AMOUNT = ethers.utils.parseEther("1");

// 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270 // wrapped matic mainnet

async function getWeth() {
  const { deployer } = await getNamedAccounts();
  const iWeth = await ethers.getContractAt(
    "IWeth",
    "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270", // wrapped matic in polygon
    deployer
    //  networkConfig[network.config.chainId].wethToken
  );
  const txResponse = await iWeth.deposit({
    value: AMOUNT,
  });
  await txResponse.wait(1);
  const wethBalance = await iWeth.balanceOf(deployer);
  console.log(`Got ${wethBalance.toString()} WETH`);
}

module.exports = { getWeth, AMOUNT };
