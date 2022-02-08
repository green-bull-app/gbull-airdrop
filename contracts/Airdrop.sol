//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Airdrop {

    IERC20 airdropToken;
    address owner;
    uint256 airdropAmount;
    uint256 startDate;
    uint256 endDate;

    modifier onlyAdmin() {
        require(msg.sender == owner, "Not admin");
        _;
    }

    event Claim(address indexed sender, uint256 amount);

    struct Claimed {
        bool eligible;
        bool claimed;
    }

    mapping (address => Claimed) public airdrop;

    constructor(address _tokenAddress, uint256 _amount, uint256 _starDate, uint256 _endDate, address[] memory _users) {
        owner = msg.sender;

        airdropToken = IERC20(_tokenAddress);
        airdropAmount = _amount;

        require(_endDate > _starDate);

        startDate = block.timestamp +  _starDate;
        endDate = _starDate + _endDate;

        for (uint256 i = 0; i < _users.length; i++) {
            airdrop[_users[i]].eligible = true;
            airdrop[_users[i]].claimed = false;
        }
    }

    function claim() public {
        Claimed memory user = airdrop[msg.sender];

        require(airdropToken.balanceOf(address(this)) > 0, "No more airdrops left.");
        require(block.timestamp > startDate, "Too soon to claim.");
        require(block.timestamp < endDate, "Airdrop has ended.");
        require(user.eligible, "Not eligible.");
        require(!user.claimed, "Airdrop already claimed.");

        user.claimed = true;
        airdrop[msg.sender] = user;

        emit Claim(msg.sender, airdropAmount);
        airdropToken.transfer(msg.sender, airdropAmount);
    }

    function withdrawRemainingTokens() public onlyAdmin {
        require(block.timestamp > endDate, "Not ended.");
        airdropToken.transfer(owner, airdropToken.balanceOf(address(this)));
    }

    function changeAdmin(address _newOwner) public onlyAdmin {
        owner = _newOwner;
    }
}
