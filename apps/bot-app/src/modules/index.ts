import { Client, SlashCommandBuilder } from 'discord.js';

import OpenspaceVoiceChannels from './openspace-voice-channels/index.js';
import PomodoroVoiceChannels from './pomodoro-voice-channels/index.js';

export interface IDiscordAppModule
{
    slashCommands: SlashCommandBuilder[];

    init(client: Client): void;
}

export const modules: IDiscordAppModule[] = [
    new OpenspaceVoiceChannels(),
    new PomodoroVoiceChannels(),
];
