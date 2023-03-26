# MineGPT
MineGPT is a minecraft bot that responds to chat messages using the ChatGPT API. It's reccomended to give the bot administrator privileges on your server.
The bot uses the mineflayer library and as a result, occasionally errors out. I've caught common errors in the code and set the bot to automatically relog, instead of stopping execution when an error occurs. When the bot relogs, you may lose your conversation history. Otherwise, the bot can run on any microsoft or mojang account. 

## How to use

1. Install node.
2. In `MineGPT.js`, add your minecraft username and password on lines 28 & 29.
3. In `MineGPT.js`, add your ChatGPT api key to line 98.
4. In `MineGPT.js`, replace all instances of `<BOT_USERNAME>` with your minecraft username.

To run the bot: `node MineGPT.js`