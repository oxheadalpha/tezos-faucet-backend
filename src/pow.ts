import { createHash, randomBytes } from "crypto"
import { redis } from "./api"

export const getChallengeKey = (address: string): string => `address:${address}`


const determineDifficulty = () => {
  const challengeSize = 32
  const difficulty = 4
  return { challengeSize, difficulty }
}

const generateChallenge = (bytesSize: number = 32) =>
  randomBytes(bytesSize).toString("hex")

export const createChallenge = () => {
  const { challengeSize, difficulty } = determineDifficulty()
  const challenge = generateChallenge(challengeSize)
  return { challenge, difficulty }
}

interface Challenge {
  challenge: string
  counter: number
  difficulty: number
  usedCaptcha: boolean
}

type SaveChallengeArgs = Omit<Challenge, "usedCaptcha"> & {
  challengeKey: string
  usedCaptcha?: boolean
  expiration?: number
}

export const saveChallenge = async ({
  challenge,
  challengeKey,
  counter,
  difficulty,
  expiration = 1800, // 30m
  usedCaptcha,
}: SaveChallengeArgs) => {
  await redis.hSet(challengeKey, {
    challenge,
    counter,
    difficulty,
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
  return hash === solution && hash.startsWith("0".repeat(difficulty) + "8")
}
