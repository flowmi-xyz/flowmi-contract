const { network, ethers } = require("hardhat");
const {
  networkConfig,
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify.js");
require("dotenv").config();

const FUND_AMOUNT = ethers.utils.parseEther("10"); // 1 Ether, or 1e18 (10^18) Wei

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  let vrfCoordinatorV2Address,
    subscriptionId,
    vrfCoordinatorV2Mock,
    aavePoolMainnet,
    maticUsdPriceFeedAddress;

  if (chainId == 31337) {
    // create VRFV2 Subscription
    vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
    const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
    const transactionReceipt = await transactionResponse.wait();
    subscriptionId = transactionReceipt.events[0].args.subId;
    // Fund the subscription
    // Our mock makes it so we don't actually have to worry about sending fund
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT);

    // create Datafeed subscription
    const maticUsdAggregator = await deployments.get("MockV3Aggregator");
    maticUsdPriceFeedAddress = maticUsdAggregator.address;
    aavePoolMainnet = networkConfig[chainId]["aave"];
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[chainId]["subscriptionId"];
    maticUsdPriceFeedAddress = networkConfig[chainId]["maticUsdPriceFeed"];
    aavePoolMainnet = networkConfig[chainId]["aave"];
  }
  const waitBlockConfirmations = developmentChains.includes(network.name)
    ? 1
    : VERIFICATION_BLOCK_CONFIRMATIONS;

  log("----------------------------------------------------");
  log("Deploying FlowMi and waiting for confirmations...");
  const arguments_flowmi = [
    maticUsdPriceFeedAddress,
    vrfCoordinatorV2Address,
    subscriptionId,
    networkConfig[chainId]["gasLane"],
    networkConfig[chainId]["callbackGasLimit"],
    aavePoolMainnet,
  ];
  const flowMi = await deploy("FlowMi", {
    from: deployer,
    args: arguments_flowmi,
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: network.config.blockConfirmations || 1,
  });
  log(`FlowMi deployed at ${flowMi.address}`);

  // Verify the deployment
  if (
    !developmentChains.includes(network.name) &&
    process.env.POLYGONSCAN_API_KEY
  ) {
    log("Verifying...");
    await verify(flowMi.address, arguments_flowmi);
  }

  log("Enter lottery with command:");
  const networkName = network.name == "hardhat" ? "localhost" : network.name;
  log(`yarn hardhat run scripts/enterRaffle.js --network ${networkName}`);
  log("----------------------------------------------------");
};

module.exports.tags = ["all", "flowmi"];
