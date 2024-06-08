FROM node:alpine
WORKDIR /usr/src/app
COPY . .
RUN npm install
RUN tsc
EXPOSE 3000
CMD ["npm", "start"]