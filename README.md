```sh
pnpx create-nx-workspace --name discord-coworking --packageManager pnpm

# https://nx.dev/nx-api/node
pnpx nx add @nx/node
pnpx nx generate @nx/node:application apps/discord-app
pnpx nx generate @nx/node:lib packages/discord-ts
```
