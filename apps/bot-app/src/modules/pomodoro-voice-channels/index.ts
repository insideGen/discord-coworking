import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, CategoryChannel, ChannelType, Client, DMChannel, EmbedBuilder, Events, Interaction, MessageFlags, ModalBuilder, NonThreadGuildBasedChannel, SlashCommandBuilder, TextInputBuilder, TextInputStyle, VoiceState } from 'discord.js';

import { getCommandId } from '@discord-coworking/discord-ts';
import { IDiscordAppModule } from '../index.js';
import { PomodoroVoiceChannel } from './PomodoroVoiceChannel.js';

export default class PomodoroVoiceChannels implements IDiscordAppModule
{
    public readonly CATEGORY_NAME: string = '🍅 Pomodoro';

    public slashCommands: SlashCommandBuilder[];

    private _interactionCommands: Map<string, (interaction: Interaction) => Promise<void>>;
    private _pomodoroChannels: Map<string, PomodoroVoiceChannel> = new Map();
    private _client: Client | null = null;

    public constructor()
    {
        this.slashCommands = [
            new SlashCommandBuilder()
                .setName('pomodoro')
                .setDescription('Afficher la commande de création de Pomodoro.'),
        ];

        this._interactionCommands = new Map(Object.entries({
            'pomodoro': this.replyPomodoro.bind(this),
            'pomodoroEdit': this.replyPomodoroEdit.bind(this),
            'pomodoroCreate': this.replyPomodoroCreate.bind(this),
        }));
    }

    private async replyPomodoro(interaction: Interaction): Promise<void>
    {
        if (!interaction.isChatInputCommand()) return;

        const embed = new EmbedBuilder()
            .setTitle('Salon vocal Pomodoro')
            .setDescription('La technique Pomodoro est une méthode de gestion du temps qui consiste à travailler de manière concentrée pendant des intervalles de 25 minutes, suivis de courtes pauses de 5 à 10 minutes.')
            .setThumbnail('attachment://pomodoro.png')
            .addFields(
                { name: 'Étape 1', value: 'Décider de la tâche à effectuer.', inline: true },
                { name: 'Étape 2', value: 'Régler le pomodoro (minuteur) sur 25 minutes.', inline: true },
                { name: 'Étape 3', value: 'Travailler sur la tâche jusqu\'à ce que le minuteur sonne.', inline: true },
                { name: 'Étape 4', value: 'Prendre une courte pause de 5 à 10 minutes.', inline: true },
                { name: 'Étape 5', value: 'Tous les quatre pomodori prendre une pause un peu plus longue de 20 à 25 minutes.', inline: true },
                { name: '\u200B', value: '\u200B', inline: true },
            );

        const file = new AttachmentBuilder('apps/bot-app/dist/assets/pomodoro.png');

        const create = new ButtonBuilder()
            .setCustomId('pomodoroEdit')
            .setLabel('Créer un Pomodoro')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(create);

        await interaction.reply({
            embeds: [embed],
            files: [file],
            components: [row],
        });
    }

