const { relative } = require("node:path");

module.exports = {
  "*.{js,mjs,ts,tsx}": (files) =>
    `eslint --fix ${files.map((f) => `"${relative(process.cwd(), f)}"`).join(" ")}`,
  "*.{js,mjs,ts,tsx,json,md,css}": (files) =>
    `prettier --write ${files.map((f) => `"${relative(process.cwd(), f)}"`).join(" ")}`,
};
