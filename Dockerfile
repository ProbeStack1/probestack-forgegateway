# syntax=docker/dockerfile:1
# ---------- Build stage ----------
FROM node:20-alpine AS build

WORKDIR /app

# .npmrc copied explicitly — it doesn't match the package*.json glob, and
# without it npm install falls back to public npm, which doesn't have
# @probestack/probestack-ui-library.
COPY package*.json .npmrc ./
RUN --mount=type=secret,id=google_artifact_token \
    export GOOGLE_ARTIFACT_TOKEN="$(cat /run/secrets/google_artifact_token)" && npm install

COPY . .
ENV CI=false
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
