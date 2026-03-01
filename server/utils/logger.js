const winston = require("winston");

module.exports = winston.createLogger({
  level: "info",
  transports: [
    new winston.transports.File({ filename: "logs.log" })
  ]
});