import { createHash, randomBytes } from "crypto"

import redis from "./redis"
import env from "./env"

export const getChallengeKey = (address: string): string => `address:${address}`

const determineDifficulty = () => {
  const challengeSize = 32
  const difficulty = env.DIFFICULTY
  return { challengeSize, difficulty }
}

const determineChallengesNeeded = (usedCaptcha: boolean, amount: number) => {
  const { MIN_TEZ, MAX_TEZ, MIN_CHALLENGES, MAX_CHALLENGES, } = env

  // Calculate the proportion of the requested Tez to the maximum Tez
  const tezProportion = (amount - MIN_TEZ) / (MAX_TEZ - MIN_TEZ)

  // Calculate the base number of challenges based on the Tez proportion
  let baseChallenges = (MAX_CHALLENGES - MIN_CHALLENGES) * tezProportion + MIN_CHALLENGES

  // If a captcha was used, reduce the number of challenges
  if (usedCaptcha) {
    baseChallenges *= (1 - env.CAPTCHA_CHALLENGES_REDUCTION_RATIO)
  }

  // Round the number of challenges to the nearest whole number
  const challenges = Math.ceil(baseChallenges)

  return challenges
}

const generateChallenge = (bytesSize: number = 32) =>
  randomBytes(bytesSize).toString("hex")

export const createChallenge = (amount: number, usedCaptcha: boolean) => {
  const challengesNeeded = determineChallengesNeeded(usedCaptcha, amount)
  const { challengeSize, difficulty } = determineDifficulty()
  const challenge = generateChallenge(challengeSize)
  return { amount, challenge, challengesNeeded, difficulty }
}

interface ChallengeState {
  amount: number
  challenge: string
  challengeCounter: number
  challengesNeeded: number
  difficulty: number
  usedCaptcha: boolean
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
    amount: Number(data.amount),
    challenge: data.challenge,
    challengeCounter: Number(data.challengeCounter),
    challengesNeeded: Number(data.challengesNeeded),
    difficulty: Number(data.difficulty),
    usedCaptcha: data.usedCaptcha === "true",
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
