import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CategoryChannel, ChannelType, Client, DMChannel, EmbedBuilder, Events, Interaction, MessageFlags, ModalBuilder, NonThreadGuildBasedChannel, SlashCommandBuilder, TextInputBuilder, TextInputStyle, VoiceState } from 'discord.js';

import { getCommandId } from '@discord-coworking/discord-ts';
import { IDiscordAppModule } from '../index.js';
import { OpenspaceVoiceChannel } from './OpenspaceVoiceChannel.js';

export default class OpenspaceVoiceChannels implements IDiscordAppModule
{
    public readonly CATEGORY_NAME: string = '👥 OpenSpace';

    public slashCommands: SlashCommandBuilder[];

    private _interactionCommands: Map<string, (interaction: Interaction) => Promise<void>>;
    private _openspaceChannels: Map<string, OpenspaceVoiceChannel> = new Map();
    private _client: Client | null = null;

    public constructor()
    {
        this.slashCommands = [
            new SlashCommandBuilder()
                .setName('openspace')
                .setDescription('Afficher la commande de création d\'OpenSpace.'),
        ];

        this._interactionCommands = new Map(Object.entries({
            'openspace': this.replyOpenspace.bind(this),
            'openspaceEdit': this.replyOpenspaceEdit.bind(this),
            'openspaceCreate': this.replyOpenspaceCreate.bind(this),
        }));
    }

    private async replyOpenspace(interaction: Interaction): Promise<void>
    {
        if (!interaction.isChatInputCommand()) return;

        const embed = new EmbedBuilder()
            .setTitle('Salon vocal OpenSpace')
            .setDescription('Un salon vocal OpenSpace est un espace que vous créez selon vos besoins et vos envies.')
            .addFields(
                { name: 'Nom', value: 'Choisissez le nom de l\'OpenSpace.', inline: true },
                { name: 'Places', value: 'Choisissez le nombre maximum de participant.', inline: true },
                { name: '\u200B', value: '\u200B', inline: true },
            );

        const create = new ButtonBuilder()
            .setCustomId('openspaceEdit')
            .setLabel('Créer un OpenSpace')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(create);

        await interaction.reply({
            embeds: [embed],
            components: [row],
        });
    }

    private async replyOpenspaceEdit(interaction: Interaction): Promise<void>
    {
        if (!interaction.isButton()) return;

        const modal = new ModalBuilder()
            .setCustomId('openspaceCreate')
            .setTitle('Réglage de l\'OpenSpace');

        const channelNameInput = new TextInputBuilder()
            .setCustomId('channelNameInput')
            .setLabel("Nom de l\'OpenSpace :")
            .setPlaceholder('Exemple : OpenSpace')
            .setStyle(TextInputStyle.Short)
            .setMinLength(1)
            .setMaxLength(20)
            .setValue('OpenSpace')
            .setRequired(true);

        const userLimitInput = new TextInputBuilder()
            .setCustomId('userLimitInput')
            .setLabel("Nombre maximum de participant :")
            .setPlaceholder('Exemple : 4')
            .setStyle(TextInputStyle.Short)
            .setMinLength(1)
            .setMaxLength(3)
            .setValue('4')
            .setRequired(true);

        const actionRows = [
            new ActionRowBuilder<TextInputBuilder>().addComponents(channelNameInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(userLimitInput),
        ];

        modal.addComponents(actionRows);

        await interaction.showModal(modal);
    }

    private async replyOpenspaceCreate(interaction: Interaction): Promise<void>
    {
        if (!interaction.isModalSubmit()) return;

        const guild = interaction.guild;
        if (guild != null)
        {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const channelName = interaction.fields.getTextInputValue('channelNameInput');
            const userLimit = parseInt(interaction.fields.getTextInputValue('userLimitInput'));
            if (channelName.length === 0 || isNaN(userLimit) || userLimit <= 0)
            {
                await interaction.editReply({ content: `Les valeurs saisies sont incorrects, elles doivent être numérique et supérieur à zéro.\nValeurs saisies : \`${channelName}\` et \`${userLimit}\`` });
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
                    name: `👥 ${channelName}`,
                    userLimit: userLimit
                });

                this._openspaceChannels.set(channel.id, new OpenspaceVoiceChannel(channel));

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
            const pomodoroChannel = this._openspaceChannels.get(channel.id);
            if (pomodoroChannel != null)
            {
                // console.log(`[Pomodo.onChannelDelete] Delete ${channel.name} channel.`);
                pomodoroChannel.delete(false);
                this._openspaceChannels.delete(channel.id);
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
            const pomodoroChannel = this._openspaceChannels.get(oldState.channel.id);
            if (pomodoroChannel != null)
            {
                pomodoroChannel.update(oldState);
            }
        }
        if (newState.channel != null && newState.channel.isVoiceBased())
        {
            const pomodoroChannel = this._openspaceChannels.get(newState.channel.id);
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
