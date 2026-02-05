# ---------- STAGE 1: Build (Node) ----------
FROM node:20-alpine AS build

# Radni direktorij unutar imagea
WORKDIR /app

# Kopiraj package fajlove i instaliraj ovisnosti
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

RUN \
  if [ -f yarn.lock ]; then yarn install --frozen-lockfile --legacy-peer-deps; \
  elif [ -f package-lock.json ]; then npm ci --legacy-peer-deps; \
  else npm install --legacy-peer-deps; \
  fi


# Build arg za backend URL (dolazi iz docker-compose.yml)
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}

# Kopiraj ostatak frontenda i napravi prod build
COPY . .
RUN npm run build || yarn build

# ---------- STAGE 2: Runtime (NGINX) ----------
FROM nginx:alpine

# Kopiraj buildani React app iz prethodnog stagea
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

