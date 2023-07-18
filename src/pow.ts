import { createHash, randomBytes } from "crypto"
import { redis } from "./api"

export const getChallengeKey = (address: string): string => `address:${address}`

// TODO: Implement
const determineDifficulty = (usedCaptcha: boolean) => {
  const challengeSize = 32
  const difficulty = usedCaptcha ? 4 : 5
  return { challengeSize, difficulty }
}

// TODO: Implement
const determineChallengesNeeded = (usedCaptcha: boolean) =>
  usedCaptcha ? 5 : 6

const generateChallenge = (bytesSize: number = 32) =>
  randomBytes(bytesSize).toString("hex")

export const createChallenge = (usedCaptcha: boolean) => {
  const challengesNeeded = determineChallengesNeeded(usedCaptcha)
  const { challengeSize, difficulty } = determineDifficulty(usedCaptcha)
  const challenge = generateChallenge(challengeSize)
  return { challenge, challengesNeeded, difficulty }
}

interface ChallengeState {
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
    ...data,
    challengeCounter: Number(data.challengeCounter),
    challengesNeeded: Number(data.challengesNeeded),
    difficulty: Number(data.difficulty),
    usedCaptcha: data.usedCaptcha === "true",
  } as ChallengeState
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
