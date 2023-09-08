import { InMemorySigner } from "@taquito/signer"
import { TezosToolkit } from "@taquito/taquito"
import { Response } from "express"

import env from "./env"

// Setup the TezosToolkit to interact with the chain.
export const Tezos = (() => {
  const rpcUrl = env.RPC_URL
  if (!rpcUrl) {
    throw new Error("No RPC_URL defined.")
  }

  const TezToolkit = new TezosToolkit(rpcUrl)

  const faucetPrivateKey = env.FAUCET_PRIVATE_KEY
  if (!faucetPrivateKey) {
    throw new Error("No FAUCET_PRIVATE_KEY defined.")
  }

  // Create signer
  TezToolkit.setProvider({
    signer: new InMemorySigner(faucetPrivateKey),
  })

  return TezToolkit
})()

const sendTez = async (
  amount: number,
  address: string
): Promise<string | void> => {
  // Check max balance
  const userBalance = (await Tezos.tz.getBalance(address)).toNumber()
  if (userBalance > env.MAX_BALANCE * 1000000) {
    console.log(
      `${address} balance too high (${userBalance / 1000000}). Not sending.`
    )
    return
  }

  /* Note: `transfer` doesn't work well when running on node v19+. The
    underlying Axios requests breaks with "ECONNRESET error socket hang up".
    This is likely because node v19 sets HTTP(S) `keepAlive` to true by default
    and the Tezos node ends up killing the long-lived connection. It isn't easy
    to configure Axios in Taquito to work around this. */
  const operation = await Tezos.contract.transfer({ to: address, amount })
  console.log(`Sent ${amount} xtz to ${address}\nHash: ${operation.hash}`)
  return operation.hash
}

export const sendTezAndRespond = async (
  res: Response,
  amount: number,
  address: string
) => {
  try {
    const txHash = await sendTez(amount, address)

    if (!txHash) {
      return res
        .status(403)
        .send({ status: "ERROR", message: "You have already enough ꜩ" })
    }

    return res
      .status(200)
      .send({ txHash, status: "SUCCESS", message: "Tez sent" })
  } catch (err) {
    console.error(`Error sending Tez to ${address}.`)
    throw err
  }
}
