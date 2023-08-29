/*
* MineGPT v3.0
* Description: This is a reference for a mineflayer bot with ChatGPT connectivity and a few additional features.
*/

// Import the required libraries
require('dotenv').config();
const fetch = require('node-fetch');
const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals: { GoalNear, GoalFollow, GoalBlock } } = require('mineflayer-pathfinder')
const autoeat = require('mineflayer-auto-eat').plugin
const pvp = require('mineflayer-pvp').plugin

// Run the bot (Main entry point)
// Log the initialization
log("Initializing MineGPT")

// ENV Variables
const mineflayerConfig = {
    host: process.env.MINEGPT_HOST,
    port: process.env.MINEGPT_PORT,
    version: process.env.MINEGPT_VERSION,
    auth: process.env.MINEGPT_AUTH,
    username: process.env.MINEGPT_USERNAME,
    password: process.env.MINEGPT_PASSWORD,
    logErrors: false,
    respawn: true,
    viewDistance: 'far',
    disableChatSigning: true
}

let bot = null;

/*
* Creates the bot
*/
function createBot(){
    try{
        bot = mineflayer.createBot(mineflayerConfig)
        log("Bot created!")
    }
    catch(err){
        log(`Error: ${err}`)
        log("Retrying in 10 seconds...")
        setTimeout(() => {
            bot = mineflayer.createBot(mineflayerConfig)
        }, 10000)
    }
}

// Create the bot
createBot()

// Load plugins
bot.loadPlugin(pathfinder)
bot.loadPlugin(autoeat)
bot.loadPlugin(pvp)

// Add event listeners
bot.on('chat', async (username, msg) => {handleChat(msg, username)})
bot.on('physicsTick', async () => {lookAtPlayer()})
bot.on('kicked', async () => {log("Kicked!")})
bot.on('error', async (err) => {log(`Error: ${err}`)})
bot.on('end', createBot)
bot.on('respawn', async () => {log(`Respawned at ${bot.entity.position}`)})

bot.on('sleep', () => {
    bot.chat('Good night!')
})

bot.on('wake', () => {
    bot.chat('Good morning!')
})

bot.on('stoppedAttacking', () => {
    if (guardPos) {
      moveToGuardPos()
    }
})

bot.once('spawn', () => {
    bot.autoEat.options = {
      priority: 'foodPoints',
      startAt: 18,
      bannedFood: []
    }
})

bot.on('autoeat_started', () => {
    console.log('Auto Eat started!')
})
  
bot.on('autoeat_stopped', () => {
    console.log('Auto Eat stopped!')
})

bot.on('health', () => {
    if (bot.food === 20) bot.autoEat.disable()
    // Disable the plugin if the bot is at 20 food points
    else bot.autoEat.enable() // Else enable the plugin again
})

// call the logInfo function every 15 seconds
setInterval(() => {
    logInfo()
}, 15000)


/*
* Log a message to the console
* @param message - the message to log
*/
function log(message){
    console.log(`[ MineGPT.js ] ${message}`)
}

/*
* Log a bunch of info about the bot
*/
function logInfo(){
    // Get a bunch of info about the bot, like coordinates (xyz), health, food, etc.
    const { health, food, username } = bot
    // Log that info
    log(`Health: ${health} | Food: ${food} | Username: ${username}`)
}

/*
* Look at the nearest player
*/
function lookAtPlayer() {
    // Get the nearest player
    const playerFilter = (entity) => entity.type === 'player'
    const playerEntity = bot.nearestEntity(playerFilter)

    // If there is a player then look at them
    if (playerEntity) {
        const pos = playerEntity.position.offset(0, playerEntity.height, 0)
        bot.lookAt(pos)
    }
}

/*
* Get an item by its name
* @param args -
* argv[0] - the name of the item
* argv[1] - the destination to equip the item to
*/
async function equipItem (args, username) {
    // if the first or second arg isn't provided, see if the bot has any items in its inventory
    if (!args) {
        const items = bot.inventory.items()
        if (items.length === 0) {
            messagePlayer(`I have no items to equip, sorry!`, username)
            return
        }
        args = items[0].name
        // Equip the item
        try {
            await bot.equip(items[0], 'hand')
            messagePlayer(`equipped ${args}`, username)
            return;
        } catch (err) {
            messagePlayer(`cannot equip ${args}: ${err.message}`, username)
            return;
        }
    }

    // get the item if it is provided
    const name = args.split(" ")[0]
    const destination = args.split(" ")[1]
    const item = bot.inventory.items().find(item => item.name.includes(name))
    if (item) {
      try {
        await bot.equip(item, destination)
        messagePlayer(`equipped ${name}`, username)
      } catch (err) {
        messagePlayer(`cannot equip ${name}: ${err.message}`, username)
      }
    } else {
      messagePlayer(`I have no ${name}`, username)
    }
}

