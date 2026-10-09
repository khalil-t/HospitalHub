# ---------- Build Stage ----------
FROM node:18 AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig*.json ./
RUN npm install

# Copy the entire backend source
COPY . .

# Build the project (TypeScript → JavaScript)
RUN npm run build

# ---------- Production Stage ----------
FROM node:18
WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

# Copy compiled dist from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3002

CMD ["node", "dist/main.js"]
