const { assert, expect } = require("chai");
const { network, deployments, ethers, getNamedAccounts } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");
const { BigNumber } = require("ethers");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Flowmi Unit Tests", function () {
      let flowmiContract,
        mockV3Aggregator,
        vrfCoordinatorV2Mock,
        follower,
        profileid,
        profileid2,
        deployer; // , deployer
      raffleEntranceFee = BigNumber.from(10).pow(17);

      beforeEach(async () => {
        accounts = await ethers.getSigners(); // could also do with getNamedAccounts
        deployer = (await getNamedAccounts()).deployer;
        follower = accounts[1];
        profileid = accounts[2];
        profileid2 = accounts[19];
        notflowmi = accounts[3];
        follower2 = accounts[4];
        follower3 = accounts[5];

        await deployments.fixture(["mocks", "flowmi"]); // Deploys modules with the tags "mocks" and "raffle"
        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        ); // Returns a new connection to the VRFCoordinatorV2Mock contract
        flowmiContract = await ethers.getContract("FlowMi", deployer); // Returns a new connection to the Raffle contract
        mockV3Aggregator = await ethers.getContract(
          "MockV3Aggregator",
          deployer
        ); // Returns a new connection to the Raffle contract
      });
      describe("flowmiRaffle", function () {
        it("initializes flowmiRaffle correctly", async () => {
          const flowmiState = (
            await flowmiContract.getFlowmiState()
          ).toString();
          // Comparisons for Raffle initialization:
          assert.equal(flowmiState.toString(), "1");
          //assert.equal(interval.toString(),networkConfig[network.config.chainId]["keepersUpdateInterval"])
        });
      });

      describe("constructor", function () {
        //si debería permitir ejecuciones paralelas mmmmm, siempre OPEN?
        it("reads the flowmi cost", async () => {
          let transaction = (
            await flowmiContract.connect(deployer).getFlowmiCost()
          ).toString();

          assert.equal(
            BigNumber.from(transaction).toString(),
            raffleEntranceFee.toString()
          );
        });
        it("reads the goal", async () => {
          let transaction = (
            await flowmiContract.connect(deployer).getGoal()
          ).toString();

          assert.equal(transaction.toString(), 3);
        });
      });

      describe("register as P2", function () {
        //este va para flowmiFollow
        /*
              it("reverts when you don't pay enough", async () => {
                  await expect(
                      await flowmiContract.connect(follower).flowmiFollow({ value: 1 })
                  ).to.be.revertedWith(
                      // is reverted when not paid enough or raffle is not open
                      "Flowmi__SendMoreToEnterFlowmiRaffle"
                  )
              })*/
        it("registers profile id to be flowmiFollow, and a follower checks it", async () => {
          // Registro mi perfil
          await flowmiContract.connect(profileid).registerProfile();
          // Pregunto si estoy registrado
          let transaction = (
            await flowmiContract
              .connect(follower)
              .isRegisteredProfile(profileid.address)
          ).toString();
          // Compruebo que es true
          assert.equal(transaction.toString(), true.toString());
        });
        it("can't follow an unregistered flowmi", async () => {
          await expect(
            flowmiContract.connect(follower).flowmiFollow(notflowmi.address, {
              value: raffleEntranceFee,
            })
          ).to.be.revertedWith(
            // is reverted when not paid enough or raffle is not open
            "Flowmi__MustBeRegisteredFlowmi()"
          );
        });
        it("can't flowmiFollow myself", async () => {
          // Registro mi perfil
          await flowmiContract.connect(profileid).registerProfile();
          // Pregunto si estoy registrado
          let transaction = (
            await flowmiContract
              .connect(follower)
              .isRegisteredProfile(profileid.address)
          ).toString();
          // Compruebo que es true
          assert.equal(transaction.toString(), true.toString());

          // I try to flowmiFollow myself
          await expect(
            flowmiContract.connect(profileid).flowmiFollow(profileid.address, {
              value: raffleEntranceFee,
            })
          ).to.be.revertedWith(
            // is reverted when not paid enough or raffle is not open
            "Flowmi__CantFlowmiFollowYourself()"
          );
        });
        /*
              it("registers on raffle when ", async () => {
                  // necesario?
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      // emits RaffleEnter event if entered to index follower(s) address
                      raffle,
                      "RaffleEnter"
                  )
              })
              it("doesn't allow entrance when raffle is calculating", async () => {
                  //este ojalá lo elimine, xq voy a negar un follow? si se está repartiendo no importa, entro a la siguiente lista, no?
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  // for a documentation of the methods below, go here: https://hardhat.org/hardhat-network/reference
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  // we pretend to be a keeper for a second
                  await raffle.performUpkeep([]) // changes the state to calculating for our comparison below
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
                      // is reverted as raffle is calculating
                      "Raffle__RaffleNotOpen"
                  )
              })*/
      });
      describe("flowmiFollow", function () {
        //este va para flowmiFollow

        it("reverts when you don't pay enough", async () => {
          // Registro mi perfil
          await flowmiContract.connect(profileid).registerProfile();
          await expect(
            flowmiContract.connect(follower).flowmiFollow(profileid.address)
          ).to.be.revertedWith("Flowmi__SendMoreToEnterFlowmi");
        });

        it("After following, the profileid mapping of followers is updated", async () => {
          // registro un perfil como P2
          await flowmiContract.connect(profileid).registerProfile();

          let transaction = (
            await flowmiContract
              .connect(follower)
              .isRegisteredProfile(profileid.address)
          ).toString();
          // Compruebo registro un perfil como P2
          assert.equal(transaction.toString(), true.toString());

          // Compruebo qu tengo 0 seguidores
          transaction = (
            await flowmiContract
              .connect(follower)
              .getNumberOffollowers(profileid.address)
          ).toString();

          assert.equal(transaction.toString(), "0");
          // Me sigue un follower
          transaction = await flowmiContract
            .connect(follower)
            .flowmiFollow(profileid.address, {
              value: raffleEntranceFee,
            });

          transaction = (
            await flowmiContract
              .connect(follower)
              .getNumberOffollowers(profileid.address)
          ).toString();
          // Compruebo que me sigue un follower
          assert.equal(transaction.toString(), "1");
        });
        it("3 followers and raffle is activated", async () => {
          // registro un perfil como P2, y lo sigo con 3 cuentas
          await flowmiContract.connect(profileid).registerProfile();
          // Compruebo qu tengo 0 seguidores
          // Me sigue 2 flowmifollowers
          await flowmiContract
            .connect(follower)
            .flowmiFollow(profileid.address, {
              value: raffleEntranceFee,
            });
          transaction = (
            await flowmiContract
              .connect(follower)
              .getNumberOffollowers(profileid.address)
          ).toString();
          assert.equal(transaction, 1);

          await flowmiContract
            .connect(follower2)
            .flowmiFollow(profileid.address, {
              value: raffleEntranceFee,
            });
          transaction = (
            await flowmiContract
              .connect(follower2)
              .getNumberOffollowers(profileid.address)
          ).toString();
          assert.equal(transaction, 2);

          // Compruebo que tengo 2 coins para rafflear
          transaction = (
            await flowmiContract
              .connect(deployer)
              .getFundsToRaffle(profileid.address)
          ).toNumber();
          assert.equal(transaction, 2);
          console.log(
            "Fondos que el profileid tiene para sortear antes de la lotería",
            transaction
          );

          //Compruebo que el balance del contrato tiene los fondos de la lotería
          transaction = await flowmiContract.connect(deployer).getBalance();
          console.log(
            "Fondos en FlowMi antes de la lotería",
            BigNumber.from(transaction).toString()
          );

          // Compruebo fondos de todos los participantes antes de la lotería
          // Address y funds del primer follower
          transaction = (
            await flowmiContract
              .connect(deployer)
              .getFollowerOfIndex(profileid.address, 0)
          ).toString();
          console.log("Address del flowmiFollower [0]: ", transaction);

          let transactionf1_1 = await (
            await ethers.provider.getBalance(follower.address)
          ).toString();
          console.log(
            "Fondos del flowmiFollower [0]: ",
            ethers.utils.formatEther(transactionf1_1)
          );
          // Address y funds del segundo follower
          transaction = (
            await flowmiContract
              .connect(deployer)
              .getFollowerOfIndex(profileid.address, 1)
          ).toString();
          console.log("Address del flowmiFollower [1]: ", transaction);

          let transactionf2_1 = (
            await ethers.provider.getBalance(follower2.address)
          ).toString();
          console.log(
            "Fondos del flowmiFollower [1]: ",
            ethers.utils.formatEther(transactionf2_1)
          );
          // Address y funds del 3er follower

          transaction = (
            await flowmiContract
              .connect(deployer)
              .getFollowerOfIndex(profileid.address, 2)
          ).toString();
          console.log("Address del flowmiFollower [2]: ", transaction);
          let transactionf3_1 = (
            await ethers.provider.getBalance(follower3.address)
          ).toString();
          console.log(
            "Fondos del flowmiFollower [2]: ",
            ethers.utils.formatEther(transactionf3_1)
          );

          console.log("Address del profileid: ", profileid.address);
          let transactionpid_1 = (
            await ethers.provider.getBalance(profileid.address)
          ).toString();
          console.log(
            "Fondos del profileid: ",
            ethers.utils.formatEther(transactionpid_1)
          );

          // Me sigue el 3er follower y se activa el flowmiRaffle
          await flowmiContract
            .connect(follower3)
            .flowmiFollow(profileid.address, {
              value: raffleEntranceFee,
            });
          transaction = (
            await flowmiContract
              .connect(follower)
              .getNumberOffollowers(profileid.address)
          ).toString();
          // Compruebo que me siguen 3 follower
          assert.equal(transaction.toString(), "3");

          /* Compruebo que reqId
          transaction = (
            await raffleContract.connect(deployer).getReqId()
          ).toNumber();
          assert(transaction != null);
          console.log("ReqId :", transaction);*/

          // Mock de fulfill
          transaction = await vrfCoordinatorV2Mock.fulfillRandomWords(
            1,
            flowmiContract.address
          );
          assert(transaction != null);

          console.log("Mockfulfill :", transaction.toString());

          /* Compruebo que ful
          transaction = await raffleContract.connect(deployer).getFul();
          assert(transaction != null);

          console.log("Ful :", BigNumber.from(transaction).toString());
*/
          // Compruebo que obtengoWinner
          transaction = (
            await flowmiContract.connect(deployer).getWin()
          ).toNumber();
          assert(transaction != null);
          console.log("Win :", transaction);

          // Compruebo que tengo un index ganador real desde flowmi
          transaction = (
            await flowmiContract.connect(deployer).getLastWinnerIndex()
          ).toString();
          assert(transaction != null);
          console.log("Index del ganador según flowmi: ", transaction);

          // Compruebo cuantos fondos han llegado a este perfil
          transaction = await flowmiContract
            .connect(deployer)
            .getTotalFundedProfile(profileid.address);
          assert(
            BigNumber.from(transaction).toString() ==
              raffleEntranceFee.mul(3).toString()
          );
          console.log(
            "Al profile le han depositado en total: ",
            BigNumber.from(transaction).toString()
          );

          // Compruebo que al perfil no le queden tokens luego del raffle
          transaction = (
            await flowmiContract
              .connect(deployer)
              .getFundsToRaffle(profileid.address)
          ).toNumber();
          assert(transaction == 0);
          console.log("Fondos para sortear luego de la lotería: ", transaction);

          //Compruebo que el balance del contrato ya no tiene los fondos de la lotería
          transaction = (
            await flowmiContract.connect(deployer).getBalance()
          ).toNumber();
          console.log("Fondos en FlowMi luego de la lotería: ", transaction);

          // Compruebo que ese index winner corresponde a un address del profileid
          transaction = (
            await flowmiContract.connect(deployer).getLastWinnerAddress()
          ).toString();
          console.log("Address del último ganador", transaction);

          // Compruebo fondos de todos los participantes después de la lotería
          transaction = (
            await flowmiContract
              .connect(deployer)
              .getFollowerOfIndex(profileid.address, 0)
          ).toString();
          console.log("Address del flowmiFollower [0]: ", transaction);
          let transactionf1_2 = await await ethers.provider.getBalance(
            follower.address
          );
          console.log(
            "Fondos del flowmiFollower [0]: ",
            ethers.utils.formatEther(transactionf1_2)
          );
          transaction = (
            await flowmiContract
              .connect(deployer)
              .getFollowerOfIndex(profileid.address, 1)
          ).toString();
          console.log("Address del flowmiFollower [1]: ", transaction);
          let transactionf2_2 = await ethers.provider.getBalance(
            follower2.address
          );
          console.log(
            "Fondos del flowmiFollower [1]: ",
            ethers.utils.formatEther(transactionf2_2)
          );
          transaction = (
            await flowmiContract
              .connect(deployer)
              .getFollowerOfIndex(profileid.address, 2)
          ).toString();
          console.log("Address del flowmiFollower [2]: ", transaction);
          let transactionf3_2 = await ethers.provider.getBalance(
            follower3.address
          );
          console.log(
            "Fondos del flowmiFollower [2]: ",
            ethers.utils.formatEther(transactionf3_2)
          );

          console.log("Address del profileid: ", profileid.address);
          let transactionpid_2 = await ethers.provider.getBalance(
            profileid.address
          );
          console.log(
            "Fondos del profileid: ",
            ethers.utils.formatEther(transactionpid_2)
          );

          // Compruebo la diferencia de saldos
          console.log(
            "Dif f1: ",
            ethers.utils.formatEther(transactionf1_2.sub(transactionf1_1))
          );
          console.log(
            "Dif f2: ",
            ethers.utils.formatEther(transactionf2_2.sub(transactionf2_1))
          );
          console.log(
            "Dif f3: ",
            ethers.utils.formatEther(transactionf3_2.sub(transactionf3_1))
          );
          console.log(
            "Dif P2: ",
            ethers.utils.formatEther(transactionpid_2.sub(transactionpid_1))
          );

          // Compruebo que se guarda el address del follower en el profile id
        });

        it("6 followers and raffle is activated 2 times", async () => {
          // registro un perfil como P2, y lo sigo con 3 cuentas
          await flowmiContract.connect(profileid).registerProfile();
          // Compruebo qu tengo 0 seguidores
          // Me sigue 2 flowmifollowers
          const entrants = 6;
          const startingAccountIndex = 6;
          for (
            let i = startingAccountIndex;
            i < startingAccountIndex + entrants;
            i++
          ) {
            await flowmiContract
              .connect(accounts[i])
              .flowmiFollow(profileid.address, {
                value: raffleEntranceFee,
              });
          }
          for (
            let i = startingAccountIndex;
            i < startingAccountIndex + entrants;
            i++
          ) {
            let transactions = await ethers.provider.getBalance(
              accounts[i].address
            );
            console.log(
              `Fondos del follower[${i}]: `,
              ethers.utils.formatEther(transactions)
            );
          }

          // Compruebo que se guarda el address del follower en el profile id
        });

        it("5 followers and to 1 profile, 6 to another,raffle is activated 3 times, contract has funds, mapping of bith profiles are updated, also funds to raffle", async () => {
          // registro un perfil como P2, y lo sigo con 3 cuentas
          await flowmiContract.connect(profileid).registerProfile();
          await flowmiContract.connect(profileid2).registerProfile();

          // Compruebo qu tengo 0 seguidores
          // Me sigue 2 flowmifollowers
          let entrants = 5;
          let startingAccountIndex = 6;
          for (
            let i = startingAccountIndex;
            i < startingAccountIndex + entrants;
            i++
          ) {
            await flowmiContract
              .connect(accounts[i])
              .flowmiFollow(profileid.address, {
                value: raffleEntranceFee,
              });
          }
          for (
            let i = startingAccountIndex;
            i < startingAccountIndex + entrants;
            i++
          ) {
            let transactions = await ethers.provider.getBalance(
              accounts[i].address
            );
            console.log(
              `Fondos del follower[${i}]: `,
              ethers.utils.formatEther(transactions)
            );
          }
          console.log("----------------------------------");

          entrants = 7;
          startingAccountIndex = 11;
          for (
            let i = startingAccountIndex;
            i < startingAccountIndex + entrants;
            i++
          ) {
            await flowmiContract
              .connect(accounts[i])
              .flowmiFollow(profileid2.address, {
                value: raffleEntranceFee,
              });
          }
          for (
            let i = startingAccountIndex;
            i < startingAccountIndex + entrants;
            i++
          ) {
            let transactions = await ethers.provider.getBalance(
              accounts[i].address
            );
            console.log(
              `Fondos del follower[${i}]: `,
              ethers.utils.formatEther(transactions)
            );
          }
          transaction = await ethers.provider.getBalance(
            flowmiContract.address
          );
          console.log(
            "Fondos en Flowmi: ",
            ethers.utils.formatEther(transaction)
          );
          // Compruebo que se guarda el address del follower en el profile id
          transaction = await flowmiContract.getFundsToRaffle(
            profileid.address
          );
          console.log(
            "Fondos del profile1 para rafflear: ",
            ethers.utils.formatEther(transaction)
          );
          // Compruebo que se guarda el address del follower en el profile id
          transaction = await flowmiContract.getFundsToRaffle(
            profileid2.address
          );
          console.log(
            "Fondos del profile2 para rafflear: ",
            ethers.utils.formatEther(transaction)
          );
          // Compruebo que se guarda el address del follower en el profile id
        });
        it("Allows withdrawal of owner", async () => {
          // registro un perfil como P2, y lo sigo con 3 cuentas
          await flowmiContract.connect(profileid).registerProfile();
          await flowmiContract.connect(profileid2).registerProfile();

          // Compruebo qu tengo 0 seguidores
          // Me sigue 2 flowmifollowers
          let entrants = 5;
          let startingAccountIndex = 6;
          for (
            let i = startingAccountIndex;
            i < startingAccountIndex + entrants;
            i++
          ) {
            await flowmiContract
              .connect(accounts[i])
              .flowmiFollow(profileid.address, {
                value: raffleEntranceFee,
              });
          }
          for (
            let i = startingAccountIndex;
            i < startingAccountIndex + entrants;
            i++
          ) {
            transactions = await ethers.provider.getBalance(
              accounts[i].address
            );
          }

          entrants = 7;
          startingAccountIndex = 11;
          for (
            let i = startingAccountIndex;
            i < startingAccountIndex + entrants;
            i++
          ) {
            await flowmiContract
              .connect(accounts[i])
              .flowmiFollow(profileid2.address, {
                value: raffleEntranceFee,
              });
          }
          for (
            let i = startingAccountIndex;
            i < startingAccountIndex + entrants;
            i++
          ) {
            transactions = await ethers.provider.getBalance(
              accounts[i].address
            );
          }
          transaction = await ethers.provider.getBalance(
            flowmiContract.address
          );
          console.log(
            "Fondos en Flowmi antes de retirar: ",
            ethers.utils.formatEther(BigNumber.from(transaction))
          );
          transaction = await flowmiContract.withdraw();
          transaction = await ethers.provider.getBalance(
            flowmiContract.address
          );

          console.log(
            "Fondos en Flowmi después de retirar: ",
            ethers.utils.formatEther(BigNumber.from(transaction))
          );
          transaction = await ethers.provider.getBalance(deployer);
          console.log(
            "Fondos en la cuenta del deployer: ",
            ethers.utils.formatEther(BigNumber.from(transaction))
          );
        });
      });

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
    });
