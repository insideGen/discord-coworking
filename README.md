# Projet Discord Coworking

## Environnement

Il est recommandé d'utiliser le container de développement inclus dans `.devcontainer/` à l'aide de Docker Desktop.

*Consultez https://containers.dev/ pour plus d'information au sujet des containers de développement.*

## Démarrage

Exécutez la commande suivante pour installer les dépendances :

```sh
pnpm install
```

## Applications

- [bot-app](apps/bot-app/)

## Mémo

### Commandes Nx utilisées pour la création de l'espace de travail

```sh
pnpx create-nx-workspace --name discord-coworking --packageManager pnpm

# https://nx.dev/nx-api/node
pnpx nx add @nx/node
pnpx nx generate @nx/node:application apps/bot-app
pnpx nx generate @nx/node:lib packages/discord-ts

pnpm add @discord-coworking/discord-ts --workspace

pnpx nx generate @nx/node:setup-docker

pnpx nx docker-build @discord-coworking/bot-app
```
