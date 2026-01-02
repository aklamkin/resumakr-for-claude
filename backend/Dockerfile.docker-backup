FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN mkdir -p /app/uploads /app/logs && chown -R node:node /app
USER node
EXPOSE 3001
CMD ["node", "src/server.js"]
