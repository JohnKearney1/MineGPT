# [MineGPT](https://github.com/JohnKearney1/MineGPT)
MineGPT is a minecraft bot that responds to chat messages using the ChatGPT API. It's reccomended to put the bot in creative or spectator mode. You cannot play on the account you are running the bot on while it is running. As such, this is best for alt accounts on private servers.

MineGPT uses the account of the user and requires a minecraft (Java Edition) account and a valid OpenAI API key. MineGPT will alert you if your OpenAPI key is invalid or expired.

All chats sent in the game *that are **not** commands* are sent to ChatGPT for a response. The response is printed in game & the chat is recorded in the console along with some basic debug info if neccecary.

## How to use

1. Install node.
2. Navigate to the MineGPT directory in your command prompt, terminal or IDE.
3. Install the dependencies: `npm install`
4. Configure your account info: in *`config.json`* Add the server ip, account information, and openAI API key. (More below if you're confused!)
5. Run the bot: `node MineGPT.js`


## Commands

All commands are sent as ingame chats to the bot, andoverride the ChatGPT functionality to preform some other task. All commands begin with the prefix `!`.

- !help -> Shows a list of commands
- !follow -> Follows the nearest entity until stopped
- !come -> Come to the location of the requesting player (when in render distance)
- !stop -> Stops the bot from moving
- !sleep -> Makes the bot use a bed (if there is one nearby)
- !wake -> Rouses the bot from it's sleep


## Setting up `config.json`

The default config.json looks like this:

```
{
    "host": "your-server-ip-address-here",
    "port": 25565,
    "version": "1.19.3",
    "auth": "microsoft",
    "username": "your-minecraft-email-here",
    "password": "your-minecraft-password-here",
    "openAI" : "your-openAI-api-key"
}
```
- Host: The IP address of the server to connect to (or localhost) without the port number  
- Port: The port your server is running on. No quotation marks. 25565 is the default.
- Version: I've only tested with major version releases. Confirmed works up to 1.19.4.
- Auth: `minecraft` or `mojang` depending on how you login to your account. (mojang is depreciated)  
- Username: The email or username you use to login to your Minecraft Account
- Password: The password you use to login to your Minecraft Account
- OpenAI: Your OpenAI API key. You can obtain one from [platform.openai.com](https://platform.openai.com/account/api-keys).