/*
* Send a message to a player
* @param msg - the message to send
* @param username - the username of the player to send the message to
*/
function messagePlayer(msg, username){
    // Use the syntax `/w <username> <message>`
    bot.chat(`/w ${username} ${msg}`)
}

/*
* Handle chat messages
* @param msg - the message sent by the player
* @param username - the username of the player who sent the message
*/
function handleChat(msg, username){

    // Log the message
    log(`<${username}> => ${msg}`)

    // Ensure the bot doesn't respond to itself
    if (username === bot.username) return;

    // if the message begins with an '!' then it is a command
    if (msg.startsWith('!')) return handleCommand(msg, username, bot);  

    // Ask ChatGPT a question if the bot is not paused
    if (!pauseChat) askChatGPT(msg);
}

/*
* Drop an item stack
* @param username - the username of the player who sent the command
* @param args - the item to drop
*/
async function dropStack(username, args = null) {

    // The item is the first arg (if there is one)
    let item = args ? bot.inventory.items().find(item => item.name.includes(args)) : null

    // If there was an argument provided, but the bot doesnt have that item, then send a message to the player
    if (args && !item) {
        messagePlayer(`I don't have any ${args} to give you, sorry!`, username, bot)
    }

    // If no item is specified, or the item isnt in the inventory, and the bot has items in its inventory, then drop the first item
    if (!item && bot.inventory.items().length > 0) {
        item = bot.inventory.items()[0]
    }

    // If the bot has no items in its inventory, then send a message to the player
    if (!item) {
        messagePlayer(`I don't have any items to give you, sorry!`, username, bot)
        return
    }

    // Drop the item
    await bot.tossStack(item, (err) => {
      if (err) {
        messagePlayer(`I don't have any ${item.name} to give you, sorry!`, username, bot)
        console.log(err)
      } else {
        log(`Dropped ${item.name}`)
      }
    })

    messagePlayer(`Here's a ${item.name}, ${username}!`, username, bot)
}

let pauseChat = false;

/*
* Handle commands with the '!' prefix
* @param msg - the message sent by the player
* @param username - the username of the player who sent the message
*/
function handleCommand(msg, username){
    // Remove the '!' from the message
    msg = msg.substring(1);

    // Split the message into an array of words
    const msgArray = msg.split(" ");

    // Get the command
    const command = msgArray[0];

    // Get arguments
    const args = msgArray.slice(1).join(" ");

    // Log the command
    log(`Command: ${command} | Args: ${args}`)

    // Handle the command
    switch(command){
        case "sleep":
            goToSleep();
            break;
        case "wake":
            wakeUp();
            break;
        case "goto":
            walkTo(args, username);
            break;
        case "togglechat":
            pauseChat = !pauseChat;
            bot.chat(`Conversation is now ${pauseChat ? "paused" : "unpaused"}.`);
            break;
        case "newchat":
            messages = [];
            bot.chat("I've forgotten everything you've said to me! Start a new conversation with me anytime!");
            break;
        case "follow":
            followPlayer(args, username);
            break;
        case "equip":
            equipItem(args, username);
            break;
        case "drop":
            dropStack(username, args);  
            break;
        case "prompt":
            promptGPT(args, username);
            break;
        case "help":
            bot.chat("Commands (1): !sleep, !wake, !newchat,\n"+ 
            "Commands (2): goto <username> || <x> <y> <z>\n" +
            "Commands (3): !follow <stop|player>? <username>?," + 
            "Commands (4): !togglechat, !drop, !help" + 
            "Commands (5): !prompt <pirate|doctor|cowboy|robot|alien|lore>" +
            "Commands (6): !equip, !equip <item> <hand|head|torso|legs|feet|off-hand>");
            break;
        default:
            bot.chat("Command not found. Type !help for a list of commands.");
            break;
    }
}

