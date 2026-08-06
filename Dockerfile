# --- Stage 1: Build ---
FROM node:22-alpine AS builder
WORKDIR /app

# Instala dependências básicas para building se necessário
RUN apk add --no-cache libc6-compat

# Copia arquivos de dependências
COPY package.json package-lock.json* ./

# Instala dependências de forma otimizada
RUN npm ci

# Copia o código da aplicação
COPY . .

# Instrui o Vite/Nitro a gerar a build de servidor Node.js
ENV NITRO_PRESET=node-server
RUN npm run build

# Remove pacotes de desenvolvimento para reduzir o tamanho da imagem
RUN npm prune --production

# --- Stage 2: Runner ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copia apenas o necessário do estágio de build
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.output ./.output

EXPOSE 3000

# Inicia o servidor compilado do TanStack Start
CMD ["node", ".output/server/index.mjs"]