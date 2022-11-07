// SPDX-License-Identifier: MIT

// 1. Pragma
pragma solidity ^0.8.7;
// 2. Imports
// 2.1 VRF randomness creator
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
// 2.2 Datafeed
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "hardhat/console.sol";
import "./PriceConverter.sol";
// 2.3 Liquidity
import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";
import {IAToken} from "@aave/core-v3/contracts/interfaces/IAToken.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
//import {IWeth} from "./interfaces/IWeth.sol"; // For use in case of unwrapping
//import {IWeth} from "@aave/core-v3/contracts/misc/interfaces/IWETH.sol"; // For use in case of unwrapping
import {IWETHGateway} from "@aave/periphery-v3/contracts/misc/interfaces/IWETHGateway.sol";

// 3. Interfaces, Libraries, Contracts

/* Errors */
// Flowmi Logic Errors
error Flowmi__TransferFailed();
error Flowmi__SendMoreToEnterFlowmi();
error Flowmi__FlowmiRaffleNotOpen();
error Flowmi__MustBeRegisteredFlowmi();
error Flowmi__CantFlowmiFollowYourself();
// Liquidity Errors
error Error__NotEnoughBalance(uint256 balance, uint256 depositAmount);
error Error__NotEnoughAllowance(uint256 allowance, uint256 depositAmount);
error Error__NotEnoughLP(uint256 lpAmount);
error Error__AmountIsZero();
error Error__InvalidToken(address token);

/**@title Flowmi contract
 * @author Daniel Beltrán
 * @notice This contract is for raffling funds on flowmi, a pay-to-follow dapp
 * @dev This implements price feeds as our library
 */

