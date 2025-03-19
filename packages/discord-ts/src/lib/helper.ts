import { Interaction } from 'discord.js';

export function getCommandId(interaction: Interaction): string | null
{
    let commandId: string | null = null;
    if (interaction.isChatInputCommand())
    {
        commandId = interaction.commandName;
    }
    else if (interaction.isModalSubmit())
    {
        commandId = interaction.customId;
    }
    else if (interaction.isButton())
    {
        commandId = interaction.customId;
    }
    return commandId;
}
