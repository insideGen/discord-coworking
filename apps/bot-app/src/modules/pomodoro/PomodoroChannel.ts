import { VoiceChannel, VoiceState } from 'discord.js';

import { NotificationManager, NotificationSound } from './NotificationManager.js';

export enum PomodoroChannelMode
{
    Work = 'Work',
    Break = 'Break',
}

export class PomodoroChannel
{
    private _channel: VoiceChannel | null;
    private _workTime: number;
    private _breakTime: number;
    private _currentMode: PomodoroChannelMode;
    private _timeLeft: number;
    private _timeoutId: NodeJS.Timeout | null;
    private _intervalId: NodeJS.Timeout | null = null;

    public get channel(): VoiceChannel | null
    {
        return this._channel;
    }

    public get workTime(): number
    {
        return this._workTime;
    }
    public set workTime(value: number)
    {
        this._workTime = value;
    }

    public get breakTime(): number
    {
        return this._breakTime;
    }
    public set breakTime(value: number)
    {
        this._breakTime = value;
    }

    public get currentMode(): PomodoroChannelMode
    {
        return this._currentMode;
    }

    public get mute(): boolean
    {
        return this._currentMode === PomodoroChannelMode.Work;
    }

    public get timeLeft(): number
    {
        return this._timeLeft;
    }

    public get started(): boolean
    {
        return this._intervalId != null;
    }

    public constructor(channel: VoiceChannel, workTime: number, breakTime: number)
    {
        this._channel = channel;
        this._workTime = workTime;
        this._breakTime = breakTime;
        this._currentMode = PomodoroChannelMode.Break;
        this._timeLeft = this._breakTime;
        this._timeoutId = setTimeout(this.delete.bind(this), 10_000);
        this.start();
    }

    private async _tick(): Promise<void>
    {
        if (this._channel == null)
        {
            this.delete();
            return;
        }
        if (this.started)
        {
            if (this._timeLeft <= 0)
            {
                if (this._currentMode !== PomodoroChannelMode.Break)
                {
                    this._currentMode = PomodoroChannelMode.Break;
                    this._timeLeft = this._breakTime;
                }
                else
                {
                    this._currentMode = PomodoroChannelMode.Work;
                    this._timeLeft = this._workTime;
                }

                this.stop();
                await NotificationManager.notify(this._channel, NotificationSound.Work);
                this.start();

                if (this._channel != null)
                {
                    this._channel.members.filter((member) => member.user.bot === false).forEach(async (member): Promise<void> =>
                    {
                        try
                        {
                            if (member.voice.channel != null && member.voice.mute != null && member.voice.mute !== this.mute)
                            {
                                await member.voice.setMute(this.mute);
                            }
                        }
                        catch (error)
                        {
                            console.error(`[Pomodoro] setMute: ${error}`);
                        }
                    });
                }
            }
            this._timeLeft -= 1;
        }
    }

    public start(): void
    {
        if (this._timeoutId != null)
        {
            clearTimeout(this._timeoutId);
            this._timeoutId = null;
        }
        if (this._intervalId != null)
        {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
        this._intervalId = setInterval(this._tick.bind(this), 1_000);
    }

    public stop(): void
    {
        if (this._intervalId != null)
        {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    }

    public async update(voiceState: VoiceState): Promise<void>
    {
        if (this._channel != null && voiceState.channel != null && voiceState.member != null && voiceState.member.user.bot === false)
        {
            const memberCount = voiceState.channel.members.filter((member) => member.user.bot === false).size;
            if (memberCount <= 0)
            {
                this.delete(true, 'Empty voice channel');
            }
            else if (voiceState.mute != null)
            {
                if (this.started === false)
                {
                    this.start();
                }
                try
                {
                    if (voiceState.mute !== this.mute)
                    {
                        await voiceState.setMute(this.mute);
                    }
                }
                catch (error)
                {
                    console.error(`[Pomodoro] setMute: ${error}`);
                }
            }
        }
    }

    public async delete(deleteOnDiscord: boolean = true, reason?: string): Promise<void>
    {
        if (this._timeoutId != null)
        {
            clearTimeout(this._timeoutId);
            this._timeoutId = null;
        }
        if (this._intervalId != null)
        {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
        if (deleteOnDiscord && this._channel != null)
        {
            const channel = this._channel;
            this._channel = null;
            try
            {
                await channel.delete(reason);
            }
            catch (error)
            {
                console.error(`[Pomodoro] delete: ${error}`);
            }
        }
    }
}
