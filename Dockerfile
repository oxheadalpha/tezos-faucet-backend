FROM node:18-alpine

USER node

WORKDIR /tezos-faucet-backend

RUN chown node:node /tezos-faucet-backend

COPY --chown=node:node package.json ./
COPY --chown=node:node package-lock.json ./

RUN npm install

COPY --chown=node:node . ./

RUN ./node_modules/typescript/bin/tsc

CMD ["node", "--enable-source-maps", "./dist/api.js"]
