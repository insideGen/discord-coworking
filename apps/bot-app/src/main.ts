import { Client, Events, GatewayIntentBits, Interaction, InteractionType, REST, Routes } from 'discord.js';
import { getCommandId } from '@discord-coworking/discord-ts';
import { modules } from './modules/index.js';

const rest = new REST().setToken(process.env.DISCORD_TOKEN ?? '');
const slashCommands = modules.flatMap((module) => module.slashCommands);

try
{
    console.log(`Started refreshing ${slashCommands.length} application (/) commands.`);
    const data: any = await rest.put(
        Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID ?? '', process.env.DISCORD_GUILD ?? ''),
        { body: slashCommands.map((value) => value.toJSON()) },
    );
    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
}
catch (error)
{
    console.error(error);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

client.once(Events.ClientReady, (readyClient): void =>
{
    console.log(`Logged in as ${readyClient.user.tag}!`);
});

client.on(Events.InteractionCreate, (interaction: Interaction): void =>
{
    const commandId = getCommandId(interaction);
    console.log(`[Main.Interaction] ${InteractionType[interaction.type]}: ${commandId}`);
});

client.rest.on('rateLimited', (rateLimitInfo): void =>
{
    console.log(`[Main.REST] RateLimited ${JSON.stringify(rateLimitInfo)}`);
});

try
{
    modules.forEach((module) => module.init(client));
    await client.login(process.env.DISCORD_TOKEN ?? '');
}
catch (error)
{
    console.log(error);
}
