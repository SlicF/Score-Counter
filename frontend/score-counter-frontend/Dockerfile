FROM node:22-alpine
WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Set environment variables
ENV NODE_ENV=development
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true
ENV CI=true
ENV NODE_OPTIONS="--no-deprecation"

EXPOSE 3000

# Use exec form to ensure proper signal handling
CMD ["npm", "start"]