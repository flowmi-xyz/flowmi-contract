# Flowmi SmartContract

*This repo has been updated to work with Mumbai - Polygon.*

- [Getting Started](#getting-started)
  - [Requirements](#requirements)
  - [Quickstart](#quickstart)
  - [Typescript](#typescript)
- [Usage](#usage)
  - [Testing](#testing)
    - [Test Coverage](#test-coverage)
- [Deployment to a testnet or mainnet](#deployment-to-a-testnet-or-mainnet)
    - [Estimate gas cost in USD](#estimate-gas-cost-in-usd)
  - [Verify on etherscan](#verify-on-etherscan)
- [Testing live Mumbai Testnet](#texting-mumbai)
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

- [polygonscan](https://mumbai.polygonscan.com/address/0x6cbA63391849C41FD84c20D08417de07426fE679#writeContract)
  - Visit the live testnet contract

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
yarn add --dev @nomiclabs/hardhat-ethers@npm:hardhat-deploy-ethers ethers @nomiclabs/hardhat-etherscan @nomiclabs/hardhat-waffle chai ethereum-waffle hardhat hardhat-contract-sizer hardhat-deploy hardhat-deploy-ethers hardhat-gas-reporter prettier prettier-plugin-solidity solhint solidity-coverage dotenv @nomicfoundation/hardhat-toolbox @chainlink/contracts@0.4.1
```

Deploy:

```
yarn hardhat deploy
```

## Testing

```
yarn hardhat test
```

### Test Coverage

```
yarn hardhat coverage
```



# Deployment to a testnet or mainnet

1. Setup environment variabltes

You'll want to set your `MUMBAI_RPC_URL` and `PRIVATE_KEY` as environment variables. You can add them to a `.env` file.

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


# Testing live Mumbai Testnet
- [polygonscan](https://mumbai.polygonscan.com/address/0x6cbA63391849C41FD84c20D08417de07426fE679#writeContract)
  - Visit the live testnet contract


Funds in each user.
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
Number of Flowmi Followers of account.
    /** @notice Gets the number of followers a profile has
     * @param _profileid is the profile
     * @return s_profileToFollowersCount of the profile
     */
```
    function getNumberOffollowers(address _profileid)
        public
        view
        returns (uint256)
    {
        return s_profileToFollowersCount[_profileid];
    }
```
Funds to-raffle (amount of funds able to be raffled).
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
Flowmi Follow: a user calls this function with the address of the profile id to follow. If the goal is reached, a raffle is summoned. 
    /** @notice Gets the amount that an address has funded
     * Funds our contract based on the MATIC/USD price
     * Any account can call this function to flowmi follow a registered flowmi account
     *  @param _profileid is the address of the registered account
     *   Iniciates the request for a random word to the VRF
     */

```
function flowmiFollow(address _profileid) public payable {
...
}
```



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
