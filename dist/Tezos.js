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
exports.send = exports.validateAddress = exports.getTezAmountForProfile = exports.defaultBakerAmount = exports.defaultUserAmount = void 0;
const signer_1 = require("@taquito/signer");
const taquito_1 = require("@taquito/taquito");
const utils_1 = require("@taquito/utils");
const Types_1 = require("./Types");
const defaultMaxBalance = 6000;
exports.defaultUserAmount = 1;
exports.defaultBakerAmount = 6000;
const getTezAmountForProfile = (profile) => {
    let amount = 0;
    switch (profile) {
        case Types_1.Profile.USER:
            amount = process.env.FAUCET_AMOUNT_USER || exports.defaultUserAmount;
            break;
        case Types_1.Profile.BAKER:
            amount = process.env.FAUCET_AMOUNT_BAKER || exports.defaultBakerAmount;
            break;
        default:
            throw new Error(`Unknown profile ${profile}`);
    }
    return amount;
};
exports.getTezAmountForProfile = getTezAmountForProfile;
const validateAddress = (res, address) => {
    if ((0, utils_1.validateKeyHash)(address) !== 3) {
        res
            .status(400)
            .send({ status: "ERROR", message: `The address '${address}' is invalid` });
        return false;
    }
    return true;
};
exports.validateAddress = validateAddress;
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
    const maxBalance = process.env.MAX_BALANCE || defaultMaxBalance;
    if (userBalance > maxBalance * 1000000) {
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
        Tezos.setProvider({
            signer: yield signer_1.InMemorySigner.fromSecretKey(privateKey),
        });
    }
    catch (err) {
        console.log(err);
        throw new Error("API error");
    }
    // Create and send transaction
    try {
        const operation = yield Tezos.contract.transfer({
            to: address,
            amount: amount,
        });
        console.log(`Hash: ${operation.hash}`);
        return operation.hash;
    }
    catch (err) {
        console.log(err);
        throw err;
    }
});
exports.send = send;
