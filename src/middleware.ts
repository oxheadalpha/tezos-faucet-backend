import { validateKeyHash } from "@taquito/utils"
import { Request, Response, NextFunction } from "express"

import { DISABLE_CHALLENGES } from "./pow"
import { Profiles } from "./Types"

const checkChallengesEnabled = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (DISABLE_CHALLENGES) {
    return res.status(200).send({
      status: "SUCCESS",
      message: "Challenges are disabled. Use the /verify endpoint.",
    })
  }
  next()
}

const transformBody = (req: Request, res: Response, next: NextFunction) => {
  const { profile } = req.body
  if (typeof profile === "string") {
    req.body.profile = req.body.profile.toUpperCase()
  }
  next()
}

const validateAddress = (req: Request, res: Response, next: NextFunction) => {
  const { address } = req.body

  if (!address) {
    return res.status(400).send({
      status: "ERROR",
      message: "'address' field is required",
    })
  }

  if (validateKeyHash(address) !== 3) {
    return res.status(400).send({
      status: "ERROR",
      message: `The address '${address}' is invalid`,
    })
  }

  next()
}

const validateProfile = (req: Request, res: Response, next: NextFunction) => {
  const { profile } = req.body

  if (!profile) {
    return res.status(400).send({
      status: "ERROR",
      message: "'profile' field is required",
    })
  }

  if (!Profiles[profile]) {
    return res.status(400).send({
      status: "ERROR",
      message: `Unknown profile '${profile}'`,
    })
  }

  next()
}

const validateChallengeBody = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { solution, nonce } = req.body

  if (!DISABLE_CHALLENGES && (!solution || !nonce)) {
    return res.status(400).send({
      status: "ERROR",
      message: "'solution', and 'nonce', fields are required",
    })
  }

  next()
}

export const challengeMiddleware = [
  checkChallengesEnabled,
  transformBody,
  validateProfile,
  validateAddress,
]

export const verifyMiddleware = [
  transformBody,
  validateProfile,
  validateAddress,
  validateChallengeBody,
]
