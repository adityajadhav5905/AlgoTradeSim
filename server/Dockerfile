# Use a production-ready slim Node.js LTS image
FROM node:20-slim

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to leverage Docker layer cache
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy the rest of the application files
COPY . .

# Expose the default port (Railway binds to PORT environment variable dynamically)
EXPOSE 5000

# Start the Node.js application
CMD ["npm", "start"]
