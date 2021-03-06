const os = require("os");
const { parentPort } = require("worker_threads");
const Cabin = require("cabin");
const ProcessEvents = require("../lib/process");
const prisma = require("../lib/db");
//
// we recommend using Cabin as it is security-focused
// and you can easily hook in Slack webhooks and more
// <https://cabinjs.com>
//
// const cabin = new Cabin();

// store boolean if the job is cancelled
let isCancelled = false;

// how many emails to send at once
const concurrency = os.cpus().length || 1;

async function process(prisma) {
  // return early if the job was already cancelled
  if (isCancelled) return;
  try {
    await ProcessEvents(prisma);
  } catch (err) {
    // catch the error so if one email fails they all don't fail
    console.log(err);
    // cabin.error(err);
  }
}

// handle cancellation (this is a very simple example)
if (parentPort) {
  parentPort.once("message", (message) => {
    //
    // TODO: once we can manipulate concurrency option to p-map
    // we could make it `Number.MAX_VALUE` here to speed cancellation up
    // <https://github.com/sindresorhus/p-map/issues/28>
    //
    if (message === "cancel") isCancelled = true;
  });
}

(async () => {
  try {
    console.log("processing reminders");
    await process(prisma);

    // signal to parent that the job is done
    if (parentPort) parentPort.postMessage("done");
    else process.exit(0);
  } catch (reason) {
    console.log(reason);
    // cabin.error(reason);
  } finally {
    await prisma.$disconnect();
  }
})();
