#!/usr/bin/env node

/**
 * Script to ensure Capacitor platforms are added before syncing
 * This is needed for CI/CD environments like Ionic Appflow
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const platform = process.argv[2];

if (!platform) {
  console.error("Usage: node scripts/ensure-platform.js <android|ios>");
  process.exit(1);
}

if (!["android", "ios"].includes(platform)) {
  console.error('Platform must be "android" or "ios"');
  process.exit(1);
}

const platformDir = path.join(process.cwd(), platform);
const platformExists = fs.existsSync(platformDir);

if (!platformExists) {
  console.log(`Platform ${platform} not found. Adding...`);
  try {
    execSync(`npx cap add ${platform}`, { stdio: "inherit" });
    console.log(`Platform ${platform} added successfully.`);
  } catch (error) {
    console.error(`Failed to add platform ${platform}:`, error.message);
    process.exit(1);
  }
} else {
  console.log(`Platform ${platform} already exists.`);
}
