const dayjs = require("dayjs");
const cryptoRandomString = require("crypto-random-string");
const pMap = require("p-map");
const DATE_FORMAT = "M/D/YY h:mm A";
const _ = require("lodash");
const { PrismaClient } = require("@prisma/client");
const { symmetricDecrypt } = require("./crypto");

const prisma = new PrismaClient();

const Cabin = require("cabin");
const cabin = new Cabin();

async function updateNextRun() {}

async function runAfterSuccess() {}

async function runAfterFailure() {
  const now = dayjs().valueOf();

  cabin.info("Failed");
}

async function find() {
  try {
    cabin.info("Finding Events");

    const accounts = await prisma.account.findMany({});
    await pMap(
      accounts,
      async (account) => {
        console.log(account);
        const connections = await prisma.calendarConnection.findMany({
          where: {
            accountId: account.id,
          },
        });

        const creds = connections.map((c) => {
          const cred = symmetricDecrypt(c.value, process.env.ENCRYPTION_KEY);
          return {
            ...c,
            cred: cred,
          };
        });

        // get events
        console.log(creds);
      },
      { concurrency: 2 }
    );

    // _.forIn(accounts, async (account) => {
    //   console.log(account);
    //   const connections = await prisma.calendarConnection.findMany({
    //     where: {
    //       accountId: account.id,
    //     },
    //   });

    //   console.log(connections);
    // });
    await runAfterSuccess();
  } catch (reason) {
    await runAfterFailure();
  }

  // return job;
}

module.exports = find;
