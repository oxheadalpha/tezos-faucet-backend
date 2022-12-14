"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.send = void 0;
const signer_1 = require("@taquito/signer");
const taquito_1 = require("@taquito/taquito");
const defaultMaxBalance = 6000;
const send = (amount, address) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Send ${amount} xtz to ${address}`);
    // Connect to RPC endpoint
    const rpcUrl = process.env.RPC_URL;
    if (!rpcUrl) {
        console.log("No RPC URL defined");
        throw new Error("API error");
    }
    console.log(`Use ${rpcUrl}`);
    let Tezos = new taquito_1.TezosToolkit(rpcUrl);
    // Check max balance
    const userBalance = (yield Tezos.tz.getBalance(address)).toNumber();
    if (userBalance > defaultMaxBalance * 1000000) {
        console.log(`User balance too high (${userBalance / 1000000}), don't send`);
        throw new Error("You have already enough ꜩ");
    }
    // Build memory signer fro private key
    const privateKey = process.env.FAUCET_PRIVATE_KEY;
    if (!privateKey) {
        console.log("No private key provided");
        throw new Error("API error");
    }
    // Create signer
    try {
        Tezos.setProvider({ signer: yield signer_1.InMemorySigner.fromSecretKey(privateKey) });
    }
    catch (err) {
        console.log(err);
        throw new Error("API error");
    }
    // Create and send transaction
    try {
        const operation = yield Tezos.contract.transfer({ to: address, amount: amount });
        console.log(`Hash: ${operation.hash}`);
        return operation.hash;
    }
    catch (err) {
        console.log(err);
        throw err;
    }
});
exports.send = send;
