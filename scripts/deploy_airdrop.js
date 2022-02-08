// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const xlsx = require('node-xlsx');
const path = require("path");

/**
 * Represents 1 day in seconds.
 * @type {bigint}
 */
const oneDay = BigInt(86400);
const gbullTokenAddress = process.env.GBULL_TOKEN_ADDRESS;
const startsIn = 9;
const period = 90;

const startDate = (currentBlockTimestamp) => {
    return BigInt(currentBlockTimestamp) + oneDay * BigInt(startsIn);
}

const endDate = (currentBlockTimestamp) => {
    return startDate(currentBlockTimestamp) + oneDay * BigInt(period);
}

async function main() {
    const list = xlsx.parse(path.join(__dirname, '../airdrop.xlsx'))[0].data;
    let accs = [];

    list.forEach((l, i) => {
        if (l.length === 1 && i !== 0) {
            accs.push(l[0]);
        }
    });

    const currentBlockTimestamp = (await hre.ethers.provider.getBlock(await hre.ethers.provider.getBlockNumber())).timestamp;

    // We get the contract to deploy
    const Airdrop = await hre.ethers.getContractFactory("Airdrop");
    console.log('Deploying contract')
    const airdrop = await Airdrop.deploy(
        gbullTokenAddress,
        BigInt(5000 * 10 ** 18).toString(), // 5K tokens for each user.
        startDate(currentBlockTimestamp).toString(),
        endDate(currentBlockTimestamp).toString(),
        accs
    );

    console.log('Waiting for deployment')
    await airdrop.deployed();

    console.log("Airdrop contract deployed to:", airdrop.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
