import "dotenv/config"

// This file is responsible for handling environment variables.
// It imports all environment variables from process.env and performs necessary type conversions.
// For some values, it's better to use the converted values from this file instead of process.env directly.
const {
  ENABLE_CAPTCHA,
  DISABLE_CHALLENGES,
  MAX_BALANCE,
  MIN_TEZ,
  MAX_TEZ,
  MIN_CHALLENGES,
  MAX_CHALLENGES,
  CHALLENGE_SIZE,
  DIFFICULTY,
  CAPTCHA_CHALLENGES_REDUCTION_RATIO,
} = process.env

const env = {
  ...process.env,
  DISABLE_CHALLENGES: DISABLE_CHALLENGES === "true",
  ENABLE_CAPTCHA: ENABLE_CAPTCHA !== "false",
  MAX_BALANCE: MAX_BALANCE ? Number(MAX_BALANCE) : 6000,
  MIN_TEZ: MIN_TEZ ? Number(MIN_TEZ) : 1,
  MAX_TEZ: MAX_TEZ ? Number(MAX_TEZ) : 6000,
  MIN_CHALLENGES: MIN_CHALLENGES ? Number(MIN_CHALLENGES) : 1,
  MAX_CHALLENGES: MAX_CHALLENGES ? Number(MAX_CHALLENGES) : 120,
  CHALLENGE_SIZE: CHALLENGE_SIZE ? Number(CHALLENGE_SIZE) : 32,
  DIFFICULTY: DIFFICULTY ? Number(DIFFICULTY) : 5,
  CAPTCHA_CHALLENGES_REDUCTION_RATIO: CAPTCHA_CHALLENGES_REDUCTION_RATIO
    ? Number(CAPTCHA_CHALLENGES_REDUCTION_RATIO)
    : 0.5,
}

const vars: (keyof typeof env)[] = [
  "CAPTCHA_CHALLENGES_REDUCTION_RATIO",
  "CHALLENGE_SIZE",
  "DIFFICULTY",
  "MAX_BALANCE",
  "MAX_TEZ",
  "MIN_TEZ",
  "MAX_CHALLENGES",
  "MIN_CHALLENGES",
]

vars.forEach((v) => {
  const value: any = env[v]
  if (isNaN(value)) throw new Error(`Env var ${v} must be a number.`)

  if (["CHALLENGE_SIZE", "DIFFICULTY"].includes(v)) {
   if (value <= 0) {
    throw new Error(`Env var ${v} must be greater than 0.`)
   }
  }
})

if (
  env.CAPTCHA_CHALLENGES_REDUCTION_RATIO < 0 ||
  env.CAPTCHA_CHALLENGES_REDUCTION_RATIO >= 1
) {
  throw new Error(
    "Env var CAPTCHA_CHALLENGES_REDUCTION_RATIO must be >= 0 and < 1."
  )
}

if (
  env.MAX_CHALLENGES < env.MIN_CHALLENGES ||
  env.MIN_CHALLENGES <= 0 ||
  env.MAX_CHALLENGES <= 0
) {
  throw new Error(
    "Env vars MAX_CHALLENGES and MIN_CHALLENGES must be greater than 0 and MAX_CHALLENGES must be greater than or equal to MIN_CHALLENGES."
  )
}

if (env.MAX_TEZ < env.MIN_TEZ || env.MIN_TEZ <= 0 || env.MAX_TEZ <= 0) {
  throw new Error(
    "Env vars MAX_TEZ and MIN_TEZ must be greater than 0 and MAX_TEZ must be greater than or equal to MIN_TEZ."
  )
}

export default env
