import path from 'node:path';
import { EventEmitter } from 'node:events';
import { VoiceChannel } from 'discord.js';
import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, getVoiceConnection, joinVoiceChannel, VoiceConnectionState, VoiceConnectionStatus } from '@discordjs/voice';

export enum NotificationSound
{
    Work = 'assets/notification.wav',
    Break = 'assets/notification.wav',
}

export interface VoiceNotificationEvents
{
    finished: [];
}

export class VoiceNotification extends EventEmitter<VoiceNotificationEvents>
{
    public readonly channel: VoiceChannel;
    public readonly resourcePath: string;
    public readonly player: AudioPlayer;

    public constructor(voiceChannel: VoiceChannel, notificationSound: NotificationSound)
    {
        super();
        this.channel = voiceChannel;
        this.resourcePath = path.join(import.meta.dirname, notificationSound.toString());
        this.player = createAudioPlayer();
        this.player.on('stateChange', (oldState, newState) =>
        {
            if (newState.status === AudioPlayerStatus.AutoPaused || newState.status === AudioPlayerStatus.Idle)
            {
                this.emit('finished');
            }
        });
        this.player.on('error', (error) =>
        {
            console.error(`[VoiceNotification] AudioPlayer: ${error.message}`);
        });
    }
};

export class NotificationManager
{
    private static _queue: Array<VoiceNotification> = [];
    private static _busy: boolean = false;

    private static _processing(force: boolean = false): void
    {
        if (NotificationManager._busy && !force) return;

        NotificationManager._busy = true;

        const voiceNotification = NotificationManager._queue.shift();
        if (voiceNotification != null)
        {
            let voiceConnection = getVoiceConnection(voiceNotification.channel.guild.id);
            if (voiceConnection == null || voiceConnection.state.status !== VoiceConnectionStatus.Ready)
            {
                voiceConnection = joinVoiceChannel({
                    adapterCreator: voiceNotification.channel.guild.voiceAdapterCreator,
                    guildId: voiceNotification.channel.guild.id,
                    channelId: voiceNotification.channel.id
                });
            }
            const onStateChange = (oldState: VoiceConnectionState, newState: VoiceConnectionState): void =>
            {
                console.log(`[NotificationManager] VoiceConnectionState: ${oldState.status} -> ${newState.status}`);
                if (newState.status === VoiceConnectionStatus.Ready)
                {
                    voiceConnection.off('stateChange', onStateChange);
                    voiceConnection.off('error', onError);
                    const playerSubscription = voiceConnection.subscribe(voiceNotification.player);
                    const resource = createAudioResource(voiceNotification.resourcePath);
                    voiceNotification.player.on('stateChange', (oldState, newState) =>
                    {
                        console.log(`[NotificationManager] AudioPlayerState: ${oldState.status} -> ${newState.status}`);
                        if (newState.status === AudioPlayerStatus.AutoPaused || newState.status === AudioPlayerStatus.Idle)
                        {
                            playerSubscription?.unsubscribe();
                            voiceConnection.disconnect();
                            if (NotificationManager._queue.length > 0)
                            {
                                NotificationManager._processing(true);
                            }
                            else
                            {
                                NotificationManager._busy = false;
                            }
                        }
                    });
                    voiceNotification.player.play(resource);
                }
            };
            const onError = (error: Error) =>
            {
                console.error(`[NotificationManager] VoiceConnection: ${error.message}`);
            };
            voiceConnection.on('stateChange', onStateChange);
            voiceConnection.on('error', onError);
        }
    }

    public static async notify(voiceChannel: VoiceChannel, notificationSound: NotificationSound): Promise<void>
    {
        const voiceNotification = new VoiceNotification(voiceChannel, notificationSound);
        const next = new Promise<void>((resolve, reject) => voiceNotification.on('finished', resolve));
        NotificationManager._queue.push(voiceNotification);
        NotificationManager._processing();
        return next;
    }
}
