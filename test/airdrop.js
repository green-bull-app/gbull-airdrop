const { expect } = require("chai");
const { ethers } = require("hardhat");

require("dotenv").config();

const gbullTokenAddress = process.env.GBULL_TOKEN_ADDRESS;
const whaleAccountAddress = process.env.WHALE_ADDRESS;
const startsIn = 6;
const period = 90;

/**
 * Represents 1 day in seconds.
 * @type {bigint}
 */
const oneDay = BigInt(86400);

/**
 * The contract for the token.
 * @returns {Contract}
 */
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

const startDate = (currentBlockTimestamp) => {
  return BigInt(currentBlockTimestamp) + oneDay * BigInt(startsIn);
}

const endDate = (currentBlockTimestamp) => {
  return startDate(currentBlockTimestamp) + oneDay * BigInt(period);
}

const DeployAirdropContract = async () => {
  const Airdrop = await ethers.getContractFactory("Airdrop");
  const currentBlockTimestamp = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;

  const airdrop = await Airdrop.deploy(
      gbullTokenAddress,
      BigInt(5000 * 10 ** 18).toString(), // 5K tokens for each user.
      startDate(currentBlockTimestamp).toString(),
      endDate(currentBlockTimestamp).toString(),
      await EligibleUser()
  );

  await airdrop.deployed();

  return airdrop;
}

/**
 * Impersonate an account.
 * @param {string} accounts The account to impersonate.
 * @param {boolean} enable Enable or disable.
 * @returns {Promise<void>}
 * @constructor
 */
const ImpersonateAccount = async (accounts, enable) => {
  const method = enable ? 'hardhat_impersonateAccount' : 'hardhat_stopImpersonatingAccount';
  await hre.network.provider.request({
    method,
    params: [accounts],
  });
}

const EligibleUser = async () => {
  return [(await hre.ethers.getSigners())[0].address];
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
  let airdrop, signers;

  before(async () => {
    airdrop = await DeployAndFundContract();
    signers = await hre.ethers.getSigners();
  });

  it("Should test if airdrops can be claimed ineligible users.", async function () {
    const currentBlockTimestamp = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
    const timeTravelDate = startDate(currentBlockTimestamp) + (BigInt(2) * oneDay);

    await hre.ethers.provider.send('evm_increaseTime', [Number(timeTravelDate.toString())]);
    const claimTx = airdrop.connect(signers[1]).claim();

    expect(claimTx).to.be.revertedWith('Not eligible.');
  });

  it("Should test if airdrops can be claimed before the specified date", async function () {
    const claimTx = airdrop.connect(signers[0]).claim();

    expect(claimTx).to.be.revertedWith('Too soon to claim.');
  });

  it("Should test if airdrops can be claimed after the specified date", async function () {
    const currentBlockTimestamp = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
    const timeTravelDate = endDate(currentBlockTimestamp) + oneDay;

    await hre.ethers.provider.send('evm_increaseTime', [Number(timeTravelDate.toString())]);
    const claimTx = airdrop.connect(signers[0]).claim();

    expect(claimTx).to.be.revertedWith('Airdrop has ended.');
  });

  it("Should test if users can claim airdrop", async function () {
    const currentBlockTimestamp = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
    const timeTravelDate = startDate(currentBlockTimestamp) + (BigInt(2) * oneDay);

    await hre.ethers.provider.send('evm_increaseTime', [Number(timeTravelDate.toString())]);
    const claimTx = await airdrop.connect(signers[0]).claim();
    await claimTx.wait();

    const accountBalance = await baseTokenContract().balanceOf(signers[0].address);

    expect(accountBalance.toString()).to.equal(BigInt(5000 * 10 ** 18).toString());
  });

  it("Should test if users can claim airdrop twice", async function () {
    const currentBlockTimestamp = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;
    const timeTravelDate = startDate(currentBlockTimestamp) + (BigInt(2) * oneDay);

    await hre.ethers.provider.send('evm_increaseTime', [Number(timeTravelDate.toString())]);
    const claimTx = await airdrop.connect(signers[0]).claim();
    await claimTx.wait();

    const accountBalance = await baseTokenContract().balanceOf(signers[0].address);

    expect(accountBalance.toString()).to.equal(BigInt(5000 * 10 ** 18).toString());

    const claimTx2 = airdrop.connect(signers[0]).claim();

    expect(claimTx2).to.be.revertedWith('Airdrop already claimed.');
  });
});