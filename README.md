# Flowmi Smartcontract

*This repo has been updated to work with Mumbai - Polygon.*


- [Hardhat Smartcontract Lottery (Raffle) FCC](#hardhat-smartcontract-lottery-raffle-fcc)
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
    - [Typescript differences](#typescript-differences)
- [Linting](#linting)
- [Thank you!](#thank-you)

This project is apart of the Hardhat FreeCodeCamp video.

Checkout the full blockchain course video [here.](https://www.youtube.com/watch?v=gyMwXuJrbJQ)

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


6. Flowmi!

```

### Estimate gas cost in USD

To get a USD estimation of gas cost, you'll need a `COINMARKETCAP_API_KEY` environment variable. You can get one for free from [CoinMarketCap](https://pro.coinmarketcap.com/signup). 

Then, uncomment the line `coinmarketcap: COINMARKETCAP_API_KEY,` in `hardhat.config.js` to get the USD estimation. Just note, everytime you run your tests it will use an API call, so it might make sense to have using coinmarketcap disabled until you need it. You can disable it by just commenting the line back out. 



## Verify on etherscan

If you deploy to a testnet or mainnet, you can verify it if you get an [API Key](https://etherscan.io/myapikey) from Etherscan and set it as an environemnt variable named `ETHERSCAN_API_KEY`. You can pop it into your `.env` file as seen in the `.env.example`.

In it's current state, if you have your api key set, it will auto verify goerli contracts!

However, you can manual verify with:

```
yarn hardhat verify --constructor-args arguments.js DEPLOYED_CONTRACT_ADDRESS
```

### Typescript differences
1. `.js` files are now `.ts`
2. We added a bunch of typescript and typing packages to our `package.json`. They can be installed with:
   1. `yarn add @typechain/ethers-v5 @typechain/hardhat @types/chai @types/node ts-node typechain typescript`
3. The biggest one being [typechain](https://github.com/dethcrypto/TypeChain)
   1. This gives your contracts static typing, meaning you'll always know exactly what functions a contract can call. 
   2. This gives us `factories` that are specific to the contracts they are factories of. See the tests folder for a version of how this is implemented. 
4. We use `imports` instead of `require`. Confusing to you? [Watch this video](https://www.youtube.com/watch?v=mK54Cn4ceac)
5. Add `tsconfig.json`

# Linting

To check linting / code formatting:
```
yarn lint
```
or, to fix: 
```
yarn lint:fix
```

# Thank you!

If you appreciated this, feel free to follow me! or donate!

ETH/Polygon/Avalanche/etc Address: 0xD5D8681f034e5C1C16303BA5B94Cc88EC14aFe51

[![Daniel Beltrán Twitter](https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white)](https://twitter.com/bvdani_el)
[![Daniel Beltrán Linkedin](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/danielbeltranv/)
