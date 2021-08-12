require("dotenv").config();
const Bree = require("bree");
const Cabin = require("cabin");
const Graceful = require("@ladjs/graceful");

const IS_DEV = process.env.NODE === "production" ? false : true;

const bree = new Bree({
  // logger: IS_DEV ? console : new Cabin(),
});

const graceful = new Graceful({ brees: [bree] });
graceful.listen();

bree.start();
bree.run();

module.exports = bree;
