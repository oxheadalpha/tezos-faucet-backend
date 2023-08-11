import { Profile, Profiles } from "./Types"
import { ProfileEnvVars } from "./environment"


type ProfileEnvVarsNumber<Profile extends string> = {
  [K in keyof ProfileEnvVars<Profile>]: number
}

const envVarAsNumber = (envVar: string) => {
  const value = process.env[envVar]
  let numValue

  if (value !== undefined) {
    numValue = Number(value)
    if (isNaN(numValue)) {
      throw new Error(`Environment variable ${envVar} is not a valid number`)
    }
  }

  return numValue
}

const MAX_BALANCE = envVarAsNumber("MAX_BALANCE")

export const profile = ((
  profiles: typeof Profiles
): ProfileEnvVarsNumber<Profile> => {
  const result: ProfileEnvVarsNumber<Profile> =
    {} as ProfileEnvVarsNumber<Profile>

  for (const profile in profiles) {
    const envVars = [
      `${profile}_PROFILE_AMOUNT`,
      `${profile}_PROFILE_AMOUNT`,
      `${profile}_PROFILE_DIFFICULTY`,
      `${profile}_PROFILE_CAPTCHA_DIFFICULTY`,
      `${profile}_PROFILE_CHALLENGES_NEEDED`,
      `${profile}_PROFILE_CAPTCHA_CHALLENGES_NEEDED`,
    ]

    envVars.forEach((envVar) => {
      const numValue = envVarAsNumber(envVar)
      if (numValue) {
        result[envVar as keyof ProfileEnvVarsNumber<Profile>] = numValue
      }
    })
  }

  return result
})(Profiles)

/** Returns number-as-string env vars as numbers. Such as MAX_BALANCE and the
 * profile specific challenge env vars. */
export default { MAX_BALANCE, profile }
