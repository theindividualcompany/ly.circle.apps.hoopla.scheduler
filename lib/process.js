const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(timezone);

const pMap = require("p-map");

const { send } = require("./mail");
const Cabin = require("cabin");
const cabin = new Cabin();

async function runAfterSuccess() {}

async function runAfterFailure() {
  const now = dayjs().valueOf();
  cabin.info("Failed");
}

/**
 * isCancelled functionality from the find job is unimplemented
 */
async function process(prisma) {
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
        try {
          const scan_time = dayjs(reminder.sendAt);

          if (scan_time.isAfter(dayjs())) {
            return;
          }

          await send({
            to: `${reminder.to}`,
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
        } catch (error) {
          console.log(error);
        }
      },
      {
        concurrency: 4,
      }
    );

    await runAfterSuccess();
  } catch (reason) {
    console.log(reason);
    await runAfterFailure();
  }
}

module.exports = process;
