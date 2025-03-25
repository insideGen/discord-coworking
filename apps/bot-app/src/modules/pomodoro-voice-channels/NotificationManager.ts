import EventEmitter from 'node:events';
import { VoiceChannel } from 'discord.js';
import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, getVoiceConnection, joinVoiceChannel, VoiceConnectionState, VoiceConnectionStatus } from '@discordjs/voice';

export enum NotificationSound
{
    Work = 'apps/bot-app/dist/assets/notification.wav',
    Break = 'apps/bot-app/dist/assets/notification.wav',
}

export class VoiceNotification extends EventEmitter<{ finished: []; }>
{
    public readonly voiceChannel: VoiceChannel;
    public readonly notificationSound: NotificationSound;
    public readonly audioPlayer: AudioPlayer;

    public constructor(voiceChannel: VoiceChannel, notificationSound: NotificationSound)
    {
        super();
        this.voiceChannel = voiceChannel;
        this.notificationSound = notificationSound;
        this.audioPlayer = createAudioPlayer();
        this.audioPlayer.on('stateChange', (oldState, newState) =>
        {
            if (newState.status === AudioPlayerStatus.AutoPaused || newState.status === AudioPlayerStatus.Idle)
            {
                this.emit('finished');
            }
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
            let voiceConnection = getVoiceConnection(voiceNotification.voiceChannel.guild.id);
            if (voiceConnection == null || voiceConnection.state.status !== VoiceConnectionStatus.Ready)
            {
                voiceConnection = joinVoiceChannel({
                    adapterCreator: voiceNotification.voiceChannel.guild.voiceAdapterCreator,
                    guildId: voiceNotification.voiceChannel.guild.id,
                    channelId: voiceNotification.voiceChannel.id
                });
            }
            const onStateChange = (oldState: VoiceConnectionState, newState: VoiceConnectionState): void =>
            {
                if (newState.status === VoiceConnectionStatus.Ready)
                {
                    voiceConnection.off('stateChange', onStateChange);
                    const playerSubscription = voiceConnection.subscribe(voiceNotification.audioPlayer);
                    const resource = createAudioResource(voiceNotification.notificationSound.toString());
                    voiceNotification.audioPlayer.on('stateChange', (oldState, newState) =>
                    {
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
                    voiceNotification.audioPlayer.play(resource);
                }
            };
            voiceConnection.on('stateChange', onStateChange);
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
