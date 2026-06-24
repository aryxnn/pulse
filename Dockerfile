FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3000

# Ensure hot reloading works inside Docker
ENV CHOKIDAR_USEPOLLING=true
# Prevent WebSocket issues in docker container for hot reloading
ENV WDS_SOCKET_PORT=0

CMD ["npm", "start"]
