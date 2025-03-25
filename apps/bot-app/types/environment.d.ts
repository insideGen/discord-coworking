export { };

declare global
{
    namespace NodeJS
    {
        interface ProcessEnv
        {
            [key: string]: string | undefined;
            DISCORD_CLIENT_ID: string | undefined;
            DISCORD_TOKEN: string | undefined;
            DISCORD_GUILD: string | undefined;
        }
    }
}
