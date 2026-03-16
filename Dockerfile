FROM node:24-alpine AS builder
WORKDIR /app
RUN apk update && apk add build-base python3 sqlite-dev sqlite sqlite-libs
COPY package.json pnpm-lock.yaml .
RUN npm i -g corepack@latest && \
    pnpm install --frozen-lockfile
COPY . .

RUN pnpm prisma generate
RUN pnpm build

RUN pnpm prune --prod

FROM node:24-alpine AS runner

WORKDIR /app

RUN npm i -g corepack@latest

COPY --from="builder" /app/dist /app/dist
COPY --from="builder" /app/package.json /app/package.json
COPY --from="builder" /app/pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --from="builder" /app/node_modules /app/node_modules
COPY --from="builder" /app/prisma /app/prisma

RUN pnpm prisma generate

ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["pnpm","docker:start"]
