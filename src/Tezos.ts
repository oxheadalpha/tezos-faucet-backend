import { InMemorySigner } from "@taquito/signer"
import { TezosToolkit } from "@taquito/taquito"
import { validateKeyHash } from "@taquito/utils"
import { Response } from "express"
import { Profile } from "./Types"

const defaultUserAmount = 1
export const FAUCET_AMOUNT_USER =
  Number(process.env.FAUCET_AMOUNT_USER) || defaultUserAmount

const defaultBakerAmount = 6000
export const FAUCET_AMOUNT_BAKER =
  Number(process.env.FAUCET_AMOUNT_BAKER) || defaultBakerAmount

const defaultMaxBalance = 6000
export const MAX_BALANCE = Number(process.env.MAX_BALANCE) || defaultMaxBalance

export const getTezAmountForProfile = (profile: Profile) => {
  switch (profile.toUpperCase()) {
    case Profile.USER:
      return FAUCET_AMOUNT_USER
    case Profile.BAKER:
      return FAUCET_AMOUNT_BAKER
    default:
      throw new Error(`Unknown profile '${profile}'`)
  }
}

export const validateAddress = (res: Response, address: string) => {
  if (validateKeyHash(address) !== 3) {
    res
      .status(400)
      .send({ status: "ERROR", message: `The address '${address}' is invalid` })
    return false
  }
  return true
}

// Setup the TezosToolkit to interact with the chain.
const Tezos = (() => {
  const rpcUrl = process.env.RPC_URL
  if (!rpcUrl) {
    throw new Error("No RPC_URL defined.")
  }

  const TezToolkit = new TezosToolkit(rpcUrl)

  const faucetPrivateKey = process.env.FAUCET_PRIVATE_KEY
  if (!faucetPrivateKey) {
    throw new Error("No FAUCET_PRIVATE_KEY defined.")
  }

  // Create signer
  TezToolkit.setProvider({
    signer: new InMemorySigner(faucetPrivateKey),
  })

  return TezToolkit
})()

export const send = async (
  amount: number,
  address: string
): Promise<string> => {
  // Check max balance
  try {
    const userBalance = (await Tezos.tz.getBalance(address)).toNumber()
    if (userBalance > MAX_BALANCE * 1000000) {
      console.log(
        `User balance too high (${userBalance / 1000000}), don't send`
      )
      throw new Error("You have already enough ꜩ")
    }
  } catch (err) {
    console.error(err)
    throw new Error(`Error getting ${address} balance.`)
  }

  // Create and send transaction
  try {
    /* Note: `transfer` doesn't work well when running on node v19+. The
    underlying Axios requests breaks with "ECONNRESET error socket hang up".
    This is likely because node v19 sets HTTP(S) `keepAlive` to true by default
    and the Tezos node ends up killing the long-lived connection. It isn't easy
    to configure Axios in Taquito to work around this. */
    const operation = await Tezos.contract.transfer({ to: address, amount })
    console.log(`Sent ${amount} xtz to ${address}`)
    console.log(`Hash: ${operation.hash}`)
    return operation.hash
  } catch (err) {
    console.error(`Error sending Tez to ${address}.`)
    throw err
  }
}
