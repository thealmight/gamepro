# Use Node.js 18 as the base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json for the server
COPY server/package*.json ./

# Install server dependencies
RUN npm ci --only=production

# Copy the rest of the server code
COPY server/ .

# Expose the port the app runs on
EXPOSE 4000

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Start the application
CMD ["npm", "start"]
