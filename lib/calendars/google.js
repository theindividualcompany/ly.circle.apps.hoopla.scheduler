const { google } = require("googleapis");
const prisma = require("../db");
const { symmetricEncrypt } = require("../crypto");

/**
 *
 * @param {*} credentials
 * access_token: "string"
 * refresh_token: "string"
 * scope: "string"
 * token_type: "string"
 * expiry_date: "number"
 */

const googleAuth = (credential) => {
  const { client_secret, client_id, redirect_uris } = JSON.parse(
    process.env.GOOGLE_API_CREDENTIALS
  ).web;

  //   console.log(credential);
  const myGoogleAuth = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  myGoogleAuth.setCredentials(credential.rawValue);

  const isExpired = () => myGoogleAuth.isTokenExpiring();

  const refreshAccessToken = () =>
    myGoogleAuth
      .refreshToken(credential.rawValue.refresh_token)
      .then((res) => {
        const token = res.res.data;
        credential.rawValue.access_token = token.access_token;
        credential.rawValue.expiry_date = token.expiry_date;

        const encrypted = symmetricEncrypt(
          JSON.stringify(credential.rawValue),
          process.env.ENCRYPTION_KEY
        );
        /** SHOULD ENCRYPT AND UPDATE CALENDAR CONNECTION */
        return prisma.calendarConnection
          .update({
            where: {
              id: credential.id,
            },
            data: {
              value: encrypted,
            },
          })
          .then(() => {
            myGoogleAuth.setCredentials(credential.rawValue);
            return myGoogleAuth;
          });
      })
      .catch((err) => {
        console.error("Error refreshing google token", err);
        return myGoogleAuth;
      });

  return {
    getToken: () =>
      !isExpired() ? Promise.resolve(myGoogleAuth) : refreshAccessToken(),
  };
};

const GoogleCalendar = (credential) => {
  const auth = googleAuth(credential);
  const integrationType = "google_calendar";

  const listEvents = (dateFrom, dateTo, selectedCalendars) => {
    //   return credential
    return new Promise((resolve, reject) =>
      auth.getToken().then((myGoogleAuth) => {
        const calendar = google.calendar({
          version: "v3",
          auth: myGoogleAuth,
        });
        const selectedCalendarIds = selectedCalendars
          .filter((e) => e.integration === integrationType)
          .map((e) => e.externalId);
        if (selectedCalendarIds.length == 0 && selectedCalendars.length > 0) {
          // Only calendars of other integrations selected
          resolve([]);
          return;
        }

        (selectedCalendarIds.length == 0
          ? calendar.calendarList
              .list()
              .then((cals) => cals.data.items.map((cal) => cal.id))
          : Promise.resolve(selectedCalendarIds)
        )
          .then((calIds) => {
            resolve(
              Promise.all(
                calIds.map(async (calId) => {
                  const event = await calendar.events.list({
                    calendarId: calId,
                    timeMin: dateFrom,
                    timeMax: dateTo,
                  });
                  return event.data.items;
                })
              )
            );
          })
          .catch((err) => {
            console.error(
              "There was an error contacting google calendar service: ",
              err
            );
            reject(err);
          });
      })
    );
  };

  const listCalendars = () => {
    return new Promise((resolve, reject) =>
      auth.getToken().then((myGoogleAuth) => {
        const calendar = google.calendar({
          version: "v3",
          auth: myGoogleAuth,
        });
        calendar.calendarList
          .list()
          .then((cals) => {
            resolve(
              cals.data.items.map((cal) => {
                const calendar = {
                  externalId: cal.id,
                  integration: integrationType,
                  name: cal.summary,
                  primary: cal.primary,
                };
                return calendar;
              })
            );
          })
          .catch((err) => {
            console.error(
              "There was an error contacting google calendar service: ",
              err
            );
            reject(err);
          });
      })
    );
  };

  return {
    type: "GoogleCalendar",
    listEvents,
    listCalendars,
  };
};

module.exports = GoogleCalendar;
