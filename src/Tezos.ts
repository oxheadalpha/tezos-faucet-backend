import { InMemorySigner } from "@taquito/signer";
import { TezosToolkit } from "@taquito/taquito";

const defaultMaxBalance: number = 6000;

const send = async (amount: number, address: string): Promise<string> => {
    console.log(`Send ${amount} xtz to ${address}`);

    // Connect to RPC endpoint
    const rpcUrl: string = process.env.RPC_URL;

    if (!rpcUrl) {
        console.log("No RPC URL defined");
        throw new Error("API error");
    }

    console.log(`Use ${rpcUrl}`);

    let Tezos: TezosToolkit = new TezosToolkit(rpcUrl);

    // Check max balance
    const userBalance: number = (await Tezos.tz.getBalance(address)).toNumber();

    const maxBalance: number = process.env.MAX_BALANCE || defaultMaxBalance;
    if (userBalance > maxBalance * 1000000) {
        console.log(`User balance too high (${userBalance / 1000000}), don't send`);
        throw new Error("You have already enough ꜩ");
    }

    // Build memory signer fro private key
    const privateKey: string = process.env.FAUCET_PRIVATE_KEY;

    if (!privateKey) {
        console.log("No private key provided");
        throw new Error("API error");
    }

    // Create signer
    try {
        Tezos.setProvider({ signer: await InMemorySigner.fromSecretKey(privateKey) });
    }
    catch (err) {
        console.log(err);
        throw new Error("API error");
    }

    // Create and send transaction
    try {
        const operation = await Tezos.contract.transfer({ to: address, amount: amount });
        console.log(`Hash: ${operation.hash}`);
        return operation.hash;
    }
    catch (err) {
        console.log(err);
        throw err;
    }

};

export { send };
