#!/usr/bin/env node

/**
 * Script to ensure Capacitor platforms are added after build
 * This runs automatically after 'npm run build' to prepare for Ionic Appflow
 *
 * It checks for both android and ios platforms and adds them if they don't exist.
 * This is necessary for Ionic Appflow builds that run 'npx cap sync android' directly.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function ensurePlatform(platform) {
  const platformDir = path.join(process.cwd(), platform);
  const platformExists = fs.existsSync(platformDir);

  if (!platformExists) {
    console.log(`[Capacitor] Platform ${platform} not found. Adding...`);
    try {
      execSync(`npx cap add ${platform}`, { stdio: "inherit" });
      console.log(`[Capacitor] Platform ${platform} added successfully.`);
    } catch (error) {
      console.error(
        `[Capacitor] Failed to add platform ${platform}:`,
        error.message
      );
      // Don't exit with error - allow build to continue
      // The sync step will fail anyway if platform is missing
    }
  } else {
    console.log(`[Capacitor] Platform ${platform} already exists.`);
  }
}

// Check if we're in a CI/CD environment (like Ionic Appflow)
// In CI, we only add the platform that's being built
const platformEnv = process.env.PLATFORM_NAME || process.env.DEFAULT_PLATFORM;

if (platformEnv) {
  // Only ensure the platform being built
  const platform = platformEnv.toLowerCase();
  if (platform === "android" || platform === "ios") {
    ensurePlatform(platform);
  }
} else {
  // In local development, ensure both platforms
  ensurePlatform("android");
  ensurePlatform("ios");
}
