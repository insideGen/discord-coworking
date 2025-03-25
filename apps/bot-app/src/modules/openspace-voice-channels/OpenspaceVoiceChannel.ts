import { VoiceChannel, VoiceState } from 'discord.js';

export class OpenspaceVoiceChannel
{
    private _channel: VoiceChannel | null;
    private _timeoutId: NodeJS.Timeout | null;

    public get channel(): VoiceChannel | null
    {
        return this._channel;
    }

    public constructor(channel: VoiceChannel)
    {
        this._channel = channel;
        this._timeoutId = setTimeout(this.delete.bind(this), 20_000);
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
        }
    }

    public async delete(deleteOnDiscord: boolean = true, reason?: string): Promise<void>
    {
        if (this._timeoutId != null)
        {
            clearTimeout(this._timeoutId);
            this._timeoutId = null;
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
                console.error(`[Openspace] delete: ${error}`);
            }
        }
    }
}