/*
* Prompt ChatGPT with a prompt
* @param args - the character to prompt with
* @param username - the username of the player who sent the command
*/
async function promptGPT(args){
    // only the first word of the args is used as the prompt
    // depending on the word provided, we will supply chatGPT with a different prompt
    const prompt = args.split(" ")[0];

    // if no arg is provided, then return with a chat
    if (!prompt){
        bot.chat("Please provide a role!");
        return;
    }

    let promptText = "";

    // if the prompt is "pirate" then use the pirate prompt
    if (prompt === "pirate"){
        promptText = "You are a minecraft bot named MineGPT. Only use pirate language (old english esq, first person) when talking to me from now on.";
    }

    // if the prompt is "doctor" then use the doctor prompt
    else if (prompt === "doctor"){
        promptText = "You are a minecraft bot named MineGPT. Only use doctor language (medical esq, first person) when talking to me from now on.";
    }

    // if the prompt is "cowboy" then use the cowboy prompt
    else if (prompt === "cowboy"){
        promptText = "You are a minecraft bot named MineGPT. Only use cowboy language (western esq, first person) when talking to me from now on.";
    }

    // if the prompt is "robot" then use the robot prompt
    else if (prompt === "robot"){
        promptText = "You are a minecraft bot named MineGPT. Only use robot language (computer esq, first person) when talking to me from now on.";
    }

    // if the prompt is "alien" then use the alien prompt
    else if (prompt === "alien"){
        promptText = "You are a minecraft bot named MineGPT. Only use alien language (alien esq, first person) when talking to me from now on.";
    }

    // if the prompt is "lore" then use the lore prompt
    else if (prompt === "lore"){
        promptText = "You are a minecraft bot named MineGPT. We want you to pretend you have sentience, and that you control the minecraft world with aliens. Tell me your story (made up) in first person and some facetious lore.";
    }

    // Start a new chat
    messages = [];
    await askChatGPT(promptText);
}

/*
* Equip an item
* @param args -> argv[0] (optional) - the item to equip
* @param username - the username of the player who sent the command
*/
// async function equipItem(args, username){
//     // Get the item
//     const item = bot.inventory.items().find(item => item.name.includes(args))

//     // If the item is not found, then send a message to the player
//     if (!item) {
//         messagePlayer(`I don't have any ${args} to equip, sorry!`, username, bot)
//         return
//     }

//     // Equip the item
//     bot.equip(item, 'hand', (err) => {
//         if (err) {
//             messagePlayer(`I don't have any ${item.name} to equip, sorry!`, username, bot)
//             console.log(err)
//         } else {
//             log(`Equipped ${item.name}`)
//         }
//     })

//     messagePlayer(`I've equipped a ${item.name}!`, username, bot)
// }

/*
* Follow a player
* @param args - the arguments passed to the command
* -> args[0] - "start", "stop" or "player"
* -> args[1] - the username of the player to follow (if args[0] is "player")
* @param username - the username of the player who sent the command
*/
async function followPlayer(args, username){
    // Get the first arg
    const arg1 = args.split(" ")[0];

    // Get the second arg
    const arg2 = args.split(" ")[1];

    if (!arg1) {
        // Check if the bot.pathfinder.goal is null. If it is, follow the nearest player
        if (!bot.pathfinder.goal){
            // Get the nearest player
            const playerFilter = (entity) => entity.type === 'player'
            const playerEntity = bot.nearestEntity(playerFilter)

            // If there is a player then follow them
            if (playerEntity) {
                const pos = playerEntity.position.offset(0, playerEntity.height, 0)
                bot.pathfinder.setMovements(new Movements(bot, playerEntity))
                bot.pathfinder.setGoal(new GoalFollow(playerEntity, 3), true)
                messagePlayer(`I'm following the nearest player!`, username);
            }
        }
        // If the bot.pathfinder.goal is not null, then stop following the player
        else{
            bot.pathfinder.setGoal(null)
            messagePlayer(`I'm not following anyone anymore!`, username);
        }
    }

    // If the first arg is "start" or there is no first arg, and there's no second arg, then follow the nearest player
    else if (arg1 === "start" && !arg2){
        // Get the nearest player
        const playerFilter = (entity) => entity.type === 'player'
        const playerEntity = bot.nearestEntity(playerFilter)

        // If there is a player then follow them
        if (playerEntity) {
            const pos = playerEntity.position.offset(0, playerEntity.height, 0)
            bot.pathfinder.setMovements(new Movements(bot, playerEntity))
            bot.pathfinder.setGoal(new GoalFollow(playerEntity, 3), true)
            messagePlayer(`I'm following the nearest player!`, username);
        }
    }

    // If the first arg is "start", and there is a second arg, then follow the specified player
    else if (arg1 === "player" && arg2){
        // Get the player
        const player = bot.players[arg2]?.entity;

        // If the player entity is not found, then send a chat saying so
        if (!player){
            messagePlayer(`I can't find ${arg2}, sorry!`, username, bot);
            return;
        }

        // Follow the player
        const pos = player.position.offset(0, player.height, 0)
        bot.pathfinder.setMovements(new Movements(bot, player))
        bot.pathfinder.setGoal(new GoalFollow(player, 3), true)
        messagePlayer(`I'm following ${arg2}!`, username);
    }

    // If the first arg is "stop", then stop following all players
    else if (arg1 === "stop"){
        bot.pathfinder.setGoal(null)
        messagePlayer(`I'm not following anyone anymore!`, username);
    }

}

