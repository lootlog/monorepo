FROM node:20-alpine AS BUILD_IMAGE

RUN ln -s /usr/lib/libssl.so.3 /lib/libssl.so.3

WORKDIR /usr/src/app

ENV HUSKY=0

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm
RUN pnpm i

COPY . .

RUN pnpm exec prisma generate

RUN pnpm build

# remove development dependencies - temporary disabled
# RUN pnpm prune --prod

FROM node:20-alpine
RUN ln -s /usr/lib/libssl.so.3 /lib/libssl.so.3
WORKDIR /usr/src/app

RUN npm install -g pnpm

COPY --from=BUILD_IMAGE /usr/src/app/dist ./dist
COPY --from=BUILD_IMAGE /usr/src/app/node_modules ./node_modules
COPY --from=BUILD_IMAGE /usr/src/app/package.json ./
COPY --from=BUILD_IMAGE /usr/src/app/prisma ./prisma

EXPOSE 4000

ENTRYPOINT ["pnpm", "start:prod" ]