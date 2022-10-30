// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "hardhat/console.sol";
import "./PriceConverter.sol";

/* Errors */
error Flowmi__TransferFailed();
error Flowmi__SendMoreToEnterFlowmi();
error Flowmi__FlowmiRaffleNotOpen();
error Flowmi__MustBeRegisteredFlowmi();
error Flowmi__CantFlowmiFollowYourself();

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

    struct RequestStatus {
        bool fulfilled; // whether the request has been successfully fulfilled
        bool exists; // whether a requestId exists
        uint256[] randomWords;
    }
    mapping(uint256 => RequestStatus) public s_requests; /* requestId --> requestStatus */
    // past requests Id.
    uint256[] public requestIds;
    uint256 public lastRequestId;

    // DataFeed
    AggregatorV3Interface private i_priceFeed;

    // VRF Coordinator
    VRFCoordinatorV2Interface private i_vrfCoordinator;
    uint256 public obtengoWinner;
    bytes32 private immutable i_gasLane; // 500 gwei Key Hash;
    uint32 private immutable i_callbackGasLimit;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    uint256 private abroRequest = 0;
    uint256 private abroFulfill = 0;

    // Lottery Variables
    uint256 private immutable i_goal = 3;
    uint256 private immutable i_entranceFee = 1 * 10**17;
    uint256 private immutable prize;
    uint256 private s_index = 0;
    uint256 private s_indexOfWinner;
    address payable follower;
    address payable profileid;
    address payable s_recentWinner;
    address payable i_flowmiOwner;

    mapping(address => mapping(uint256 => address payable))
        private s_profileToFollowers; //profile to index to follower address
    mapping(address => uint256) private s_profileToFollowersCount; //mapeo para saber cuántos followers tiene un profileid
    mapping(address => uint256) private s_profileToFunds; //mapeo cuántos fondos tiene asociado este profile
    mapping(address => bool) private s_profileIsFlowmi; //mapeo si un profile se registró como flowmi
    mapping(address => uint256) private s_profileToWins; //mapeo cuántas veces ha ganado el perfil

    constructor(
        address priceFeed,
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane, // keyHash
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_priceFeed = AggregatorV3Interface(priceFeed);
        i_flowmiOwner = payable(msg.sender);
        //s_flowmiState = FlowmiState.OPEN;
        prize = i_goal * i_entranceFee;
        // Raffleo
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        s_raffleState = RaffleState.OPEN;
        i_subscriptionId = subscriptionId;
        i_gasLane = gasLane;
        i_callbackGasLimit = callbackGasLimit;
        abroRequest = 0;
        abroFulfill = 0;
        s_indexOfWinner = 0;
    }

    modifier onlyOwner() {
        require(msg.sender == i_flowmiOwner, "Must be owner");
        _;
    }

    function flowmiFollow(address _profileid) public payable {
        profileid = payable(_profileid);

        // Check if profile to flowmiFollow is registered
        if (!s_profileIsFlowmi[_profileid]) {
            revert Flowmi__MustBeRegisteredFlowmi();
        }
        // Check that you are not following yourself
        if (msg.sender == _profileid) {
            revert Flowmi__CantFlowmiFollowYourself();
        }

        // Check the entrance fee is correct with Pricefeed for USD/Matic
        if (msg.value.getConversionRate(i_priceFeed) < i_entranceFee) {
            revert Flowmi__SendMoreToEnterFlowmi();
        }
        // Reads previous amount of flowmiFollower
        s_index = s_profileToFollowersCount[profileid];
        // Update total amount of funds for profile
        s_profileToFunds[profileid] += msg.value;
        // Stores address as follower of profile
        s_profileToFollowers[profileid][s_index] = payable(msg.sender);
        s_index++;
        // Updates amount of flowmiFollowers
        s_profileToFollowersCount[profileid] = s_index;

        // If in goal, select a winner and call payment

        if (
            s_index % i_goal == 0 && s_profileToFollowersCount[profileid] != 0
        ) {
            requestRandomWords();
        }
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
        pay(s_recentWinner);
    }

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

    function pay(address _winner) private {
        (bool success, ) = _winner.call{value: prize}("");
        if (!success) {
            revert Flowmi__TransferFailed();
        }
    }

    function registerProfile() public {
        s_profileIsFlowmi[msg.sender] = true; //mapping de perfiles [address] = true;
    }

    function isRegisteredProfile(address _profileid)
        public
        view
        returns (bool)
    {
        return s_profileIsFlowmi[_profileid]; //mapping de perfiles [address] = true;
    }

    function unregisterProfile() public {
        s_profileIsFlowmi[msg.sender] = false; //mapping de perfiles [address] = true;
    }

    function getPool() public onlyOwner {
        //mapping de progiles [address] = true;
    }

    function getGoal() public pure returns (uint256) {
        return i_goal;
    }

    function getFlowmiState() public pure returns (uint256) {
        return 1;
    }

    function getEntranceFee() public pure returns (uint256) {
        return i_entranceFee;
    }

    function getNumberOffollowers(address _profileid)
        public
        view
        returns (uint256)
    {
        return s_profileToFollowersCount[_profileid];
    }

    function getFollowerOfIndex(address _profileid, uint256 _index)
        public
        view
        returns (address)
    {
        return s_profileToFollowers[_profileid][_index];
    }

    function getFundsToRaffle(address _profileid)
        public
        view
        returns (uint256)
    {
        return s_profileToFunds[_profileid] % i_goal;
    }

    function getTotalFundedProfile(address _profileid)
        public
        view
        returns (uint256)
    {
        return s_profileToFunds[_profileid];
    }

    function getLastWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getWinnerIndex() public view returns (uint256) {
        return s_indexOfWinner;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {
        // can be empty
    }

    function withdraw() public onlyOwner {
        (bool success, ) = i_flowmiOwner.call{value: address(this).balance}("");
        require(success);
    }
}
