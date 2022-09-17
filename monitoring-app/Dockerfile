FROM node:17-alpine3.12 AS installer
ENV NODE_VERSION 17.1.0

RUN mkdir /app
WORKDIR /app

COPY package.json /app/
COPY settings.json /app/

RUN npm install

FROM node:17-alpine3.12

RUN mkdir /app
WORKDIR /app

COPY bot.js /app

COPY --from=installer /app/package.json .
COPY --from=installer /app/settings.json .
COPY --from=installer /app/node_modules ./node_modules

EXPOSE 8080
CMD "npm" "start"
