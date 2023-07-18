import { createHash, randomBytes } from "crypto"
import { redis } from "./api"

export const getChallengeKey = (address: string): string => `address:${address}`

// TODO: Implement
const determineDifficulty = () => {
  const challengeSize = 32
  const difficulty = 4
  return { challengeSize, difficulty }
}

// TODO: Implement
const determineChallengesNeeded = (usedCaptcha: boolean) =>
  usedCaptcha ? 2 : 4

const generateChallenge = (bytesSize: number = 32) =>
  randomBytes(bytesSize).toString("hex")

export const createChallenge = (usedCaptcha: boolean) => {
  const { challengeSize, difficulty } = determineDifficulty()
  const challengesNeeded = determineChallengesNeeded(usedCaptcha)
  const challenge = generateChallenge(challengeSize)
  return { challenge, challengesNeeded, difficulty }
}

interface Challenge {
  challenge: string
  challengesNeeded: number
  counter: number
  difficulty: number
  usedCaptcha: boolean
}

type SaveChallengeArgs = Omit<Challenge, "usedCaptcha"> & {
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
): Promise<Challenge | null> => {
  const data = await redis.hGetAll(challengeKey)

  if (!Object.keys(data).length) return null

  return {
    ...data,
    challengesNeeded: Number(data.challengesNeeded),
    counter: Number(data.counter),
    difficulty: Number(data.difficulty),
    usedCaptcha: data.usedCaptcha === "true",
  } as Challenge
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
  return hash === solution && hash.startsWith("0".repeat(difficulty) + "8")
}
