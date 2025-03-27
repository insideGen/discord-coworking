# Build the docker image with `pnpx nx docker-build @discord-coworking/bot-app`.
# https://pnpm.io/fr/docker

# BASE
FROM docker.io/node:lts-alpine AS base

RUN apk update && \
    apk upgrade

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable


# BUILDER
FROM base AS builder

WORKDIR /docker/src/

COPY . .

RUN --mount=type=cache,id=pnpm,target=/pnpm/store/ \
    pnpm install --frozen-lockfile

RUN pnpx nx run @discord-coworking/bot-app:build

RUN pnpm --filter=bot-app deploy --prod /docker/dist/


# RUNNER
FROM base AS runner

RUN apk add --no-cache \
        ffmpeg

WORKDIR /docker/app/

COPY --from=builder /docker/dist/ .

CMD [ "dist/main.js" ]
