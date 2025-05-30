# Use the official Node.js image as the base image
FROM node:24-slim
LABEL authors="nodiryuldashev"

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the application dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Build the NestJS application
RUN npm run build

# Expose the application port
EXPOSE 3000

## Command to run the application
ENV NODE_ENV=production
CMD ["node", "dist/src/main"]
