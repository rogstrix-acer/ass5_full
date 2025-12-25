# Base image
FROM node:18-alpine

# Working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 8000

# Start server
CMD ["npm", "run", "start:prod"]
