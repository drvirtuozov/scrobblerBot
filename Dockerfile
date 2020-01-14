FROM node:9-alpine

WORKDIR /opt/scrobblerbot
COPY package.json package-lock.json ./
COPY ./src ./src
RUN apk update && apk add bash
RUN npm install
EXPOSE 8443
CMD npm run watch