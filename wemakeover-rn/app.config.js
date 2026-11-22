const path = require("path");
const fs = require("fs");
const app = require("./app.json");

/** Load .env so EXPO_PUBLIC_API_URL is available when evaluating this config. */
function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

/** Sync .env → expo.extra so the API URL updates without a native rebuild. */
const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  app.expo.extra?.apiBaseUrl ||
  "http://192.168.1.15:3000/api";

module.exports = {
  expo: {
    ...app.expo,
    extra: {
      ...app.expo.extra,
      apiBaseUrl,
    },
  },
};
