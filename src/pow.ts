import { createHash, randomBytes } from "crypto"
import { redis } from "./api"

export const getChallengeKey = (address: string): string => `address:${address}`

export const generateChallenge = (bytesSize: number = 32) =>
  randomBytes(bytesSize).toString("hex")

interface Challenge {
  challenge: string
  counter: number
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
  expiration = 1800, // 30m
  usedCaptcha,
}: SaveChallengeArgs) => {
  await redis.hSet(challengeKey, {
    challenge,
    counter,
    ...(typeof usedCaptcha === "boolean" && {
      usedCaptcha: String(usedCaptcha),
    }),
  })
  await redis.expire(challengeKey, expiration)
}

export const getChallenge = async (
  challengeKey: string
): Promise<Partial<Challenge>> => {
  const data = await redis.hGetAll(challengeKey)

  if (!Object.keys(data).length) return {}

  return {
    ...data,
    counter: Number(data.counter),
    usedCaptcha: data.usedCaptcha === "true",
  }
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
