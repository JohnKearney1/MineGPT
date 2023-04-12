/*
* MineGPT v2.0
* Description: This is a reference for a mineflayer bot with chatGPT connectivity and a few additional features.
*/

const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const GoalFollow = goals.GoalFollow
const GoalBlock = goals.GoalBlock

const fetch = require('node-fetch');

const fs = require('fs');

// Load the configuration from the file
const config = JSON.parse(fs.readFileSync('config.json'));

// Create the quiet flag
let quiet = false;

// Define a setter function to update the value of the boolean variable
function setQuiet(newValue) {
  quiet = newValue;
}

// Create the bot
function createBot(){
  console.log("Starting MineGPT")

    const bot = mineflayer.createBot({
        // Server Information
        host: config.host, // Get the host from the config file
        port: config.port,
        version: config.version, // Get the version from the config file
    
        // Authentication Type (microsoft or mojang)
        auth: config.auth,
    
        // Account Information
        username: config.username, // Get the username from the config file
        password: config.password // Get the password from the config file
    })

    // Load Plugins
    bot.loadPlugin(pathfinder)

    // Chat Commands
    bot.on('chat', async (username, msg) => chatCommands(username, msg, bot))

    // If kicked then relog
    bot.on('kick', async (reason) => {
        setTimeout(() => createBot(), 7000);
    })

    // If disconnected then relog
    bot.on('end', async () => {
        setTimeout(() => createBot(), 7000);
    })

    // Look at players / entities
    bot.on('physicTick', () => lookAtPlayer(bot))
}

async function sleep(bot) {
    const bed = bot.findBlock({
        matching: block => bot.isABed(block)
      })
      if (bed) {
        try {
          await bot.sleep(bed)
          console.log("[MineGPT] Sleeping...")
          bot.chat("I'm sleeping!")
        } catch (err) {
          bot.chat(`I can't sleep!  ${err.message}`)
          console.log(`[MineGPT] Can't Sleep... ${err.message}`)
        }
      } else {
        console.log(`[MineGPT] Can't sleep... No nearby bed!`)
        bot.chat('No nearby bed!')
      }
}

async function wake(bot) {
    try {
        await bot.wake()
      } catch (err) {
        console.log(`[MineGPT] Can't get out of bed... ${err.message}`)
        bot.chat(`I can't get up! ${err.message}`)
      }
}

function lookAtPlayer(bot) {

    // Specify nearest entity to the bot
    const entity = bot.nearestEntity()

    // If there are no entities nearby: do nothing.
    if(!entity) { return }

    // Get the x,y,z position of the nearest entity, then offset the height by entity height. 
    const pos = entity.position.offset(0, entity.height, 0)

    // Look at the player
    bot.lookAt(pos)
}

const messages = [];

function addMessage(role, msg) {
  messages.push({ role: role, content: msg });
}

async function chatGPT(msg) {

    console.log(`[MineGPT] Querying ChatGPT with: "${msg}"`)
    const endpointUrl = 'https://api.openai.com/v1/chat/completions';
    const apiKey = config.openAI;
  
    addMessage('user', msg);
  
    const params = {
      messages: messages,
      max_tokens: 1000,
      temperature: 0.5,
      n: 1,
      stop: '',
      model: "gpt-3.5-turbo",
    };
  
    // Define the headers for the API request
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    };
  
    // Send the API request using the Fetch API
    return fetch(endpointUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(params)
    })
    .then(response => response.json())
    .then(data => {
      // Save the response data to responseMessage
      let responseMessage = data.choices[0].message.content;
      // Save the response to the message log
      addMessage('assistant', responseMessage);
      // Return the response message as a string
      return responseMessage.toString();
    })
    .catch(error => {
      // Handle any errors
      let responseMessage = `Looks like the response from OpenAI was not as expected. Ensure your API keys are valid. Entering quiet mode.`
      console.log(responseMessage)
      console.error(error);
      setQuiet(true)
      return responseMessage
    });
}

function chatCommands(username, msg, bot) {

  console.log(`[GAME CHAT] ${username}: ${msg}`)

  if(username != bot.username) {
    try {
        if(msg === '!follow'){
            const playerCI = bot.players[username]

            bot.chat(`Following ${username}!`)
            const mcData = require('minecraft-data')(bot.version)
            const movements = new Movements(bot, mcData)

            // if you want the bot to use dirt as a scaffolding block uncomment this line (sometimes glitchy)
            // movements.scafoldingBlocks = [mcData.blocksByName.dirt.id]
    
            bot.pathfinder.setMovements(movements)
    
            const goal = new GoalFollow(playerCI.entity, 5)
            bot.pathfinder.setGoal(goal, true)
        }
        else if(msg === '!come'){
            const playerCI = bot.players[username]
    
            bot.chat(`Headed your way ${username}!`)
            const mcData = require('minecraft-data')(bot.version)
            const movements = new Movements(bot, mcData)

            // if you want the bot to use dirt as a scaffolding block uncomment this line (sometimes glitchy)
            // movements.scafoldingBlocks = [mcData.blocksByName.dirt.id]
    
            bot.pathfinder.setMovements(movements)
    
            const goal = new GoalFollow(playerCI.entity, 1)
            bot.pathfinder.setGoal(goal, false)
        }
        else if(msg === '!stop'){
            const mcData = require('minecraft-data')(bot.version)
            const movements = new Movements(bot, mcData)

            // if you want the bot to use dirt as a scaffolding block uncomment this line (sometimes glitchy)
            // movements.scafoldingBlocks = [mcData.blocksByName.dirt.id]
    
            bot.pathfinder.setMovements(movements)
            bot.pathfinder.setGoal(null)
            // bot.afk.stop();
            bot.chat("Ok, I've stopped moving.")
        }
        else if(msg === '!sleep') {
            sleep(bot)
        }
        else if(msg === '!wake') {
            wake(bot)
        }
        else if(msg === '!help') {
            bot.chat(`Commands -> !help, !follow, !come, !stop, !sleep, !wake`)
        }            
        else if (quiet == false && msg.substring(0, 1) != "!") {
            // Call the function and log the result
            chatGPT(msg).then(result => {
                bot.chat(result);
            });
        }   
    }
    catch (TypeError) { 
        bot.chat('There was an error out of my control. Logging the error.')
        console.log(`There was an error out of my control: ${TypeError}`)
      }
  }
}


process.on('SIGINT', () => {
  console.log('MineGPT Stopped');
  process.exit();
});


createBot()