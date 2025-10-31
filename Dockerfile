# Use Node
FROM node:22-alpine

# Create app directory
WORKDIR /app

# Copy backend package files and install dependencies
COPY backend/package*.json ./
RUN npm install

# Copy backend and frontend code
COPY backend/ . 
COPY frontend/ ./public/

# Expose port (backend + frontend served from same Express server)
EXPOSE 3000

# Start backend server (serves frontend too)
CMD ["node", "server.js"]
