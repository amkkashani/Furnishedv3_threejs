# Stage 1: Build the application
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application source code
COPY . .

# Run the build command
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:stable-alpine

# Copy the build output from the 'builder' stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy the custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (Nginx's default port inside the container)
EXPOSE 80

# The command to start Nginx when the container launches
CMD ["nginx", "-g", "daemon off;"]