FROM node:alpine

WORKDIR /tezos-faucet-backend

COPY package.json .

RUN npm install

COPY . .

RUN ./node_modules/typescript/bin/tsc -p ./tsconfig.json

CMD ["node", "./dist/api.js"]