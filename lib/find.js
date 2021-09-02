const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(timezone);

const pMap = require("p-map");
const DATE_FORMAT = "M/D/YY h:mm A";

const { symmetricDecrypt } = require("./crypto");
const PrismaClient = require("./db");

const Cabin = require("cabin");
const Calendar = require("./calendars/Calendar");
const { flatMap, includes } = require("lodash");
const cabin = new Cabin();

async function runAfterSuccess() {}

async function runAfterFailure() {
  const now = dayjs().valueOf();

  // cabin.info("Failed");
}

async function find() {
  const prisma = PrismaClient.getClient();

  try {
    // cabin.info("Finding Events");

    /**
     * TODO
     * Accounts should be ignored if phone, carrier, calendarConnections, timezone are not set
     */
    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        circlelyId: true,
        phone: true,
        email: true,
        name: true,
        isVerified: true,
        timezone: true,
        carrier: true,
      },
    });
    await pMap(
      accounts,
      async (account) => {
        const calendarConnections = await prisma.calendarConnection.findMany({
          where: {
            accountId: account.id,
          },
        });

        const SMS_GATEWAYS = {
          tmobile: "tmomail.net",
          sprint: "messaging.sprintpcs.com",
          att: "txt.att.net",
          verizon: "vtext.com",
        };

        const smsGateway = SMS_GATEWAYS[account.carrier];
        const sendTo = `${account.phone}@${smsGateway}`;

        const credentials = calendarConnections.map((credential) => {
          const rawValue = JSON.parse(
            symmetricDecrypt(credential.value, process.env.ENCRYPTION_KEY)
          );
          return {
            ...credential,
            rawValue: rawValue,
          };
        });

        const calendars = Calendar(credentials);
        const events = flatMap(
          await pMap(calendars, async (calendar) => {
            const userCalenders = await calendar.listCalendars();
            const from = dayjs()
              .startOf("day")
              .utc()
              .format("YYYY-MM-DDTHH:mm:ss[Z]");

            const to = dayjs()
              .endOf("day")
              .utc()
              .format("YYYY-MM-DDTHH:mm:ss[Z]");

            return flatMap(
              await calendar.listEvents(from, to, userCalenders),
              (e) => e
            );
          }),
          (e) => e
        );

        const currentReminders = await prisma.reminder.findMany({
          where: {
            id: {
              startsWith: account.id,
            },
          },
        });

        const currentRemindersIds = currentReminders.map((r) => {
          const id_parts = r.id.split("-");
          return `${id_parts[0]}-${id_parts[1]}`;
          // return r.id;
        });

        const eventIds = events.map(
          (event) =>
            event.id || event.iCalUID || dayjs(event.start.dateTime).valueOf()
        );

        const createRemindersFor = eventIds.filter((id) => {
          return !includes(currentRemindersIds, `${account.id}-${id}`);
        });

        await pMap(createRemindersFor, async (id) => {
          const event = events.find((e) => e.id === id);
          const eventStartTime = dayjs(event.start.dateTime).tz(
            event.start.timeZone || account.timezone
          );

          const missed = eventStartTime.isBefore(dayjs());

          if (!missed) {
            const now = dayjs().tz(event.start.timeZone || account.timezone);

            const eventIdentifier =
              event.id || event.iCalUID || eventStartTime.utc().valueOf();

            const tminus30minutes = eventStartTime.subtract(30, "minute");
            const tminus30minutes_iso = tminus30minutes.utc().toISOString();
            const tminus30minutes_text = `${event.summary} in 30 minutes`;

            const tminus5minutes = eventStartTime.subtract(5, "minute");
            const tminus5minutes_iso = tminus5minutes.utc().toISOString();
            const tminus5minutes_text = `${event.summary} in 5 minutes`;

            const tminus1minute = eventStartTime.subtract(1, "minute");
            const tminus1minute_iso = tminus1minute.utc().toISOString();
            const tminus1minute_text = `${event.summary} in 1 minute`;

            if (now.isBefore(tminus30minutes)) {
              await prisma.reminder.create({
                data: {
                  id: `${
                    account.id
                  }-${eventIdentifier}-${tminus30minutes.valueOf()}`,
                  sendAt: tminus30minutes_iso,
                  to: sendTo,
                  start: event.start.dateTime,
                  timezone: event.start.timeZone || account.timezone,
                  title: tminus30minutes_text,
                  subtitle: "",
                  description: "",
                  type: "event",
                  data: event,
                },
              });
            }

            if (now.isBefore(tminus5minutes)) {
              await prisma.reminder.create({
                data: {
                  id: `${
                    account.id
                  }-${eventIdentifier}-${tminus5minutes.valueOf()}`,
                  sendAt: tminus5minutes_iso,
                  to: sendTo,
                  start: event.start.dateTime,
                  timezone: event.start.timeZone || account.timezone,
                  title: tminus5minutes_text,
                  subtitle: "",
                  description: "",
                  type: "event",
                  data: event,
                },
              });
            }

            if (now.isBefore(tminus1minute)) {
              await prisma.reminder.create({
                data: {
                  id: `${
                    account.id
                  }-${eventIdentifier}-${tminus1minute.valueOf()}`,
                  sendAt: tminus1minute_iso,
                  to: sendTo,
                  start: event.start.dateTime,
                  timezone: event.start.timeZone || account.timezone,
                  title: tminus1minute_text,
                  subtitle: "",
                  description: "",
                  type: "event",
                  data: event,
                },
              });
            }
          }
        });

        return events;
      },
      { concurrency: 2 }
    );

    await runAfterSuccess();
  } catch (reason) {
    console.log(reason);
    await runAfterFailure();
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = find;
