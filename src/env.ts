import "dotenv/config"

// This file is responsible for handling environment variables.
// It imports all environment variables from process.env and performs necessary type conversions.
// For some values, it's better to use the converted values from this file instead of process.env directly.
const { ENABLE_CAPTCHA, DISABLE_CHALLENGES, MAX_BALANCE } = process.env

const env = {
  ...process.env,
  ENABLE_CAPTCHA: ENABLE_CAPTCHA !== "false",
  DISABLE_CHALLENGES: DISABLE_CHALLENGES === "true",
  MAX_BALANCE: MAX_BALANCE ? Number(MAX_BALANCE) : 6000,
}

if (isNaN(env.MAX_BALANCE)) {
  throw new Error("Env var MAX_BALANCE must be a number.")
}

export default env
