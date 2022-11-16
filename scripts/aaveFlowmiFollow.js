/*
Aave test:
This test isperformed in a local forked polygon mainnet.
It uses the 2 ways to deposit and withdraw tokens from a Matic Aave Liquidity Pool.

1. Deposit in the Gateway: It's supposed to wrap and deposit matics for you.
It actually only wraps in this test.
2. Wrap: deposit in the WMatic contract to swap matics for wmatics
3. Deposit in the pool: You deposit both the gateway and the wrap token to the
aave liquidity pool. You get aTokens in return.
4. Withdraw from the pool: You should get 1 WMatic.
5. Unwrap tokens from (4): You should have now 0 WMatics.
6. Withdraw from the Gateway: It should withdraw the last wmatic and unwrap it
It doesn't work by the date this code was written (nov-10-2022)
*/

const { ethers, getNamedAccounts, network } = require('hardhat');
const { networkConfig } = require('../helper-hardhat-config');
const { BigNumber } = require('ethers');
const { assert, expect } = require('chai');

async function main() {
  const { deployer } = await getNamedAccounts();
  const wmaticTokenAddress = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'; // wrapped mainnet
  const awmaticTokenAddress = '0x6d80113e533a2C0fe82EaBD35f1875DcEA89Ea97'; // awrapped mainnet
  const maticTokenAddress = '0x0000000000000000000000000000000000001010'; // mainnet

  // Interfaz para balances de Matic
  const imatic = await ethers.getContractAt(
    '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
    maticTokenAddress, //MATIC mainnet polygon
    deployer
  );

  // Interfaz para balances de WMatic
  const iWmatic = await ethers.getContractAt(
    'IWeth',
    wmaticTokenAddress, //WMATIC mainnet polygon
    deployer
  );

  // Interfaz para balances de aWMatic (o APolWMatic)
  const iaWmatic = await ethers.getContractAt(
    'IAToken',
    awmaticTokenAddress, //aWMATIC mainnet polygon
    deployer
  );

  // Interfaz para depositar matic directamente a la pool, sin wrapear antes, en este fork funciona como wrapeador
  const iWETHGateway = await ethers.getContractAt('IWETHGateway', wmaticTokenAddress, deployer);

  const AMOUNT = ethers.utils.parseEther('0.1');
  const dAMOUNT = ethers.utils.parseEther('0.2');

  const Pool = await getMyPool(deployer);
  console.log('--------------------------------------------------------');
  console.log('Before Gateway');
  let maticBalance = await imatic.balanceOf(deployer);
  console.log(`Got ${maticBalance.toString()} MATIC before GW`);
  let wmaticBalance = await iWmatic.balanceOf(deployer);
  console.log(`Got ${wmaticBalance.toString()} wMATIC before GW, should be 0`);
  let awmaticBalance = await iaWmatic.balanceOf(deployer);
  console.log(`Got ${awmaticBalance.toString()} awMATIC before GW, should be 0`);

  // Gateway
  let txResponse = await iWETHGateway.depositETH(Pool.address, deployer, 0, {
    value: AMOUNT,
  });
  await txResponse.wait(1);

  console.log('--------------------------------------------------------');
  console.log('After Gateway');

  // Before wrap
  maticBalance = await imatic.balanceOf(deployer);
  console.log(`Got ${maticBalance.toString()} MATIC after GW`);
  wmaticBalance = await iWmatic.balanceOf(deployer);
  console.log(`Got ${wmaticBalance.toString()} wMATIC after GW, should de 1`);
  awmaticBalance = await iaWmatic.balanceOf(deployer);
  console.log(`Got ${awmaticBalance.toString()} awMATIC after GW, should de 0`);

  assert.equal(BigNumber.from(wmaticBalance).toString(), BigNumber.from(AMOUNT).toString());
  assert.equal(awmaticBalance.toString(), '0');

  // Wrap
  txResponse = await iWmatic.deposit({ value: AMOUNT });
  await txResponse.wait(1);

  console.log('--------------------------------------------------------');
  console.log('After Wrapping');

  maticBalance = await imatic.balanceOf(deployer);
  console.log(`Got ${maticBalance.toString()} MATIC after wrap`);
  wmaticBalance = await iWmatic.balanceOf(deployer);
  console.log(`Got ${wmaticBalance.toString()} wMATIC after wrap, should be 2`);
  awmaticBalance = await iaWmatic.balanceOf(deployer);
  console.log(`Got ${awmaticBalance.toString()} awMATIC after wrap, should be 0`);

  assert.equal(BigNumber.from(wmaticBalance).toString(), BigNumber.from(dAMOUNT).toString());
  assert.equal(awmaticBalance.toString(), '0');

  // Deposito a la Pool

  await approveErc20(wmaticTokenAddress, Pool.address, dAMOUNT, deployer);
  console.log('Depositing...');
  console.log('Address provided: ', Pool.address);
  await Pool.supply(wmaticTokenAddress, dAMOUNT, deployer, 0);
  console.log('Deposited!');

  console.log('--------------------------------------------------------');
  console.log('After Deposit');

  let { totalCollateralETH, availableBorrowsETH } = await getBorrowUserData(Pool, deployer);
  maticBalance = await imatic.balanceOf(deployer);
  console.log(`Got ${maticBalance.toString()} MATIC after deposit`);
  wmaticBalance = await iWmatic.balanceOf(deployer);
  console.log(`Got ${wmaticBalance.toString()} WMATIC after deposit, should be 0`);
  awmaticBalance = await iaWmatic.balanceOf(deployer);
  console.log(`Got ${awmaticBalance.toString()} awMATIC after deposit, should be 2`);

  assert.equal(wmaticBalance, '0');
  assert.equal(BigNumber.from(awmaticBalance).toString(), BigNumber.from(dAMOUNT).toString());
  //wihdraw

  console.log('--------------------------------------------------------');
  console.log('After Withdrawing');

  console.log('Withdrawing 1!');

  txResponse = await Pool.withdraw(wmaticTokenAddress, AMOUNT, deployer);
  txResponse.wait(1);
  let { w_totalCollateralETH, w_availableBorrowsETH } = await getBorrowUserData(Pool, deployer);

  maticBalance = await imatic.balanceOf(deployer);
  console.log(`Got ${maticBalance.toString()} MATIC after withdraw`);
  wmaticBalance = await iWmatic.balanceOf(deployer);
  console.log(`Got ${wmaticBalance.toString()} WMATIC after withdraw, should be 1`);
  awmaticBalance = await iaWmatic.balanceOf(deployer);
  console.log(`Got ${awmaticBalance.toString()} awMATIC after withdraw, shoul be greater than 1`);

  assert.equal(BigNumber.from(wmaticBalance).toString(), AMOUNT);
  //assert.equal(BigNumber.from(awmaticBalance).toString(), BigNumber.from(AMOUNT).toString());

  //UNWRAP;

  console.log('--------------------------------------------------------');
  console.log('After Unwrapping');

  txResponse = await iWmatic.withdraw(AMOUNT);
  await txResponse.wait(1);

  let { uw_totalCollateralETH, uw_availableBorrowsETH } = await getBorrowUserData(Pool, deployer);

  //
  maticBalance = await imatic.balanceOf(deployer);
  console.log(`Got ${maticBalance.toString()} MATIC after withdraw`);
  wmaticBalance = await iWmatic.balanceOf(deployer);
  console.log(`Got ${wmaticBalance.toString()} WMATIC after withdraw, should be 0`);
  awmaticBalance = await iaWmatic.balanceOf(deployer);
  console.log(`Got ${awmaticBalance.toString()} awMATIC after withdraw, should be greater than 1`);

  //assert.equal(BigNumber.from(wmaticBalance).toString(), 1);
  assert.equal(BigNumber.from(wmaticBalance).toString(), BigNumber.from(0).toString());

  console.log('--------------------------------------------------------');
  console.log('Withdraw gateway');

  approveErc20(awmaticTokenAddress, iWETHGateway.address, AMOUNT, deployer); //deployer in deposit
  approveErc20(
    awmaticTokenAddress,
    Pool.address, // pool in deposit
    AMOUNT,
    deployer
  ); //deployer in deposit

  txResponse = await iWETHGateway.withdrawETH(Pool.address, AMOUNT, deployer);

  maticBalance = await imatic.balanceOf(deployer);
  console.log(`Got ${maticBalance.toString()} MATIC after withdraw GW`);
  wmaticBalance = await iWmatic.balanceOf(deployer);
  console.log(`Got ${wmaticBalance.toString()} WMATIC after withdraw GW, should be 0`);
  awmaticBalance = await iaWmatic.balanceOf(deployer);
  console.log(`Got ${awmaticBalance.toString()} awMATIC after withdraw GW, should be really small`);
  await txResponse.wait(1);

  //assert.equal(BigNumber.from(wmaticBalance).toString(), 1);
  assert.equal(BigNumber.from(wmaticBalance).toString(), BigNumber.from(0).toString());
}

async function getBorrowUserData(Pool, account) {
  const { totalCollateralBase, availableBorrowsBase } = await Pool.getUserAccountData(account);
  console.log(`AAVE: You have ${totalCollateralBase} worth of WMATIC deposited.`);
  console.log(`AAVE: You have ${availableBorrowsBase} worth of WMATIC to borrow.`);
  return { totalCollateralBase, availableBorrowsBase };
}

async function getMyPool(account) {
  const PoolAddressesProvider = await ethers.getContractAt(
    'IPoolAddressesProvider',
    '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb', // mainnet pool addresses provider
    //"0x5343b5bA672Ae99d627A1C87866b8E53F47Db2E6", // testnet pool addresses provider
    account
  );
  const PoolAddress = await PoolAddressesProvider.getPool();

  const Pool = await ethers.getContractAt('IPool', PoolAddress, account);
  return Pool;
}

async function approveErc20(
  erc20Address,
  spenderAddress, // pool in deposit
  amountToSpend,
  account //deployer in deposit
) {
  const erc20Token = await ethers.getContractAt(
    '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
    erc20Address,
    account
  );
  const tx = await erc20Token.approve(spenderAddress, amountToSpend);
  await tx.wait(1);
  console.log('Approved!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
