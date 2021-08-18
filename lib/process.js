const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const relativeTime = require("dayjs/plugin/relativeTime");
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

const PrismaClient = require("./db");

const pMap = require("p-map");
const cryptoRandomString = require("crypto-random-string");

const DATE_FORMAT = "M/D/YY h:mm A";
const TIME_FORMAT = "h:mm A";

const { send } = require("./mail");
const Cabin = require("cabin");
const cabin = new Cabin();

async function updateNextRun() {}

async function runAfterSuccess() {}

async function runAfterFailure() {
  const now = dayjs().valueOf();
  cabin.info("Failed");
}

/**
 * isCancelled functionality from the find job is unimplemented
 */
async function process() {
  const prisma = PrismaClient.getClient();

  try {
    // cabin.info("Processing Reminders");
    const reminders = await prisma.reminder.findMany({
      where: {
        sent: false,
      },
      orderBy: {
        sendAt: "asc",
      },
    });

    await pMap(
      reminders,
      async (reminder) => {
        const scan_time = dayjs(reminder.sendAt);

        if (scan_time.isAfter(dayjs())) {
          return;
        }

        await send({
          to: `${reminder.to}@tmomail.net`,
          text: reminder.title,
          subject: `Hoopla`,
        });

        await prisma.reminder.update({
          where: {
            id: reminder.id,
          },
          data: {
            sent: true,
          },
        });
      },
      {
        concurrency: 4,
      }
    );

    await runAfterSuccess();
  } catch (reason) {
    console.log(reason);
    await runAfterFailure();
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = process;
