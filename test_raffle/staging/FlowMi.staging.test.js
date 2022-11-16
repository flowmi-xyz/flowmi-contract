const { assert, expect } = require("chai")
const { getNamedAccounts, ethers, network, hre } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Flowmi Unit Tests", function () {
          let raffleContract, flowmiContract, follower, profileid, deployer, accounts // , deployer
          raffleEntranceFee = 1 * 10 ** 18

          beforeEach(async () => {
              accounts = await ethers.getSigners() // could also do with getNamedAccounts
              deployer = (await getNamedAccounts()).deployer
              follower = accounts[1]
              profileid = accounts[2]
              notflowmi = accounts[3]
              follower2 = accounts[4]
              follower3 = accounts[5]
              //console.log("Address follower: ", follower.address)

              raffleContract = await ethers.getContract("FlowmiRaffle", deployer) // Returns a new connection to the Raffle contract
              flowmiContract = await ethers.getContract("FlowMi", deployer) // Returns a new connection to the Raffle contract
          })

          describe("enterFlowmi", function () {
              //este va para enterflowmi

              it("reverts when you don't pay enough", async () => {
                  await expect(
                      flowmiContract.connect(follower).enterFlowmi(profileid.address)
                  ).to.be.revertedWith("Flowmi__SendMoreToEnterFlowmiRaffle")
              })

              it("After following, the profileid mapping of followers is updated", async () => {
                  // registro un perfil como P2
                  await flowmiContract.connect(profileid).registerProfile()

                  let transaction = (
                      await flowmiContract.connect(follower).isRegisteredProfile(profileid.address)
                  ).toString()
                  // Compruebo registro un perfil como P2
                  assert.equal(transaction.toString(), true.toString())

                  // Compruebo qu tengo 0 seguidores
                  transaction = (
                      await flowmiContract.connect(follower).getNumberOffollowers(profileid.address)
                  ).toString()

                  assert.equal(transaction.toString(), "0")
                  console.log("llego aqui")
                  // Me sigue un follower
                  await flowmiContract
                      .connect(follower)
                      .enterFlowmi(profileid.address, { value: 1000000000000000 })
                  transaction = (
                      await flowmiContract.connect(follower).getNumberOffollowers(profileid.address)
                  ).toString()
                  // Compruebo que me sigue un follower
                  assert.equal(transaction.toString(), "1")
              })
              it("3 followers and raffle is activated", async () => {
                  // registro un perfil como P2, y lo sigo con 3 cuentas
                  await flowmiContract.connect(profileid).registerProfile()
                  // Compruebo qu tengo 0 seguidores
                  // Me sigue 2 flowmifollowers
                  await flowmiContract
                      .connect(follower)
                      .enterFlowmi(profileid.address, { value: 1000000000000000 })
                  transaction = (
                      await flowmiContract.connect(follower).getNumberOffollowers(profileid.address)
                  ).toString()
                  assert.equal(transaction, 1)

                  await flowmiContract
                      .connect(follower2)
                      .enterFlowmi(profileid.address, { value: 1000000000000000 })
                  transaction = (
                      await flowmiContract.connect(follower).getNumberOffollowers(profileid.address)
                  ).toString()
                  assert.equal(transaction, 2)

                  // Compruebo que tengo 2 coins para rafflear
                  transaction = (
                      await flowmiContract.connect(deployer).getFundsToRaffle(profileid.address)
                  ).toNumber()
                  assert.equal(transaction, 2)
                  console.log(
                      "Fondos que el profileid tiene para sortear antes de la lotería",
                      transaction
                  )

                  //Compruebo que el balance del contrato tiene los fondos de la lotería
                  transaction = (await flowmiContract.connect(deployer).getBalance()).toNumber()
                  console.log("Fondos en FlowMi antes de la lotería", transaction)

                  // Compruebo fondos de todos los participantes antes de la lotería
                  transaction = (
                      await flowmiContract
                          .connect(deployer)
                          .getFollowerOfIndex(profileid.address, 0)
                  ).toString()
                  console.log("Address del flowmiFollower [0]: ", transaction)
                  let transactionf1_1 = await (
                      await ethers.provider.getBalance(follower.address)
                  ).toString()
                  console.log("Fondos del flowmiFollower [0]: ", transactionf1_1)
                  transaction = (
                      await flowmiContract
                          .connect(deployer)
                          .getFollowerOfIndex(profileid.address, 1)
                  ).toString()
                  console.log("Address del flowmiFollower [1]: ", transaction)
                  let transactionf2_1 = (
                      await ethers.provider.getBalance(follower2.address)
                  ).toString()
                  console.log("Fondos del flowmiFollower [1]: ", transactionf2_1)
                  transaction = (
                      await flowmiContract
                          .connect(deployer)
                          .getFollowerOfIndex(profileid.address, 2)
                  ).toString()
                  console.log(
                      "Address del flowmiFollower [2]: (nada, aun no hace follow) ",
                      transaction
                  )
                  let transactionf3_1 = (
                      await ethers.provider.getBalance(follower3.address)
                  ).toString()
                  console.log("Fondos del flowmiFollower [2]: ", transactionf3_1)

                  console.log("Address del profileid: ", profileid.address)
                  let transactionpid_1 = (
                      await ethers.provider.getBalance(profileid.address)
                  ).toString()
                  console.log("Fondos del profileid: ", transactionpid_1)

                  // Me sigue el 3er follower y se activa el flowmiRaffle
                  await flowmiContract
                      .connect(follower3)
                      .enterFlowmi(profileid.address, { value: 1000000000000000 })
                  transaction = (
                      await flowmiContract.connect(follower).getNumberOffollowers(profileid.address)
                  ).toString()
                  // Compruebo que me siguen 3 follower
                  assert.equal(transaction.toString(), "3")

                  // Compruebo que tengo un index ganador fake desde flowmiRaffle
                  transaction = (await flowmiContract.connect(deployer).getFakeWinner()).toNumber()
                  assert(transaction != null)
                  console.log("Index del fake ganador: ", transaction)

                  // Compruebo que req
                  transaction = (await raffleContract.connect(deployer).getReq()).toNumber()
                  assert(transaction != null)
                  console.log("Req :", transaction)
                  // Compruebo que reqId
                  transaction = (await raffleContract.connect(deployer).getReqId()).toNumber()
                  assert(transaction != null)
                  console.log("ReqId :", transaction)

                  // Mock de fulfill
                  transaction = await vrfCoordinatorV2Mock.fulfillRandomWords(
                      1,
                      raffleContract.address
                  )
                  assert(transaction != null)
                  console.log("Mockfulfill :", transaction)

                  // Compruebo que ful
                  transaction = (await raffleContract.connect(deployer).getFul()).toNumber()
                  assert(transaction != null)
                  console.log("Ful :", transaction)

                  // Compruebo que tengo un index ganador real desde flowmiRaffle
                  transaction = (
                      await raffleContract.connect(deployer).getRecentWinner()
                  ).toString()
                  assert(transaction != null)
                  console.log("Index del ganador según raffle: ", transaction)

                  // Compruebo cuantos fondos han llegado a este perfil
                  transaction = (
                      await flowmiContract
                          .connect(deployer)
                          .getTotalFundedProfile(profileid.address)
                  ).toNumber()
                  assert(transaction == 3000000000000000)
                  console.log("Al profile le han depositado en total: ", transaction)

                  // Compruebo que al perfil no le queden tokens luego del raffle
                  transaction = (
                      await flowmiContract.connect(deployer).getFundsToRaffle(profileid.address)
                  ).toNumber()
                  assert(transaction == 0)
                  console.log("Fondos para sortear luego de la lotería: ", transaction)

                  //Compruebo que el balance del contrato ya no tiene los fondos de la lotería
                  transaction = (await flowmiContract.connect(deployer).getBalance()).toNumber()
                  console.log("Fondos en FlowMi luego de la lotería: ", transaction)

                  // Compruebo que ese index winner corresponde a un address del profileid
                  transaction = (await flowmiContract.connect(deployer).getLastWinner()).toString()
                  console.log("Address del último ganador", transaction)

                  // Compruebo fondos de todos los participantes después de la lotería
                  transaction = (
                      await flowmiContract
                          .connect(deployer)
                          .getFollowerOfIndex(profileid.address, 0)
                  ).toString()
                  console.log("Address del flowmiFollower [0]: ", transaction)
                  let transactionf1_2 = await await ethers.provider.getBalance(follower.address)
                  console.log(
                      "Fondos del flowmiFollower [0]: ",
                      ethers.utils.formatEther(transactionf1_2)
                  )
                  transaction = (
                      await flowmiContract
                          .connect(deployer)
                          .getFollowerOfIndex(profileid.address, 1)
                  ).toString()
                  console.log("Address del flowmiFollower [1]: ", transaction)
                  let transactionf2_2 = await ethers.provider.getBalance(follower2.address)
                  console.log(
                      "Fondos del flowmiFollower [1]: ",
                      ethers.utils.formatEther(transactionf2_2)
                  )
                  transaction = (
                      await flowmiContract
                          .connect(deployer)
                          .getFollowerOfIndex(profileid.address, 2)
                  ).toString()
                  console.log("Address del flowmiFollower [2]: ", transaction)
                  let transactionf3_2 = await ethers.provider.getBalance(follower3.address)
                  console.log(
                      "Fondos del flowmiFollower [2]: ",
                      ethers.utils.formatEther(transactionf3_2)
                  )

                  console.log("Address del profileid: ", profileid.address)
                  let transactionpid_2 = await ethers.provider.getBalance(profileid.address)
                  console.log("Fondos del profileid: ", ethers.utils.formatEther(transactionpid_2))

                  // Compruebo la diferencia de saldos
                  console.log(
                      "Dif f1: ",
                      ethers.utils.formatEther(transactionf1_2.sub(transactionf1_1))
                  )
                  console.log(
                      "DIf f2: ",
                      ethers.utils.formatEther(transactionf2_2.sub(transactionf2_1))
                  )
                  console.log(
                      "Dif f3: ",
                      ethers.utils.formatEther(transactionf3_2.sub(transactionf3_1))
                  )
                  console.log(
                      "Dif P2: ",
                      ethers.utils.formatEther(transactionpid_2.sub(transactionpid_1))
                  )

                  // Compruebo que se guarda el address del follower en el profile id
              })
          })

          /*
        describe("performUpkeep", function () {
            //may not need
            it("can only run if checkupkeep is true", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const tx = await raffle.performUpkeep("0x")
                assert(tx)
            })
        })
        describe("performUpkeep", function () {
            //may not need
            it("reverts if checkup is false", async () => {
                await expect(raffle.performUpkeep("0x")).to.be.revertedWith(
                    "Raffle__UpkeepNotNeeded"
                )
            })
        })
        describe("requestRandomWinner", function () {
            //sacar vrf d pU, tranformarlo en returnRandom,ID es el index del ganador, xq vrf sucede en pUPkeep
            it("updates the raffle state and emits a requestId", async () => {
                // Too many asserts in this test!
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const txResponse = await raffle.performUpkeep("0x") // emits requestId
                const txReceipt = await txResponse.wait(1) // waits 1 block
                const raffleState = await raffle.getRaffleState() // updates state
                const requestId = txReceipt.events[1].args.requestId
                assert(requestId.toNumber() > 0)
                assert(raffleState == 1) // 0 = open, 1 = calculating
            })
        })
        describe("fulfillRandomWords", function () {
            beforeEach(async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
            })
            it("can only be called after performupkeep", async () => {
                // request?
                await expect(
                    vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address) // reverts if not fulfilled
                ).to.be.revertedWith("nonexistent request")
                await expect(
                    vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address) // reverts if not fulfilled
                ).to.be.revertedWith("nonexistent request")
            })

            // This test is too big...
            // This test simulates users entering the raffle and wraps the entire functionality of the raffle
            // inside a promise that will resolve if everything is successful.
            // An event listener for the WinnerPicked is set up
            // Mocks of chainlink keepers and vrf coordinator are used to kickoff this winnerPicked event
            // All the assertions are done once the WinnerPicked event is fired
            it("picks a winner, resets, and sends money", async () => {
                const additionalEntrances = 3 // to test
                const startingIndex = 2
                for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
                    // i = 2; i < 5; i=i+1
                    raffle = raffleContract.connect(accounts[i]) // Returns a new instance of the Raffle contract connected to follower
                    await raffle.enterRaffle({ value: raffleEntranceFee })
                }
                const startingTimeStamp = await raffle.getLastTimeStamp() // stores starting timestamp (before we fire our event)

                // This will be more important for our staging tests...
                await new Promise(async (resolve, reject) => {
                    raffle.once("WinnerPicked", async () => {
                        // event listener for WinnerPicked
                        console.log("WinnerPicked event fired!")
                        // assert throws an error if it fails, so we need to wrap
                        // it in a try/catch so that the promise returns event
                        // if it fails.
                        try {
                            // Now lets get the ending values...
                            const recentWinner = await raffle.getRecentWinner()
                            const raffleState = await raffle.getRaffleState()
                            const winnerBalance = await accounts[2].getBalance()
                            const endingTimeStamp = await raffle.getLastTimeStamp()
                            await expect(raffle.getfollower(0)).to.be.reverted
                            // Comparisons to check if our ending values are correct:
                            assert.equal(recentWinner.toString(), accounts[2].address)
                            assert.equal(raffleState, 0)
                            assert.equal(
                                winnerBalance.toString(),
                                startingBalance // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                                    .add(
                                        raffleEntranceFee
                                            .mul(additionalEntrances)
                                            .add(raffleEntranceFee)
                                    )
                                    .toString()
                            )
                            assert(endingTimeStamp > startingTimeStamp)
                            resolve() // if try passes, resolves the promise
                        } catch (e) {
                            reject(e) // if try fails, rejects the promise
                        }
                    })

                    // kicking off the event by mocking the chainlink keepers and vrf coordinator
                    const tx = await raffle.performUpkeep("0x")
                    const txReceipt = await tx.wait(1)
                    const startingBalance = await accounts[2].getBalance()
                    await vrfCoordinatorV2Mock.fulfillRandomWords(
                        txReceipt.events[1].args.requestId,
                        raffle.address
                    )
                })
            })
        })*/
      })
