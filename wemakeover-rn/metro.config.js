const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

function adbPath() {
  const fromSdk = path.join(
    process.env.LOCALAPPDATA || "",
    "Android",
    "Sdk",
    "platform-tools",
    "adb.exe",
  );
  if (fromSdk && fs.existsSync(fromSdk)) return fromSdk;
  return "adb";
}

// The app calls 127.0.0.1. That only reaches this PC while adb reverse is set,
// and a new Metro start does not keep the previous forward.
function forwardUsbPorts() {
  const adb = adbPath();
  try {
    const listed = execFileSync(adb, ["devices"], {
      encoding: "utf8",
      timeout: 8000,
      windowsHide: true,
    });
    const phoneReady = listed
      .split(/\r?\n/)
      .some((line) => /\tdevice$/.test(line.trim()));
    if (!phoneReady) return;
    execFileSync(adb, ["reverse", "tcp:8081", "tcp:8081"], {
      timeout: 8000,
      windowsHide: true,
    });
    execFileSync(adb, ["reverse", "tcp:3000", "tcp:3000"], {
      timeout: 8000,
      windowsHide: true,
    });
    console.log("USB forward set: phone 127.0.0.1:8081 and :3000 -> this PC");
  } catch (error) {
    console.warn("USB forward was not set:", error.message);
  }
}

forwardUsbPorts();

module.exports = getDefaultConfig(__dirname);
