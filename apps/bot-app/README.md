# Bot App

## Configuration

Dupliquez le fichier `.env.example` en `.env` et complétez son contenu :

```sh
# DISCORD
DISCORD_CLIENT_ID=
DISCORD_TOKEN=
DISCORD_GUILD=
```

## Utilisation

Exécutez la commande suivante pour lancer le bot :

```sh
pnpm exec nx run @discord-coworking/bot-app:serve
```

## Modules

- [openspace-voice-channels](src/modules/openspace-voice-channels)
- [pomodoro-voice-channels](src/modules/pomodoro-voice-channels)
