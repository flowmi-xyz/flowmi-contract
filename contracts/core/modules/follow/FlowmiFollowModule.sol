// SPDX-License-Identifier: MIT

// 1. Pragma
pragma solidity 0.8.10;

// 2. Imports
// 2.1 VRF randomness creator
import '@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol';
import '@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol';
// 2.2 Datafeed
import '@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol';
import 'hardhat/console.sol';
import './PriceConverter.sol';
// 2.3 Lens
import {IFollowModule} from '../../../interfaces/IFollowModule.sol'; // FeeFollowModule 0x60Ae865ee4C725cd04353b5AAb364553f56ceF82
import {ILensHub} from '../../../interfaces/ILensHub.sol'; //lens hub proxy 0x60Ae865ee4C725cd04353b5AAb364553f56ceF82
import {Errors} from '../../../libraries/Errors.sol';
import {FeeModuleBase} from '../FeeModuleBase.sol';
import {ModuleBase} from '../ModuleBase.sol';
import {FollowValidatorFollowModuleBase} from './FollowValidatorFollowModuleBase.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {IERC721} from '@openzeppelin/contracts/token/ERC721/IERC721.sol';

// 2.4 Aave
import {IPool} from '@aave/core-v3/contracts/interfaces/IPool.sol';
import {IAToken} from '@aave/core-v3/contracts/interfaces/IAToken.sol';
import {IPoolAddressesProvider} from '@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol';
import {IWETHGateway} from '@aave/periphery-v3/contracts/misc/interfaces/IWETHGateway.sol';

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
/**
 * @notice A struct containing the necessary data to execute follow actions on a given profile.
 *
 * @param currency The currency associated with this profile.
 * @param amount The following cost associated with this profile.
 * @param recipient The recipient address associated with this profile.
 */
struct ProfileData {
    address currency;
    uint256 amount;
    address recipient;
}

/**
/**@title Flowmi contract
 * @author Daniel Beltrán
 * @notice This contract is for raffling funds on flowmi, a pay-to-follow dapp
 * @dev This implements price feeds as our library
 */
