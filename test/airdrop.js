const { expect } = require("chai");
const { ethers } = require("hardhat");

let token, signer, accounts;
const gbullTokenAddress = '0x21ecEa8f7788808848fc61D3FB8897F1a9a00D94';
const whaleAccountAddress = '0x63EcB27C684f148910d178221EDaEBDDb9BBAAaF';

const baseTokenContract = () => {
  const baseTokenAbi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function balanceOf(address) view returns (uint)",
    "function allowance(address _owner, address spender) external view returns (uint)",
    "function approve(address spender, uint amount) external",
    "function transfer(address recipient, uint amount) external"
  ];
  return new ethers.Contract(gbullTokenAddress, baseTokenAbi, hre.ethers.provider);
}

const DeployAirdropContract = async () => {
  const Airdrop = await ethers.getContractFactory("Airdrop");
  const airdrop = await Airdrop.deploy(gbullTokenAddress, BigInt(5000 * 10 ** 18).toString());
  await airdrop.deployed();

  return airdrop;
}

const ImpersonateAccount = async (accounts, enable) => {
  const method = enable ? 'hardhat_impersonateAccount' : 'hardhat_stopImpersonatingAccount';
  await hre.network.provider.request({
    method,
    params: [accounts],
  });
}

const AddFundsToAirDropContract = async (airdrop) => {
  const airdropAmount = BigInt(5000000 * 10 ** 18);
  await ImpersonateAccount(whaleAccountAddress, true);
  const whaleSigner = await hre.ethers.provider.getSigner(whaleAccountAddress);
  const tx = await baseTokenContract().connect(whaleSigner).transfer(airdrop.address, airdropAmount.toString());
  await tx.wait();
  await ImpersonateAccount(whaleAccountAddress, false);
}

const DeployAndFundContract = async () => {
  const airdrop = await DeployAirdropContract();
  await AddFundsToAirDropContract(airdrop);
  return airdrop;
}

describe("Airdrop", function () {
  it("Should test if airdrops can be claimed ineligible users.", async function () {
    const airdrop = await DeployAndFundContract();
    const claimTx = airdrop.connect((await hre.ethers.getSigners())[1]).claim();

    expect(claimTx).to.be.revertedWith('Not eligible.');
  });

  it("Should test if airdrops can be claimed before the specified date", async function () {

  });

  it("Should test if airdrops can be claimed after the specified date", async function () {

  });

  it("Should test if users can claim airdrop", async function () {

  })

  it("Should test if users can claim airdrop twice", async function () {

  });
});