FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY ../../SmartPharmacy/backend .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps
COPY --from=builder /app/dist ./dist
COPY .env ./.env
EXPOSE 3002
CMD ["node", "dist/index.js"]
