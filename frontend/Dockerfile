FROM node:18-alpine

WORKDIR /workspace

COPY package.json ./
RUN npm install

COPY . .

# Environment variables
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

EXPOSE 3000

# Run in development mode for easy manual changes evaluation
CMD ["npm", "run", "dev"]
