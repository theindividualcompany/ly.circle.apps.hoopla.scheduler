const { PrismaClient } = require("@prisma/client");

const Prisma = (function () {
  let prisma;

  function createInstance() {
    var prisma_client = new PrismaClient();
    return prisma_client;
  }

  return {
    getClient: function () {
      if (!prisma) {
        prisma = createInstance();
      }
      return prisma;
    },
  };
})();

module.exports = Prisma;
