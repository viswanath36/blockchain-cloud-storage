FROM node:18

WORKDIR /app

# Copy server files
COPY ./server ./server

# Copy client files
COPY ./client ./client

WORKDIR /app/server

RUN npm install

EXPOSE 5000

CMD ["node", "server.js"]
