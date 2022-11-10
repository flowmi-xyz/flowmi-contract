const { network, deployments, ethers, getNamedAccounts } = require('hardhat');
import { LensHub__factory } from '../typechain-types';

const {
  networkConfig,
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
} = require('../helper-hardhat-config');
const { verify } = require('../utils/verify.js');
require('dotenv').config();

const FUND_AMOUNT = ethers.utils.parseEther('10'); // 1 Ether, or 1e18 (10^18) Wei

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const accounts = await ethers.getSigners();

  const { deployer } = await getNamedAccounts();

  const chainId = network.config.chainId;

  let vrfCoordinatorV2Address,
    subscriptionId,
    vrfCoordinatorV2Mock,
    maticUsdPriceFeedAddress,
    hub,
    moduleGlobals,
    awmaticAddress,
    wGatewayAddress;

  if (chainId == 31337) {
    // create VRFV2 Subscription
    vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock');
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
    const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
    const transactionReceipt = await transactionResponse.wait();
    subscriptionId = transactionReceipt.events[0].args.subId;
    // Fund the subscription
    // Our mock makes it so we don't actually have to worry about sending fund
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT);

    // create Datafeed subscription
    const maticUsdAggregator = await deployments.get('MockV3Aggregator');
    maticUsdPriceFeedAddress = maticUsdAggregator.address;
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId]['vrfCoordinatorV2'];
    subscriptionId = networkConfig[chainId]['subscriptionId'];
    maticUsdPriceFeedAddress = networkConfig[chainId]['maticUsdPriceFeed'];
    hub = networkConfig[chainId]['hub'];
    moduleGlobals = networkConfig[chainId]['moduleGlobals'];
    awmaticAddress = networkConfig[chainId]['awmaticAddress'];
    wGatewayAddress = networkConfig[chainId]['wGatewayAddress'];
  }
  const waitBlockConfirmations = developmentChains.includes(network.name)
    ? 1
    : VERIFICATION_BLOCK_CONFIRMATIONS;

  log('----------------------------------------------------');
  log('Deploying FlowMi and waiting for confirmations...');
  const arguments_flowmi = [
    maticUsdPriceFeedAddress,
    vrfCoordinatorV2Address,
    subscriptionId,
    networkConfig[chainId]['gasLane'],
    networkConfig[chainId]['callbackGasLimit'],
    hub,
    moduleGlobals,
    awmaticAddress,
    wGatewayAddress,
  ];
  const flowMi = await deploy('FlowmiFollowModule', {
    from: deployer,
    args: arguments_flowmi,
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: network.config.blockConfirmations || 1,
  });
  log(`FlowmiFollowModule deployed at ${flowMi.address}`);

  // Verify the deployment
  if (!developmentChains.includes(network.name) && process.env.POLYGONSCAN_API_KEY) {
    log('Verifying...');
    await verify(flowMi.address, arguments_flowmi);
  }

  log('Enter lottery with command:');
  const networkName = network.name == 'hardhat' ? 'localhost' : network.name;
  log(`yarn hardhat run scripts/enterRaffle.js --network ${networkName}`);
  log('----------------------------------------------------');
};

module.exports.tags = ['all', 'flowmi'];
