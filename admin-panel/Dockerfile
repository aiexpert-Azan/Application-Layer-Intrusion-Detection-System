# ---- Build stage: compile the React app into static files ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite bakes these in at BUILD time. They default to the live Render backend,
# and compose overrides them to point at the local backend container.
ARG VITE_API_URL=https://application-layer-intrusion-detection.onrender.com
ARG VITE_WS_URL=wss://application-layer-intrusion-detection.onrender.com
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN npm run build

# ---- Serve stage: tiny nginx image holding only the built files ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
