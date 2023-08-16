import profiles from "../profiles.json"
import { DISABLE_CHALLENGES } from "./pow"

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
  return value
}

const validateProfile = (profile: ProfileConfig): ProfileConfig => {
  const properties: (keyof ProfileConfig)[] = DISABLE_CHALLENGES
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

const validatedProfiles = new Proxy(
  Object.entries(profiles).reduce((acc, [key, profile]) => {
    acc[key.toUpperCase()] = validateProfile(profile)
    return acc
  }, {} as Record<Profile, ProfileConfig>),
  {
    get: (target, prop) => {
      const key = String(prop)
      if (key in target) {
        return target[key]
      } else {
        throw new Error(`Profile '${key}' does not exist`)
      }
    },
  }
)

export default validatedProfiles
