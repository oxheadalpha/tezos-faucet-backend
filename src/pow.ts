import { createHash, randomBytes } from "crypto"
import { redis } from "./api"
import { Profile } from "./Types"

export const DISABLE_CHALLENGES = process.env.DISABLE_CHALLENGES === 'true'

export const getChallengeKey = (address: string): string => `address:${address}`

// TODO: Implement
const determineDifficulty = (usedCaptcha: boolean, profile: Profile) => {
  const challengeSize = 32
  const difficulty = usedCaptcha
    ? (Number(process.env[`${profile}_PROFILE_CAPTCHA_DIFFICULTY`]) || 4)
    : (Number(process.env[`${profile}_PROFILE_DIFFICULTY`]) || 5)
  return { challengeSize, difficulty }
}

// TODO: Implement
const determineChallengesNeeded = (usedCaptcha: boolean, profile: Profile) =>
  usedCaptcha
    ? (Number(process.env[`${profile}_PROFILE_CAPTCHA_CHALLENGES_NEEDED`]) || 5)
    : (Number(process.env[`${profile}_PROFILE_CHALLENGES_NEEDED`]) || 6)

const generateChallenge = (bytesSize: number = 32) =>
  randomBytes(bytesSize).toString("hex")

export const createChallenge = (usedCaptcha: boolean, profile: Profile) => {
  const challengesNeeded = determineChallengesNeeded(usedCaptcha, profile)
  const { challengeSize, difficulty } = determineDifficulty(usedCaptcha, profile)
  const challenge = generateChallenge(challengeSize)
  return { challenge, challengesNeeded, difficulty }
}

interface ChallengeState {
  challenge: string
  challengeCounter: number
  challengesNeeded: number
  difficulty: number
  usedCaptcha: boolean
  profile: Profile
}

type SaveChallengeArgs = Omit<ChallengeState, "usedCaptcha"> & {
  usedCaptcha?: boolean
  expiration?: number
}

export const saveChallenge = async (
  challengeKey: string,
  {
    usedCaptcha,
    expiration = 1800, // 30m
    ...args
  }: SaveChallengeArgs
) => {
  await redis.hSet(challengeKey, {
    ...args,
    ...(typeof usedCaptcha === "boolean" && {
      usedCaptcha: String(usedCaptcha),
    }),
  })
  await redis.expire(challengeKey, expiration)
}

export const getChallenge = async (
  challengeKey: string
): Promise<ChallengeState | null> => {
  const data = await redis.hGetAll(challengeKey)

  if (!Object.keys(data).length) return null

  return {
    challenge: data.challenge,
    challengeCounter: Number(data.challengeCounter),
    challengesNeeded: Number(data.challengesNeeded),
    difficulty: Number(data.difficulty),
    usedCaptcha: data.usedCaptcha === "true",
    profile: data.profile as Profile,
  } satisfies ChallengeState as ChallengeState
}

const getSolution = (challenge: string, nonce: number) =>
  createHash("sha256").update(`${challenge}:${nonce}`).digest("hex")

interface VerifySolutionArgs {
  challenge: string
  difficulty: number
  nonce: number
  solution: string
}
export const verifySolution = ({
  challenge,
  difficulty,
  nonce,
  solution,
}: VerifySolutionArgs) => {
  const hash = getSolution(challenge, nonce)
  // Validate the SHA-256 hash of the challenge concatenated with the nonce
  // starts with a certain number of zeroes (the difficulty).
  return hash === solution && hash.startsWith("0".repeat(difficulty))
}
