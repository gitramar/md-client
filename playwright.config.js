const path = require("path");

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: path.join(__dirname, "tests", "e2e"),
  timeout: 30000,
  use: {
    trace: "retain-on-failure"
  }
};

module.exports = config;
