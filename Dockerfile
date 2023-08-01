FROM node:18-alpine

WORKDIR /tezos-faucet-backend

RUN chown node:node /tezos-faucet-backend

USER node

COPY --chown=node:node package.json ./
COPY --chown=node:node package-lock.json ./

RUN npm install

COPY --chown=node:node . ./

RUN ./node_modules/typescript/bin/tsc

CMD ["node", "./dist/api.js"]
