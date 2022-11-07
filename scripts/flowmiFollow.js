const { getNamedAccounts, ethers } = require("hardhat");

async function main() {
  const { deployer } = await getNamedAccounts();
  const wmaticTokenAddress = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"; // wrapped mainnet
  const awmaticTokenAddress = "0x6d80113e533a2C0fe82EaBD35f1875DcEA89Ea97"; // awrapped mainnet
  const maticTokenAddress = "0x0000000000000000000000000000000000001010"; // mainnet

  const imatic = await ethers.getContractAt(
    "IERC20",
    maticTokenAddress, //MATIC mainnet polygon
    deployer
    //  networkConfig[network.config.chainId].wethToken
  );

  const iWMatic = await ethers.getContractAt(
    "IWETH",
    wmaticTokenAddress, //WMATIC mainnet polygon
    deployer
    //  networkConfig[network.config.chainId].wethToken
  );
  const iWmatic = await ethers.getContractAt(
    "IWeth",
    wmaticTokenAddress, //WMATIC mainnet polygon
    deployer
    //  networkConfig[network.config.chainId].wethToken
  );
  const iaWmatic = await ethers.getContractAt(
    "IAToken",
    awmaticTokenAddress, //aWMATIC mainnet polygon
    deployer
    //  networkConfig[network.config.chainId].wethToken
  );

  const iWETHGateway = await ethers.getContractAt(
    "IWETHGateway",
    wmaticTokenAddress,
    deployer
    //  networkConfig[network.config.chainId].wethToken
  );

  /* Before wrap
  let wethBalance = await iWeth.balanceOf(deployer);
  console.log(`Got ${wethBalance.toString()} WETH before wrapping`);
  /*let awethBalance = await iaWeth.balanceOf(deployer);
  console.log(`Got ${awethBalance.toString()} aWETH before wrapping`);
  await getWeth();*/

  // Mainnet pool adready given by the deployment
  // Deposit
  // Aprove to get Matic
  const AMOUNT = ethers.utils.parseEther("10");
  //const wmaticTokenAddress = "0xD65d229951E94a7138F47Bd9e0Faff42A7aCe0c6"; // testnet

  const Pool = await getPool(deployer);
  console.log("--------------------------------------------------------");
  console.log("Before Gateway");
  let maticBalance = await imatic.balanceOf(deployer);
  console.log(`Got ${maticBalance.toString()} MATIC before GW`);
  let wmaticBalance = await iWmatic.balanceOf(deployer);
  console.log(`Got ${wmaticBalance.toString()} wMATIC before GW`);
  let awmaticBalance = await iaWmatic.balanceOf(deployer);
  console.log(`Got ${awmaticBalance.toString()} awMATIC before GW`);

  // Gateway
  let txResponse = await iWETHGateway.depositETH(Pool.address, deployer, 0, {
    value: AMOUNT,
  });
  await txResponse.wait(1);

  console.log("--------------------------------------------------------");
  console.log("After Gateway");

  // Before wrap
  maticBalance = await imatic.balanceOf(deployer);
  console.log(`Got ${maticBalance.toString()} MATIC after GW`);
  wmaticBalance = await iWmatic.balanceOf(deployer);
  console.log(`Got ${wmaticBalance.toString()} wMATIC after GW`);
  awmaticBalance = await iaWmatic.balanceOf(deployer);
  console.log(`Got ${awmaticBalance.toString()} awMATIC after GW`);

  // Wrap
  txResponse = await iWmatic.deposit({ value: AMOUNT });
  await txResponse.wait(1);

  console.log("--------------------------------------------------------");
  console.log("After Wrapping");

  maticBalance = await imatic.balanceOf(deployer);
  console.log(`Got ${maticBalance.toString()} MATIC after wrap`);
  wmaticBalance = await iWmatic.balanceOf(deployer);
  console.log(`Got ${wmaticBalance.toString()} wMATIC after wrap`);
  awmaticBalance = await iaWmatic.balanceOf(deployer);
  console.log(`Got ${awmaticBalance.toString()} awMATIC after wrap`);

  // Deposito a la Pool

  await approveErc20(wmaticTokenAddress, Pool.address, AMOUNT, deployer);
  console.log("Depositing...");
  console.log("Address provided: ", Pool.address);
  await Pool.supply(wmaticTokenAddress, AMOUNT, deployer, 0);
  console.log("Deposited!");

  console.log("--------------------------------------------------------");
  console.log("After Deposit");

  let { totalCollateralETH, availableBorrowsETH } = await getBorrowUserData(
    Pool,
    deployer
  );
  maticBalance = await imatic.balanceOf(deployer);
  console.log(`Got ${maticBalance.toString()} MATIC after deposit`);
  wmaticBalance = await iWmatic.balanceOf(deployer);
  console.log(`Got ${wmaticBalance.toString()} WMATIC after deposit`);
  awmaticBalance = await iaWmatic.balanceOf(deployer);
  console.log(`Got ${awmaticBalance.toString()} awMATIC after deposit`);

  //wihdraw

  console.log("--------------------------------------------------------");
  console.log("After Withdrawing");

  console.log("Withdrawing!");

  txResponse = await Pool.withdraw(wmaticTokenAddress, AMOUNT, deployer);
  txResponse.wait(1);
  let { w_totalCollateralETH, w_availableBorrowsETH } = await getBorrowUserData(
    Pool,
    deployer
  );

  maticBalance = await imatic.balanceOf(deployer);
  console.log(`Got ${maticBalance.toString()} MATIC after withdraw`);
  wmaticBalance = await iWmatic.balanceOf(deployer);
  console.log(`Got ${wmaticBalance.toString()} WMATIC after withdraw`);
  awmaticBalance = await iaWmatic.balanceOf(deployer);
  console.log(`Got ${awmaticBalance.toString()} awMATIC after withdraw`);

  //UNWRAP;

  console.log("--------------------------------------------------------");
  console.log("After Unwrapping");

  txResponse = await iWmatic.withdraw(AMOUNT);
  await txResponse.wait(1);

  let { uw_totalCollateralETH, uw_availableBorrowsETH } =
    await getBorrowUserData(Pool, deployer);

  //
  maticBalance = await imatic.balanceOf(deployer);
  console.log(`Got ${maticBalance.toString()} MATIC after withdraw`);
  wmaticBalance = await iWmatic.balanceOf(deployer);
  console.log(`Got ${wmaticBalance.toString()} WMATIC after withdraw`);
  awmaticBalance = await iaWmatic.balanceOf(deployer);
  console.log(`Got ${awmaticBalance.toString()} awMATIC after withdraw`);

  console.log("--------------------------------------------------------");
  console.log("Withdraw gateway");

  approveErc20(wmaticTokenAddress, iWETHGateway.address, AMOUNT, deployer); //deployer in deposit
  approveErc20(
    wmaticTokenAddress,
    Pool.address, // pool in deposit
    AMOUNT,
    deployer
  ); //deployer in deposit

  txResponse = await iWETHGateway.withdrawETH(Pool.address, AMOUNT, deployer);

  maticBalance = await imatic.balanceOf(deployer);
  console.log(`Got ${maticBalance.toString()} MATIC after withdraw GW`);
  wmaticBalance = await iWmatic.balanceOf(deployer);
  console.log(`Got ${wmaticBalance.toString()} WMATIC after withdraw GW`);
  awmaticBalance = await iaWmatic.balanceOf(deployer);
  console.log(`Got ${awmaticBalance.toString()} awMATIC after withdraw GW`);
  await txResponse.wait(1);
}

async function getBorrowUserData(Pool, account) {
  const { totalCollateralBase, availableBorrowsBase } =
    await Pool.getUserAccountData(account);
  console.log(
    `AAVE: You have ${totalCollateralBase} worth of WMATIC deposited.`
  );
  console.log(
    `AAVE: You have ${availableBorrowsBase} worth of WMATIC to borrow.`
  );
  return { totalCollateralBase, availableBorrowsBase };
}

async function getPool(account) {
  const PoolAddressesProvider = await ethers.getContractAt(
    "IPoolAddressesProvider",
    "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb", // mainnet pool addresses provider
    //"0x5343b5bA672Ae99d627A1C87866b8E53F47Db2E6", // testnet pool addresses provider
    account
  );
  const PoolAddress = await PoolAddressesProvider.getPool();

  const Pool = await ethers.getContractAt("IPool", PoolAddress, account);
  return Pool;
}

async function approveErc20(
  erc20Address,
  spenderAddress, // pool in deposit
  amountToSpend,
  account //deployer in deposit
) {
  const erc20Token = await ethers.getContractAt(
    "IERC20",
    erc20Address,
    account
  );
  const tx = await erc20Token.approve(spenderAddress, amountToSpend);
  await tx.wait(1);
  console.log("Approved!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
