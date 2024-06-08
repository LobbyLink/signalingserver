FROM node:alpine
WORKDIR /usr/signalingserver
COPY package.json .
RUN npm install && npm install typescript -g
COPY . .
RUN tsc
EXPOSE 3000
CMD ["npm", "start"]