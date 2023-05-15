# Use an official Node.js runtime as a parent image
FROM node:16-alpine

# Set the working directory to /app
WORKDIR /app

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install app dependencies
RUN npm install
RUN npm install -g nodemon

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port that the app listens on
EXPOSE 3000

# Define the command that starts the app
CMD [ "npm", "start" ]