contract FlowMi is VRFConsumerBaseV2 {
    // Type Declarations
    using PriceConverter for uint256;
    enum RaffleState {
        OPEN,
        CALCULATING
    }
    RaffleState private s_raffleState;

    // Events
    event RequestSent(uint256 requestId, uint32 numWords);
    event RequestFulfilled(uint256 requestId, uint256[] randomWords);

    // DataFeed
    AggregatorV3Interface private i_priceFeed;

    // VRF Coordinator
    VRFCoordinatorV2Interface private i_vrfCoordinator;
    uint256 private obtengoWinner;
    bytes32 private immutable i_gasLane; // 500 gwei Key Hash;
    uint32 private immutable i_callbackGasLimit;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // VRF Requests
    struct RequestStatus {
        bool fulfilled; // whether the request has been successfully fulfilled
        bool exists; // whether a requestId exists
        uint256[] randomWords;
    }
    mapping(uint256 => RequestStatus) private s_requests; /* requestId --> requestStatus */
    // past requests Id.
    uint256[] private requestIds;
    uint256 private lastRequestId;

    // Liquidity Provider
    IPoolAddressesProvider private immutable i_poolAddressesProvider;
    IPool private immutable POOL;
    uint16 private constant AAVE_REF_CODE = 0;
    uint256 private immutable poolFraction = 95;
    // Sondas Aaave
    uint256 private indeposit;
    uint256 private inwithdraw;

    // Direcciones de matic
    address private maticTokenAddress =
        // 0x0000000000000000000000000000000000001010;
        0xD65d229951E94a7138F47Bd9e0Faff42A7aCe0c6; // token in mumbai testnet
    address private wmaticTokenAddress =
        // 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270; // wrapped mainnet
        0xb685400156cF3CBE8725958DeAA61436727A30c3; // wrapped testnet
    address private awmaticTokenAddress =
        //0x6d80113e533a2C0fe82EaBD35f1875DcEA89Ea97;
        0x89a6AE840b3F8f489418933A220315eeA36d11fF; // atoken testnet

    IERC20 private imatic;
    IERC20 public iWmatic;
    IERC20 public iaWmatic;

    // Direcciones de la WETHGateway

    address private WETHGatewayAddress =
        0x2a58E9bbb5434FdA7FF78051a4B82cb0EF669C17; // testnet
    IWETHGateway private iWETHGateway;

    event Deposit(address indexed userAddr, uint256 amount);
    event Withdraw(address indexed userAddr, uint256 amount);

    mapping(address => uint256) public balances; // How much is collateralized by flowmi
    //

    // Flowmi Lottery Variables
    uint256 private immutable i_goal = 2;
    uint256 private immutable i_flowmiCost = 1 * 10**17;
    uint256 private immutable prize;
    uint256 private s_index = 0;
    uint256 private s_indexOfWinner;
    address payable profileid;
    address payable s_recentWinner;
    address payable i_flowmiOwner;
    uint256 private immutable fraction;
    uint256 private _withdrawAmmount;

    mapping(address => mapping(uint256 => address payable))
        private s_profileToFollowers; // mapping of profile to index to follower address
    mapping(address => uint256) private s_profileToFollowersCount; // mapping to know the amount of followers an account has
    mapping(address => uint256) private s_profileToFunds; // mapping to know how much funds has an account gathered
    mapping(address => bool) private s_profileIsFlowmi; // mapping to know if an account is registered as flowmi
    mapping(address => uint256) private s_profileToWins; // mapping to know how many times an account has won a raffle
    mapping(address => uint256) private s_profileToRaffles; // mapping to know how many times an account has activated a raffle

    // funcion: para contar cuantos

    constructor(
        address priceFeed,
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane, // keyHash
        uint32 callbackGasLimit,
        address poolAddressesProvider
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_priceFeed = AggregatorV3Interface(priceFeed);
        i_flowmiOwner = payable(msg.sender);
        prize = i_goal * i_flowmiCost;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        s_raffleState = RaffleState.OPEN;
        i_subscriptionId = subscriptionId;
        i_gasLane = gasLane;
        i_callbackGasLimit = callbackGasLimit;
        s_indexOfWinner = 0;
        //Pool
        i_poolAddressesProvider = IPoolAddressesProvider(poolAddressesProvider);
        POOL = IPool(i_poolAddressesProvider.getPool());
        // IWeths
        imatic = IERC20(maticTokenAddress);
        iWmatic = IERC20(wmaticTokenAddress);
        iaWmatic = IERC20(awmaticTokenAddress);
        fraction = (i_flowmiCost * poolFraction) / 100;
        _withdrawAmmount = fraction * (i_goal - 1);

        indeposit = 0;
        inwithdraw = 0;
        // IWETHGateway
        iWETHGateway = IWETHGateway(WETHGatewayAddress);
    }

    modifier onlyOwner() {
        require(msg.sender == i_flowmiOwner, "Must be owner");
        _;
    }

    // modifier that checks amount in liquidity pool is not zero
    modifier checkAmount(uint256 amount) {
        if (amount == 0) {
            revert Error__AmountIsZero();
        }
        _;
    }

    /** @notice Gets the amount that an address has funded
     * Funds our contract based on the MATIC/USD price
     * Any account can call this function to flowmi follow a registered flowmi account
     *  @param _profileid is the address of the registered account
     *   Iniciates the request for a random word to the VRF
     */
    function flowmiFollow(address _profileid) public payable {
        profileid = payable(_profileid);

        // comment for faster testing in testnet
        // Check if profile to flowmiFollow is registered
        if (!s_profileIsFlowmi[_profileid]) {
            revert Flowmi__MustBeRegisteredFlowmi();
        }
        // Check that you are not following yourself
        if (msg.sender == _profileid) {
            revert Flowmi__CantFlowmiFollowYourself();
        }

        // Check the entrance fee is correct with Pricefeed for USD/Matic
        if (msg.value.getConversionRate(i_priceFeed) < i_flowmiCost) {
            revert Flowmi__SendMoreToEnterFlowmi();
        }
        // Reads previous amount of flowmiFollower
        s_index = s_profileToFollowersCount[profileid];
        // Update total amount of funds for profile
        //s_profileToFunds[profileid] += msg.value;
        s_profileToFunds[profileid] += 1;
        // Stores address as follower of profile
        s_profileToFollowers[profileid][s_index] = payable(msg.sender);
        s_index++;
        // Updates amount of flowmiFollowers
        s_profileToFollowersCount[profileid] = s_index;

        /* If in goal, withdraw to money from the liquidity pool,
         * then withdraw calls RandomWords wich's when the randomword is provided, it withdraws
         * and then flowmi can give the prize
         */

        if (
            s_index % i_goal == 0 && s_profileToFollowersCount[profileid] != 0
        ) {
            s_profileToRaffles[profileid]++;
            // Permite a la Gateway llevarse los atokens

            iaWmatic.approve(address(iWETHGateway), type(uint256).max); // aprueba aMatic tmb,

            // Recupera de la Pool
            iWETHGateway.withdrawETH(
                address(POOL),
                _withdrawAmmount,
                address(this)
            );

            // Raffle
            requestRandomWords();
        } else {
            // wrapea y deposita directamente a la pool
            iWETHGateway.depositETH{value: fraction}(
                address(POOL),
                address(this),
                0
            );
        }
    }

    function getUserAccountData(address _userAddress)
        external
        view
        returns (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            uint256 availableBorrowsBase,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        )
    {
        return POOL.getUserAccountData(_userAddress);
    }

    /* Internal VRF function to request a random word
     * Assumes the subscription is funded sufficiently.
     */
    function requestRandomWords() internal returns (uint256 requestId) {
        // Will revert if subscription is not set and funded.
        requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        s_requests[requestId] = RequestStatus({
            randomWords: new uint256[](0),
            exists: true,
            fulfilled: false
        });
        requestIds.push(requestId);
        lastRequestId = requestId;
        emit RequestSent(requestId, NUM_WORDS);
        return requestId;
    }

    // Internal VRF function, receives the random word
    // Here we call the payment

    function fulfillRandomWords(
        uint256 _requestId,
        uint256[] memory _randomWords
    ) internal override {
        require(s_requests[_requestId].exists, "request not found");
        s_requests[_requestId].fulfilled = true;
        s_requests[_requestId].randomWords = _randomWords;
        emit RequestFulfilled(_requestId, _randomWords);
        s_indexOfWinner = (_randomWords[0] % i_goal);

        s_indexOfWinner =
            s_profileToFollowersCount[profileid] -
            s_indexOfWinner -
            1;

        s_recentWinner = (s_profileToFollowers[profileid][s_indexOfWinner]);
        s_profileToWins[s_recentWinner]++;

        pay(s_recentWinner, prize);
    }

    // Internal VRF function, MAY REMOVE
    function getRequestStatus(uint256 _requestId)
        external
        view
        returns (bool fulfilled, uint256[] memory randomWords)
    {
        require(s_requests[_requestId].exists, "request not found");
        RequestStatus memory request = s_requests[_requestId];
        return (request.fulfilled, request.randomWords);
    }

    function getWin() public view returns (uint256) {
        return obtengoWinner;
    }

    /** @notice This function transfers, just to make it more difficult to hack
     *  @param _winner is the address given by the mapping of followers in the index given by the VRF
     */
    function pay(address _winner, uint256 _amount) private {
        (bool success, ) = _winner.call{value: _amount}("");
        if (!success) {
            revert Flowmi__TransferFailed();
        }
    }

    /** @notice This function registers a profile
     */
    function registerProfile() public {
        s_profileIsFlowmi[msg.sender] = true;
    }

    /** @notice Let's you know if a profile is a flowmi registered profile
     *  @param _profileid is the address of the profile
     */
    function isRegisteredProfile(address _profileid)
        public
        view
        returns (bool)
    {
        return s_profileIsFlowmi[_profileid];
    }

    /** @notice Unregisters a profile making the mapping value false
     */
    function unregisterProfile() public {
        s_profileIsFlowmi[msg.sender] = false;
    }

    /** @notice Let's you know how much is in aave protocol
     */
    function getPool() public onlyOwner {
        //mapping de progiles [address] = true;
    }

    /** @notice Retrieve the goal of followers when the raffle is activated
     * @return i_goal uint containing the goal
     */
    function getGoal() public pure returns (uint256) {
        return i_goal;
    }

    /** @notice Get a 1 if the contract is deployed
     * @return 1
     */

    function getFlowmiState() public pure returns (uint256) {
        return 1;
    }

    /** @notice Get the flowmi follow cost
     * @return i_flowmiCost cost in dollars
     */

    function getFlowmiCost() public pure returns (uint256) {
        return i_flowmiCost;
    }

    /** @notice Gets the number of followers a profile has
     * @param _profileid is the profile
     * @return s_profileToFollowersCount of the profile
     */

    function getNumberOffollowers(address _profileid)
        public
        view
        returns (uint256)
    {
        return s_profileToFollowersCount[_profileid];
    }

    /** @notice Gets the address of a follower by index of flowmi follow
     * @param _profileid is the profile requested
     * @param _index is the index given to the follower when started flowmi following
     * @return s_profileToFollowersCount in the profileid location
     */
    function getFollowerOfIndex(address _profileid, uint256 _index)
        public
        view
        returns (address)
    {
        return s_profileToFollowers[_profileid][_index];
    }

    /** @notice Gets funds a profile has to give in the next raffle
     * @param _profileid is the profile requested
     * @return s_profileToFunds[_profileid] % i_goal, total amount of funds related to the profile
     * "modulo" the goal of the raffle, so it only counts what haven't been raffled yet
     */
    function getFundsToRaffle(address _profileid)
        public
        view
        returns (uint256)
    {
        return s_profileToFunds[_profileid] % i_goal;
    }

    /** @notice Gets total funds a profile has been given
     * @param _profileid is the profile requested
     * @return s_profileToFunds[_profileid], total amount of funds related to the profile
     */

    function getTotalFundedProfile(address _profileid)
        public
        view
        returns (uint256)
    {
        return s_profileToFunds[_profileid];
    }

    /** @notice Gets total wins a profile has
     * @param _profileid is the profile requested
     * @return s_profileToWins[_profileid], total amount of raffles won
     */

    function getProfileToWins(address _profileid)
        public
        view
        returns (uint256)
    {
        return s_profileToWins[_profileid];
    }

    /** @notice Gets total raffles a profile has made
     * @param _profileid is the profile requested
     * @return s_profileToRaffles[_profileid], total amount of raffles delivered
     */

    function getProfileToRaffles(address _profileid)
        public
        view
        returns (uint256)
    {
        return s_profileToRaffles[_profileid];
    }

    /** @notice Gets the latest winner address
     * @return s_recentWinner address of the last winner
     */
    function getLastWinnerAddress() public view returns (address) {
        return s_recentWinner;
    }

    /** @notice Gets the latest winner index
     * @return s_indexOfWinner index of the last winner
     */
    function getLastWinnerIndex() public view returns (uint256) {
        return s_indexOfWinner;
    }

    /** @notice Gets the balance in the flowmi account
     * @return balance
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function getWBalance() public view returns (uint256) {
        return iWmatic.balanceOf(address(this));
    }

    function getAWBalance() public view returns (uint256) {
        return iaWmatic.balanceOf(address(this));
    }

    /** @notice To be able to pay and fallback
     */
    receive() external payable {}

    fallback() external payable {}

    /** @notice To witdraw the total amount of funds flowmi account has to the deployer
     */
    function withdrawFunds() public onlyOwner {
        (bool success, ) = i_flowmiOwner.call{value: address(this).balance}("");
        require(success);
    }

    /* deswrpaear el wmatic que devuelve esta función
    function withdrawPoolToFlowmi(address _tokenAddress, uint256 _amount)
        public
        onlyOwner
        returns (uint256)
    {
        address asset = _tokenAddress;
        uint amount = _amount;
        address to = address(this);
        return POOL.withdraw(asset, amount, to);
    }*/
}