    private async replyPomodoroEdit(interaction: Interaction): Promise<void>
    {
        if (!interaction.isButton()) return;

        const modal = new ModalBuilder()
            .setCustomId('pomodoroCreate')
            .setTitle('Réglage du Pomodoro');

        const workTimeInput = new TextInputBuilder()
            .setCustomId('workTimeInput')
            .setLabel("Temps de travail en minute :")
            .setPlaceholder('25')
            .setStyle(TextInputStyle.Short)
            .setMinLength(1)
            .setMaxLength(3)
            .setValue('25')
            .setRequired(true);

        const breakTimeInput = new TextInputBuilder()
            .setCustomId('breakTimeInput')
            .setLabel("Temps de pause en minute :")
            .setPlaceholder('10')
            .setStyle(TextInputStyle.Short)
            .setMinLength(1)
            .setMaxLength(3)
            .setValue('10')
            .setRequired(true);

        const userLimitInput = new TextInputBuilder()
            .setCustomId('userLimitInput')
            .setLabel("Nombre maximum de participant :")
            .setPlaceholder('4')
            .setStyle(TextInputStyle.Short)
            .setMinLength(1)
            .setMaxLength(3)
            .setValue('4')
            .setRequired(true);

        const actionRows = [
            new ActionRowBuilder<TextInputBuilder>().addComponents(workTimeInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(breakTimeInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(userLimitInput),
        ];

        modal.addComponents(actionRows);

        await interaction.showModal(modal);
    }

    private async replyPomodoroCreate(interaction: Interaction): Promise<void>
    {
        if (!interaction.isModalSubmit()) return;
        
        const guild = interaction.guild;
        if (guild != null)
        {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const workTime = parseInt(interaction.fields.getTextInputValue('workTimeInput'));
            const breakTime = parseInt(interaction.fields.getTextInputValue('breakTimeInput'));
            const userLimit = parseInt(interaction.fields.getTextInputValue('userLimitInput'));
            if (isNaN(workTime) || isNaN(breakTime) || isNaN(userLimit) || workTime <= 0 || breakTime <= 0 || userLimit <= 0)
            {
                await interaction.editReply({ content: `Les valeurs saisies sont incorrects, elles doivent être numérique et supérieur à zéro.\nValeurs saisies : \`${workTime}\`, \`${breakTime}\` et \`${userLimit}\`` });
            }
            else
            {
                let category = guild.channels.cache.find((channel): channel is CategoryChannel => channel.type === ChannelType.GuildCategory && channel.name === this.CATEGORY_NAME);
                if (category == null)
                {
                    category = await guild.channels.create({
                        type: ChannelType.GuildCategory,
                        name: this.CATEGORY_NAME,
                        position: 0
                    });
                }
                const channel = await guild.channels.create({
                    parent: category,
                    type: ChannelType.GuildVoice,
                    name: `📝 ${workTime}' / 💬 ${breakTime}'`,
                    userLimit: userLimit
                });

                this._pomodoroChannels.set(channel.id, new PomodoroVoiceChannel(channel, workTime, breakTime));

                await interaction.editReply({ content: `Voici le salon créé pour toi :\n> ${channel?.url}\nClique dessus pour le rejoindre !` });
            }
        }
    }

    private onceClientReady(readyClient: Client): void
    {
        readyClient.channels.cache.filter((channel) => channel.isVoiceBased() && channel.parent?.name === this.CATEGORY_NAME).forEach((channel) => channel.delete());
    }

    private onChannelDelete(channel: DMChannel | NonThreadGuildBasedChannel): void
    {
        if (channel.isVoiceBased())
        {
            const pomodoroChannel = this._pomodoroChannels.get(channel.id);
            if (pomodoroChannel != null)
            {
                // console.log(`[Pomodo.onChannelDelete] Delete ${channel.name} channel.`);
                pomodoroChannel.delete(false);
                this._pomodoroChannels.delete(channel.id);
            }
        }
    }

    private onInteractionCreate(interaction: Interaction): void
    {
        const commandId = getCommandId(interaction);
        if (commandId != null)
        {
            const command = this._interactionCommands.get(commandId);
            if (command != null)
            {
                command(interaction);
            }
        }
    }

    private onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): void
    {
        if (oldState.channel != null && oldState.channel.isVoiceBased() && oldState.channel.id != newState.channel?.id)
        {
            const pomodoroChannel = this._pomodoroChannels.get(oldState.channel.id);
            if (pomodoroChannel != null)
            {
                pomodoroChannel.update(oldState);
            }
        }
        if (newState.channel != null && newState.channel.isVoiceBased())
        {
            const pomodoroChannel = this._pomodoroChannels.get(newState.channel.id);
            if (pomodoroChannel != null)
            {
                pomodoroChannel.update(newState);
            }
        }
    }

    public init(client: Client): void
    {
        this._client = client;
        this._client.once(Events.ClientReady, this.onceClientReady.bind(this));
        this._client.on(Events.ChannelDelete, this.onChannelDelete.bind(this));
        this._client.on(Events.InteractionCreate, this.onInteractionCreate.bind(this));
        this._client.on(Events.VoiceStateUpdate, this.onVoiceStateUpdate.bind(this));
    }
}
