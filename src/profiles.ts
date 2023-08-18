import env  from "./env"
import profiles from "../profiles.json"

export type Profile = string

type ProfileConfig = {
  amount: number
  challengesNeeded: number
  challengesNeededWithCaptcha: number
  difficulty: number
  difficultyWithCaptcha: number
}

const validateProperty = (
  profile: ProfileConfig,
  property: keyof ProfileConfig
): number => {
  const value = Number(profile[property])

  if (isNaN(value)) {
    throw new Error(`Profile '${property}' must be a number`)
  }

  // If the property is 'amount' or if challenges are enabled, then the value of
  // the property must be greater than 0. If it's not, an error is thrown.
  if ((property === "amount" || !env.DISABLE_CHALLENGES) && value <= 0) {
    throw new Error(`Profile '${property}' must be greater than 0`)
  }

  return value
}

const validateProfile = (profile: ProfileConfig): ProfileConfig => {
  const properties: (keyof ProfileConfig)[] = env.DISABLE_CHALLENGES
    ? ["amount"]
    : [
        "amount",
        "challengesNeeded",
        "challengesNeededWithCaptcha",
        "difficulty",
        "difficultyWithCaptcha",
      ]

  return properties.reduce((acc, property) => {
    acc[property] = validateProperty(profile, property)
    return acc
  }, {} as ProfileConfig)
}

const validatedProfiles = Object.entries(profiles).reduce(
  (acc, [key, profile]) => {
    acc[key.toUpperCase()] = validateProfile(profile)
    return acc
  },
  {} as Record<Profile, ProfileConfig>
)

export default validatedProfiles
