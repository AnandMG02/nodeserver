# Use the official Node.js image as the parent image
FROM node:latest

# Set the working directory to /app
WORKDIR /app

# Copy the package.json and package-lock.json files to the container
COPY C:/REDHAT HACKATHON/nodejs/package*.json ./

# Install the dependencies
RUN npm install

# Copy the rest of the application code to the container
COPY C:/REDHAT HACKATHON/nodejs/ ./

# Expose port 3000 for the Node.js application
EXPOSE 3000

# Start the Node.js application
CMD ["npm", "start"]
