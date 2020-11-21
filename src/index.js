require("module-alias/register");
require("dotenv/config");
require("babel-polyfill");
require("babel-register");

const Application = require("./Application").default;
const app = new Application();

app.start();
