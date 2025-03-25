import { Client, SlashCommandBuilder } from 'discord.js';

import PomodoroVoiceChannels from './pomodoro-voice-channels/index.js';

export interface IDiscordAppModule
{
    slashCommands: SlashCommandBuilder[];

    init(client: Client): void;
}

export const modules: IDiscordAppModule[] = [
    new PomodoroVoiceChannels()
];
