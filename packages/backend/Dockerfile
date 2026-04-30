FROM node:18-alpine

WORKDIR /usr/src/app

COPY package.json ./
RUN npm install --omit=dev

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/src/server.js"]
