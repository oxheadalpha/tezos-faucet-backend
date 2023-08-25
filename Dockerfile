FROM node:18-alpine

USER node

WORKDIR /app

RUN chown node:node /app

COPY --chown=node:node package.json ./
COPY --chown=node:node package-lock.json ./

RUN npm install

COPY --chown=node:node . ./

RUN ./node_modules/typescript/bin/tsc

CMD ["node", "--enable-source-maps", "./dist/src/api.js"]