contract FlowmiFollowModule is VRFConsumerBaseV2, FeeModuleBase, FollowValidatorFollowModuleBase {
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
    mapping(uint256 => RequestStatus) public s_requests; /* requestId --> requestStatus */
    // past requests Id.
    uint256[] public requestIds;
    uint256 public lastRequestId;

    // Liquidity Provider
    IPoolAddressesProvider private immutable i_poolAddressesProvider;
    IPool private immutable POOL;
    uint16 private constant AAVE_REF_CODE = 0;
    uint256 private immutable poolFraction = 99;
    // Sondas Aaave
    uint256 private indeposit;
    uint256 private inwithdraw;

    // Direcciones de matic
    address private immutable i_awmaticTokenAddress;

    IERC20 public iaWmatic;

    // Direcciones de la WETHGateway

    address private immutable i_WETHGatewayAddress;
    IWETHGateway private iWETHGateway;

    event Deposit(address indexed userAddr, uint256 amount);
    event Withdraw(address indexed userAddr, uint256 amount);

    mapping(address => uint256) public balances; // How much is collateralized by flowmi

    // Lottery Variables
    uint256 private immutable i_goal = 3;
    uint256 private immutable i_flowmiCost = 1 * 10**17;
    uint256 private immutable prize;
    uint256 private s_index = 0;
    uint256 private s_indexOfWinner;
    address payable profileid;
    address payable s_recentWinner;
    address payable i_flowmiOwner;
    uint256 private immutable fraction;
    uint256 private _withdrawAmmount;

    mapping(address => mapping(uint256 => address payable)) private s_profileToFollowers; // mapping of profile to index to follower address
    mapping(address => uint256) private s_profileToFollowersCount; // mapping to know the amount of followers an account has
    mapping(address => uint256) private s_profileToFunds; // mapping to know how much funds has an account gathered
    mapping(address => bool) private s_profileIsFlowmi; // mapping to know if an account is registered as flowmi
    mapping(address => uint256) private s_profileToWins; // mapping to know how many times an account has won a raffle
    mapping(address => uint256) private s_profileToRaffles; // mapping to know how many times an account has activated a raffle

    // Lens
    using SafeERC20 for IERC20;
    mapping(uint256 => ProfileData) internal _dataByProfile;

    //constructor(address hub, address moduleGlobals) FeeModuleBase(moduleGlobals) ModuleBase(hub) {}

    constructor(
        address priceFeed,
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane, // keyHash
        uint32 callbackGasLimit,
        address hub,
        address moduleGlobals,
        address poolAddressesProvider,
        address awmaticTokenAddress,
        address WETHGatewayAddress
    ) VRFConsumerBaseV2(vrfCoordinatorV2) FeeModuleBase(moduleGlobals) ModuleBase(hub) {
        i_priceFeed = AggregatorV3Interface(priceFeed);
        i_flowmiOwner = payable(msg.sender);
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        s_raffleState = RaffleState.OPEN;
        i_subscriptionId = subscriptionId;
        i_gasLane = gasLane;
        i_callbackGasLimit = callbackGasLimit;
        s_indexOfWinner = 0;

        //Pool
        i_poolAddressesProvider = IPoolAddressesProvider(poolAddressesProvider);
        POOL = IPool(i_poolAddressesProvider.getPool());

        // Token Interfaces
        i_awmaticTokenAddress = awmaticTokenAddress;
        iaWmatic = IERC20(i_awmaticTokenAddress);
        fraction = (i_flowmiCost * poolFraction) / 100;
        _withdrawAmmount = fraction * (i_goal - 1);
        prize = i_goal * fraction;

        indeposit = 0;
        inwithdraw = 0;
        // IWETHGateway
        i_WETHGatewayAddress = WETHGatewayAddress;
        iWETHGateway = IWETHGateway(WETHGatewayAddress);
    }

    //--------------------------Lens Module and Flowmi Logic-----------------------------------//

    /**
     * @notice This follow module levies a fee on follows.
     *
     * @param profileId The profile ID of the profile to initialize this module for.
     * @param data The arbitrary data parameter, decoded into:
     *      address currency: The currency address, must be internally whitelisted.
     *      uint256 amount: The currency total amount to levy.
     *      address recipient: The custom recipient address to direct earnings to.
     *
     * @return bytes An abi encoded bytes parameter, which is the same as the passed data parameter.
     */
    function initializeFollowModule(uint256 profileId, bytes calldata data)
        external
        override
        onlyHub
        returns (bytes memory)
    {
        (uint256 amount, address currency, address recipient) = abi.decode(
            data,
            (uint256, address, address)
        ); /*
        if (!_currencyWhitelisted(currency) || recipient == address(0) || amount == 0)
            revert Errors.InitParamsInvalid();*/

        _dataByProfile[profileId].amount = i_flowmiCost;
        _dataByProfile[profileId].currency = currency;
        _dataByProfile[profileId].recipient = recipient;
        return data;
    }

    /**
     * @dev Processes a follow by:
     *  1. Charging a fee
     */
    function processFollow(
        address follower,
        uint256 profileId,
        bytes calldata data
    ) external override onlyHub {
        uint256 amount = _dataByProfile[profileId].amount;
        address currency = _dataByProfile[profileId].currency;
        _validateDataIsExpected(data, currency, amount);

        (address treasury, uint16 treasuryFee) = _treasuryData();
        address recipient = _dataByProfile[profileId].recipient;
        uint256 treasuryAmount = (amount * treasuryFee) / BPS_MAX;
        uint256 adjustedAmount = amount - treasuryAmount;

        profileid = payable(recipient);

        /* Check if profile to flowmiFollow is registered
        if (!s_profileIsFlowmi[profileid]) {
            revert Flowmi__MustBeRegisteredFlowmi();
        }*/
        // Check that you are not following yourself
        if (follower == profileid) {
            revert Flowmi__CantFlowmiFollowYourself();
        }
        // aqui msg.value podría ser amount
        // Check the entrance fee is correct with Pricefeed for USD/Matic
        if (amount.getConversionRate(i_priceFeed) < i_flowmiCost) {
            revert Flowmi__SendMoreToEnterFlowmi();
        }
        // Reads previous amount of flowmiFollower
        s_index = s_profileToFollowersCount[profileid];
        // Update total amount of funds for profile
        s_profileToFunds[profileid] += 1;
        // Stores address as follower of profile
        s_profileToFollowers[profileid][s_index] = payable(follower);
        s_index++;
        // Updates amount of flowmiFollowers
        s_profileToFollowersCount[profileid] = s_index;

        // Deposit the fee
        iWETHGateway.depositETH{value: fraction}(address(POOL), address(this), 0);

        if (s_index % i_goal == 0 && s_profileToFollowersCount[profileid] != 0) {
            s_profileToRaffles[profileid]++;
            // If the raffle is activated:
            requestRandomWords();
        }
    }

    /**
     * @dev We don't need to execute any additional logic on transfers in this follow module.
     */
    function followModuleTransferHook(
        uint256 profileId,
        address from,
        address to,
        uint256 followNFTTokenId
    ) external override {}

    /**
     * @notice Returns the profile data for a given profile, or an empty struct if that profile was not initialized
     * with this module.
     *
     * @param profileId The token ID of the profile to query.
     *
     * @return ProfileData The ProfileData struct mapped to that profile.
     */
    function getProfileData(uint256 profileId) external view returns (ProfileData memory) {
        return _dataByProfile[profileId];
    }

    //--------------------------VRF and Flowmi Functions-----------------------------------//

    modifier onlyOwner() {
        require(msg.sender == i_flowmiOwner, 'Must be owner');
        _;
    }

    // Assumes the subscription is funded sufficiently.

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
    // Here we make the payment

    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords)
        internal
        override
    {
        require(s_requests[_requestId].exists, 'request not found');
        s_requests[_requestId].fulfilled = true;
        s_requests[_requestId].randomWords = _randomWords;
        emit RequestFulfilled(_requestId, _randomWords);
        s_indexOfWinner = (_randomWords[0] % i_goal);

        s_indexOfWinner = s_profileToFollowersCount[profileid] - s_indexOfWinner - 1;

        s_recentWinner = (s_profileToFollowers[profileid][s_indexOfWinner]);
        s_profileToWins[s_recentWinner]++;
        payAtokens(s_recentWinner);
    }

    // Internal VRF function
    function getRequestStatus(uint256 _requestId)
        external
        view
        returns (bool fulfilled, uint256[] memory randomWords)
    {
        require(s_requests[_requestId].exists, 'request not found');
        RequestStatus memory request = s_requests[_requestId];
        return (request.fulfilled, request.randomWords);
    }

    /** @notice This function transfers, just to make it more difficult to hack
     *  @param _winner is the address given by the mapping of followers in the index given by the VRF
     *
    function pay(address _winner) private {
        (bool success, ) = _winner.call{value: prize}('');
        if (!success) {
            revert Flowmi__TransferFailed();
        }
    }*/
    function payAtokens(address _winner) private {
        bool success = iaWmatic.transfer(_winner, prize);
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
    function isRegisteredProfile(address _profileid) public view returns (bool) {
        return s_profileIsFlowmi[_profileid];
    }

    /** @notice Unregisters a profile making the mapping value false
     */
    function unregisterProfile() public {
        s_profileIsFlowmi[msg.sender] = false;
    }

    /** @notice Let's you know how much is in aave protocol
     */
    function getPool() public view returns (address) {
        return address(POOL);
    }

    /** @notice AAVE pool data
     */

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

    /** @notice Gets the conversion in matic for 1 usd
     * @return i_flowmiCost.getConversionRate(i_priceFeed)
     */

    function getPriceFeed() public view returns (uint256) {
        return i_flowmiCost.getConversionRate(i_priceFeed);
    }

    /** @notice Gets the number of followers a profile has
     * @param _profileid is the profile
     * @return s_profileToFollowersCount of the profile
     */

    function getNumberOfFollowers(address _profileid) public view returns (uint256) {
        return s_profileToFollowersCount[_profileid];
    }

    /** @notice Gets the address of a follower by index of flowmi follow
     * @param _profileid is the profile requested
     * @param _index is the index given to the follower when started flowmi following
     * @return s_profileToFollowersCount in the profileid location
     */
    function getFollowerOfIndex(address _profileid, uint256 _index) public view returns (address) {
        return s_profileToFollowers[_profileid][_index];
    }

    /** @notice Gets funds a profile has to give in the next raffle
     * @param _profileid is the profile requested
     * @return s_profileToFunds[_profileid] % i_goal, total amount of funds related to the profile
     * "modulo" the goal of the raffle, so it only counts what haven't been raffled yet
     */
    function getFundsToRaffle(address _profileid) public view returns (uint256) {
        return s_profileToFunds[_profileid] % i_goal;
    }

    /** @notice Gets total funds a profile has been given
     * @param _profileid is the profile requested
     * @return s_profileToFunds[_profileid], total amount of funds related to the profile
     */

    function getTotalFundedProfile(address _profileid) public view returns (uint256) {
        return s_profileToFunds[_profileid];
    }

    /** @notice Gets total wins a profile has
     * @param _profileid is the profile requested
     * @return s_profileToWins[_profileid], total amount of raffles won
     */

    function getProfileToWins(address _profileid) public view returns (uint256) {
        return s_profileToWins[_profileid];
    }

    /** @notice Gets total raffles a profile has made
     * @param _profileid is the profile requested
     * @return s_profileToRaffles[_profileid], total amount of raffles delivered
     */

    function getProfileToRaffles(address _profileid) public view returns (uint256) {
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

    /** @notice To be able to pay and fallback
     */
    receive() external payable {}

    fallback() external payable {}

    /** @notice To witdraw the total amount of funds flowmi account has to the deployer
     */
    function withdraw() public onlyOwner {
        (bool success, ) = i_flowmiOwner.call{value: address(this).balance}('');
        require(success);
    }
}
