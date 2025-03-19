import { Client, SlashCommandBuilder } from 'discord.js';

import Pomodoro from './pomodoro/index.js';

export interface IDiscordAppModule
{
    slashCommands: SlashCommandBuilder[];

    init(client: Client): void;
}

export const modules: IDiscordAppModule[] = [
    new Pomodoro()
];
