# Flowmi SmartContract

*This repo has been updated to work with Mumbai - Polygon.*

## **What is Flowmi?**
Flowmi is a 🌿[Lens-protocol](https://docs.lens.xyz/docs/what-is-lens) follow module, wich is like following someone in a descentralized social network, but in a cooler way.

What is special about Flowmi is that by following a profile with the FlowmiModule, you enter a raffle asociated to that profile! 🎲

Flowmi will ask you for a $1 dolar contribution to the pool, and when a number of followers are gathered the raffle is activated and one of
the followers gets the prize!🏅🏅🏅

But not only that! while the fees are in the contract, they earn interest by depositing the tokens in a liquidity pool provided by the 👻 [Aave](https://aave.com/) protocol, and if you win the Flowmi Raffle, you get a prize in [Aave Wraped Matic Token](https://mumbai.polygonscan.com/token/0x89a6ae840b3f8f489418933a220315eea36d11ff?a=0xe19c50623289a8eb24b6d9d99f9baf6c087ae287), which you can redeem for Matics anytime you want! it will earn intereset while you don't redeem it!! 😎.

Add this address to your wallet to see your aWMatics! 
```
0x89a6AE840b3F8f489418933A220315eeA36d11fF
```

To be able to perform this task, Flowmi uses two Chainlink technologies, the 🐸["Datafeed"](https://chain.link/data-feeds) to calculate how many Matics are equal to the $1 dolar fee by the time you use the FlowmiModule, and the 🐸["VRF"](https://blog.chain.link/verifiable-random-function-vrf/) to calculate verifiable random numbers for the raffle. 

Have fun!🥳

- [Getting Started](#getting-started)
  - [Requirements](#requirements)
  - [Quickstart](#quickstart)
  - [Typescript](#typescript)
- [Usage](#usage)
  - [Testing](#testing)
  - [Functions](#functions)
  - [Diagrams](#diagrams)
- [Deployment to a testnet or mainnet](#deployment-to-a-testnet-or-mainnet)
    - [Estimate gas cost in USD](#estimate-gas-cost-in-usd)
  - [Verify on etherscan](#verify-on-etherscan)
- [Testing live Mumbai Testnet](#testing-mumbai)
- [Thank you!](#thank-you)


# Getting Started
## Requirements

- [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
  - You'll know you did it right if you can run `git --version` and you see a response like `git version x.x.x`
- [Nodejs](https://nodejs.org/en/)
  - You'll know you've installed nodejs right if you can run:
    - `node --version` and get an ouput like: `vx.x.x`
- [Yarn](https://yarnpkg.com/getting-started/install) instead of `npm`
  - You'll know you've installed yarn right if you can run:
    - `yarn --version` and get an output like: `x.x.x`
    - You might need to [install it with `npm`](https://classic.yarnpkg.com/lang/en/docs/install/) or `corepack`

## Quickstart

- Visit live in mumbai testnet: [polygonscan](https://mumbai.polygonscan.com/address/0xff13475aaA3025819054a2094C339e337E4BfF76#code)

- To try it, start by clonning this repo:

```
git clone git@github.com:flowmi-xyz/flowmi-contract.git
cd flowmi
yarn
```

## Typescript

If you want to get to typescript and you cloned the javascript version, just run:

```
git checkout typescript
yarn 
```

# Usage

Dependencies:

```
yarn add --dev @nomiclabs/hardhat-ethers@npm:hardhat-deploy-ethers ethers @nomiclabs/hardhat-etherscan @nomiclabs/hardhat-waffle chai ethereum-waffle hardhat hardhat-contract-sizer hardhat-deploy hardhat-deploy-ethers hardhat-gas-reporter prettier prettier-plugin-solidity solhint solidity-coverage dotenv @nomicfoundation/hardhat-toolbox @chainlink/contracts@0.4.1 @aave/core-v3 @aave/periphery-v3
```

Deploy:

```
yarn hardhat deploy
```

## Testing

If you want to test the module, you can follow the [lens-protocol guide](https://docs.lens.xyz/docs/testing-a-module)

### AAVE testing

The script aaveFlowmiFollow.js is performed in a local forked polygon mainnet.
It tests the 2 ways to deposit and withdraw tokens from a Matic Aave Liquidity Pool.
These 2 ways are:
  1. Wrapping, deposit, withdraw, unwrap.
  2. deposit through Gateway, withdraw through Gateway.
  
In the second option it's not necesary to wrap and unwrap cause the WETHGateway takes care of that.
So the steps tested are:

1. Deposit 1 Matic in the Gateway: It's supposed to wrap and deposit matics for you.
It actually only wraps in this setup.
2. Wrap: deposit another Matic in the WMatic contract to swap Matics for WMatics
3. Deposit in the pool: You deposit both the gateway and the wrapped token to the
aave liquidity pool. You get aTokens in return. 
4. Withdraw from the pool: You should get 1 WMatic.
5. Unwrap tokens withdrawn: You should have now 0 WMatics.
6. Withdraw through the Gateway: It should withdraw the last WMatic and unwrap it
It doesn't work by the date this code was written (nov-10-2022)

```
yarn hardhat run scripts/aaveFlowmiFollow.js
```

### Test Coverage

```
yarn hardhat coverage
```

## Functions

**Flowmi Fee:**

    /** @notice Get the flowmi follow cost
     * @return i_flowmiCost cost in dolars
     */
```
    function getFlowmiCost() public pure returns (uint256) {
        return i_flowmiCost;
    }
```

**Flowmi PriceFeed:**

    /** @notice Gets the conversion in matic for 1 usd 
     * @return i_flowmiCost.getConversionRate(i_priceFeed)
     */
```
    function getPriceFeed() public view returns (uint256) {
        return i_flowmiCost.getConversionRate(i_priceFeed);
    }
```

**Funds in each user:**

    /** @notice Gets total funds a profile has been given
     * @param _profileid is the profile requested
     * @return s_profileToFunds[_profileid], total amount of funds related to the profile
     */
```
function getTotalFundedProfile(address _profileid)
        public
        view
        returns (uint256)
    {
        return s_profileToFunds[_profileid];
    }
```

**Number of Flowmi Followers of account:**

    /** @notice Gets the number of followers a profile has
     * @param _profileid is the profile
     * @return s_profileToFollowersCount of the profile
     */
```
    function getNumberOfFollowers(address _profileid)
        public
        view
        returns (uint256)
    {
        return s_profileToFollowersCount[_profileid];
    }
```

**Funds to-raffle (amount of funds able to be raffled):**

    /** @notice Gets funds a profile has to give in the next raffle
     * @param _profileid is the profile requested
     * @return s_profileToFunds[_profileid] % i_goal, total amount of funds related to the profile
     * "modulo" the goal of the raffle, so it only counts what's haven't been raffled yet
     */
```
 function getFundsToRaffle(address _profileid)
        public
        view
        returns (uint256)
    {
        return s_profileToFunds[_profileid] % i_goal;
    }
```

**Follower by index**

    /** @notice Gets the address of a follower by index of flowmi follow
     * @param _profileid is the profile requested
     * @param _index is the index given to the follower when started flowmi following
     * @return s_profileToFollowersCount in the profileid location
     */
```
    function getFollowerOfIndex(address _profileid, uint256 _index) public view returns (address) {
        return s_profileToFollowers[_profileid][_index];
    }
```

**How many times a profile has won a flowmiRaffle**
    
    /** @notice Gets total wins a profile has
     * @param _profileid is the profile requested
     * @return s_profileToWins[_profileid], total amount of raffles won
     */
```
    function getProfileToWins(address _profileid) public view returns (uint256) {
        return s_profileToWins[_profileid];
    }

```

**How many raffles my profile has given**

    /** @notice Gets total raffles a profile has made
     * @param _profileid is the profile requested
     * @return s_profileToRaffles[_profileid], total amount of raffles delivered
     */
```
    function getProfileToRaffles(address _profileid) public view returns (uint256) {
        return s_profileToRaffles[_profileid];
    }
```

**The address of the last winner given a profieid**

    /** @notice Gets the latest winner address
     * @param _profileid is the profile requested
     * @return s_recentWinner address of the last winner
     */
```
    function getLastWinnerAddress(address _profileid) public view returns (address) {
        return s_profileToLastWinnerAddress[_profileid];
    }
```

**The prize in WMatics of the last winner given a profieid**


    /** @notice Gets the latest winner prize given a profileid address
     * @param _profileid is the profile requested
     * @return s_recentWinner address of the last winner
     */
```
    function getLastWinnerPrize(address _profileid) public view returns (uint256) {
        return s_profileToLastWinnerPrize[_profileid];
    }
```

**Redeem ATokens**


    /** @notice Interacts with the AAVE pool to redeem aTokens for WMatics for the user
     * @param _amount is the amount of aTokens to redeem
     */
```
  function redeemAToken(uint256 _amount) public {
 
    }
```

## Diagrams

**- Ecosystem Integrations**

![dapp_env](flowmi_dapp2.png)

**- Follow**

![follow](flowmi_follow.png)

**- Initialize**

![Initialize](Initialize.png)
 
**- Redeem AToken**

![reddemATokens](redeemAToken.png)


# Deployment to a testnet or mainnet

1. Setup environment variabltes

You'll want to set for testing in a local fokr your `MAINNET_RPC_URL`, the url and api key can be provided by [Quicknode](https://www.quicknode.com/endpoints). Also your `MUMBAI_RPC_URL` for deploying in testnet and a `PRIVATE_KEY` as environment variables. You can add them to a `.env` file.

- `PRIVATE_KEY`: The private key of your account (like from [metamask](https://metamask.io/)). **NOTE:** FOR DEVELOPMENT, PLEASE USE A KEY THAT DOESN'T HAVE ANY REAL FUNDS ASSOCIATED WITH IT.
  - You can [learn how to export it here](https://metamask.zendesk.com/hc/en-us/articles/360015289632-How-to-Export-an-Account-Private-Key).
- `MUMBAI_RPC_URL`: This is url of the mumbai testnet node you're working with. 

2. Get testnet ETH and MATIC

Head over to [faucets.chain.link](https://faucets.chain.link/) and get some tesnet ETH & LINK, also to (https://mumbaifaucet.com/) and get testnet MATIC. You should see the ETH and LINK show up in your metamask. [You can read more on setting up your wallet with LINK.](https://docs.chain.link/docs/deploy-your-first-contract/#install-and-fund-your-metamask-wallet)

3. Setup a Chainlink VRF Subscription ID

Head over to [vrf.chain.link](https://vrf.chain.link/) and setup a new subscription, and get a subscriptionId. You can reuse an old subscription if you already have one. 

[You can follow the instructions](https://docs.chain.link/docs/get-a-random-number/) if you get lost. You should leave this step with:

1. A subscription ID
2. Your subscription should be funded with LINK

3. Deploy

In your `helper-hardhat-config.js` add your `subscriptionId` under the section of the chainId you're using (aka, if you're deploying to goerli, add your `subscriptionId` in the `subscriptionId` field under the `4` section.)

Then run:
```
yarn hardhat deploy --network mumbai
```

And copy / remember the contract address. 

4. Add your contract address as a Chainlink VRF Consumer

Go back to [vrf.chain.link](https://vrf.chain.link) and under your subscription add `Add consumer` and add your contract address. You should also fund the contract with a minimum of 1 LINK. 


# Testing live Mumbai Testnet (#testing-mumbai)
- [Polygonscan](https://mumbai.polygonscan.com/address/0x6cbA63391849C41FD84c20D08417de07426fE679#writeContract)
  - Visit the live testnet contract


### Estimate gas cost in USD

To get a USD estimation of gas cost, you'll need a `COINMARKETCAP_API_KEY` environment variable. You can get one for free from [CoinMarketCap](https://pro.coinmarketcap.com/signup). 

Then, uncomment the line `coinmarketcap: COINMARKETCAP_API_KEY,` in `hardhat.config.js` to get the USD estimation. Just note, everytime you run your tests it will use an API call, so it might make sense to have using coinmarketcap disabled until you need it. You can disable it by just commenting the line back out. 



## Verify on etherscan

If you deploy to a testnet or mainnet, you can verify it if you get an [API Key](https://etherscan.io/myapikey) from Etherscan and set it as an environemnt variable named `ETHERSCAN_API_KEY`. You can pop it into your `.env` file as seen in the `.env.example`.

In it's current state, if you have your api key set, it will auto verify goerli contracts!



# Thank you!

If you appreciated this, feel free to follow me! or donate!

ETH/Polygon/Avalanche/etc Address: 0xD5D8681f034e5C1C16303BA5B94Cc88EC14aFe51

[![Daniel Beltrán Twitter](https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white)](https://twitter.com/bvdani_el)
[![Daniel Beltrán Linkedin](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/danielbeltranv/)
