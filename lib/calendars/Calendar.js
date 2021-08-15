const AppleCalendar = require("./apple");
const GoogleCalendar = require("./google");
const OutlookCalendar = require("./outlook");

const Calendar = (credentials) => {
  return credentials
    .map((credential) => {
      switch (credential.provider) {
        case "google_calendar":
          return GoogleCalendar(credential);
        case "office365_calendar":
          return OutlookCalendar(credential);
        case "apple_calendar":
          return AppleCalendar(credential);
        default:
          return; // unknown credential, could be legacy? In any case, ignore
      }
    })
    .filter(Boolean);
};

module.exports = Calendar;