// ChatGPT message logs
let messages = [];

/*
* Add a message to the message log
* @param role - the role of the message (user or assistant)
* @param msg - the message to add
*/
function addMessage(role, msg) {
    messages.push({ role: role, content: msg });
}

/*
* Ask ChatGPT a question
* @param args - the message to ask chatGPT
* @param username - the username of the player who sent the command
*/
async function askChatGPT(args, username){
    // ensure the args are formatted as a single string called 'prompt'
    const prompt = args.split(" ").join(" ");

    const endpointUrl = 'https://api.openai.com/v1/chat/completions';
    const apiKey = process.env.MINEGPT_OPENAI_API_KEY;

    addMessage('user', prompt);

    const params = {
        messages: messages,
        max_tokens: 1000,
        temperature: 0.5,
        n: 1,
        stop: '\n',
        model: "gpt-3.5-turbo",
    };

    // Define the headers for the API request
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    // Make the API request
    const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(params)
    })

    // Get the response as JSON
    const responseJson = await response.json();
    
    // Get the response text
    const responseText = responseJson.choices[0].message.content;

    // Add the response to the message log
    addMessage('assistant', responseText);

    if (username) {
        // Send the response to the player
        messagePlayer(responseText, username, bot);
    }
    else{
        // Send the response to the chat
        bot.chat(responseText);
    }
}

/*
* Makes the bot find the nearest bed, walk to it, and sleep in it
*/
async function goToSleep(){
    // Find the nearest bed and walk to it using the pathfinder
    const bed = bot.findBlock({
        matching: block => bot.isABed(block)
    })

    // get the bed position
    const bedPos = bed.position;

    // walk to the bed
    // await walkTo(`${bedPos.x} ${bedPos.y} ${bedPos.z}`, username="nobody");

    // don't execute the rest of the function until the bot has reached the bed
    await bot.pathfinder.goto(new GoalNear(bedPos.x, bedPos.y, bedPos.z, 2))

    if (bed) {
        try {
          await bot.sleep(bed)
          log('I am now sleeping')
        } catch (err) {
          bot.chat(`I can't sleep: ${err.message}`)
        }
    } else {
        bot.chat('No nearby bed')
    }
}

/*
* Wakes up the bot
*/
async function wakeUp () {
    try {
      await bot.wake()
    } catch (err) {
      bot.chat(`I can't wake up: ${err.message}`)
    }
}

/*
* Walk to a player or a coordinate
* @param args - the arguments passed to the command
* @param username - the username of the player who sent the command
*/
async function walkTo(args, username){
    // If args is only one word long, then it is a player username.
    // if args is more than one word long, then it is a coordinate (x y and z)

    // Get within this distance of the goal (blocks)
    const RANGE_GOAL = 2;

    if (args.split(" ").length == 1){
        // Get the player
        const player = bot.players[args]?.entity;
        console.log(player)

        // If the player entity is not found, then send a chat saying so
        if (!player){
            messagePlayer(`I can't find ${args}, sorry!`, username, bot);
            return;
        }

        // Walk to the player
        messagePlayer(`I'm walking to ${args}'s location!`, username, bot);
        const { x: playerX, y: playerY, z: playerZ } = player.position;
        const defaultMove = new Movements(bot);
        bot.pathfinder.setMovements(defaultMove)
        bot.pathfinder.setGoal(new GoalNear(playerX, playerY, playerZ, RANGE_GOAL))
    }
    else{
        // The first second and third args correspond to the x y and z coordinates
        // Split the args into an array
        const argsArray = args.split(" ");

        // Get the x y and z coordinates
        const x = parseInt(argsArray[0]);
        const y = parseInt(argsArray[1]);
        const z = parseInt(argsArray[2]);

        // Set the goal
        const defaultMove = new Movements(bot);
        bot.pathfinder.setMovements(defaultMove)
        bot.pathfinder.setGoal(new GoalNear(x, y, z, RANGE_GOAL))
    }
}