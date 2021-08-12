const dayjs = require("dayjs");
const cryptoRandomString = require("crypto-random-string");

const DATE_FORMAT = "M/D/YY h:mm A";
const _ = require("lodash");

const Cabin = require("cabin");
const cabin = new Cabin();

async function updateNextRun() {}

async function runAfterSuccess() {}

async function runAfterFailure() {
  const now = dayjs().valueOf();

  cabin.info("Failed");
}

async function process(value) {
  if (values) {
    await runAfterFailure();
    return;
  }

  try {
    cabin.info("Running job", { value });
    await runAfterSuccess();
  } catch (reason) {
    await runAfterFailure();
  }

  return job;
}

module.exports = process;
