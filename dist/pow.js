"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySolution = exports.generateChallenge = exports.getChallengeKey = void 0;
const crypto_1 = require("crypto");
const getChallengeKey = (address) => `address:${address}`;
exports.getChallengeKey = getChallengeKey;
const generateChallenge = (bytesSize = 32) => (0, crypto_1.randomBytes)(bytesSize).toString("hex");
exports.generateChallenge = generateChallenge;
const getSolution = (challenge, nonce) => (0, crypto_1.createHash)("sha256").update(`${challenge}:${nonce}`).digest("hex");
const verifySolution = ({ challenge, difficulty, nonce, solution, }) => {
    const hash = getSolution(challenge, nonce);
    return hash === solution && hash.startsWith("0".repeat(difficulty) + "8");
};
exports.verifySolution = verifySolution;
