FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the code
COPY . .

# Build the TypeScript code
RUN npm run build

# Expose the API port
EXPOSE 3000

# Start the application with auto-migration
CMD ["sh", "-c", "npm run db:push && npm start"]
