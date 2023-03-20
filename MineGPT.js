/*
* MineGPT v1.0
* Description: This is a reference for a mineflayer bot with chatGPT connectivity and a few additional features.
* Author: John Kearney
*/

const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const GoalFollow = goals.GoalFollow
const GoalBlock = goals.GoalBlock

const fetch = require('node-fetch');


// Create the bot
function createBot(){

    const bot = mineflayer.createBot({
        // Server Information
        host: 'localhost', // Put the ip of the minecraft server to connect to
        port: '25565',
        version: '1.19.3', // Version of minecraft to use
    
        // Authentication Type (microsoft or mojang)
        auth: 'microsoft',
    
        // Account Information
        username: '', // put your minecraft account email here
        password: '' // put your minecraft account password here
    })

    // Load Plugins
    bot.loadPlugin(pathfinder)

    // Chat Commands
    bot.on('chat', async (username, msg) => chatCommands(username, msg, bot))

    // If kicked then relog
    bot.on('kick', async (reason) => {
        setTimeout(() => createBot(), 7000);
    })

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
          bot.chat("I'm sleeping!")
        } catch (err) {
          bot.chat(`I can't sleep!  ${err.message}`)
        }
      } else {
        bot.chat('No nearby bed!')
      }
}

async function wake(bot) {
    try {
        await bot.wake()
      } catch (err) {
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

async function chatGPT(msg) {
    const endpointUrl = 'https://api.openai.com/v1/chat/completions';
    const apiKey = ''; // replace with your ChatGPT API key
  
    const mess = [ {"role": "user", "content": msg} ]
  
    const params = {
      messages: mess,
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
      // Return the response message as a string
      return responseMessage.toString();
    })
    .catch(error => {
      // Handle any errors
      console.error(error);
    });
}

function chatCommands(username, msg, bot) {
    try {
        if(msg === '!follow'){
            const playerCI = bot.players[username]
           
    
            bot.chat(`Following ${username}!`)
            const mcData = require('minecraft-data')(bot.version)
            const movements = new Movements(bot, mcData)

            // if you want the bot to use dirt as a scaffolding block
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
            // movements.scafoldingBlocks = [mcData.blocksByName.dirt.id]
    
            bot.pathfinder.setMovements(movements)
    
            const goal = new GoalFollow(playerCI.entity, 1)
            bot.pathfinder.setGoal(goal, false)
        }
        else if(msg === '!stop'){
            const mcData = require('minecraft-data')(bot.version)
            const movements = new Movements(bot, mcData)
            // movements.scafoldingBlocks = [mcData.blocksByName.dirt.id]
    
            bot.pathfinder.setMovements(movements)
    
            // const goal = new GoalFollow(null)
            bot.pathfinder.setGoal(null)
            bot.afk.stop();

            bot.chat("Ok, I've stopped moving.")
        }
        else if(msg === '!sleep') {
            sleep(bot)
        }
        else if(msg === '!wake') {
            wake(bot)
        }
        else if (msg === '!tp') {
            bot.chat(`/tp <BOT_USERNAME> ${username}`)
        }
        else if(msg.substring(0, 6) === '!echo') {
            let formattedMsg = msg.slice(5)
            bot.chat(`${formattedMsg}`)
        }
        else if(msg === '!help') {
            bot.chat(`Prefix: '!' ---> help, echo, tp, follow, come, stop, xp, `)
        }
        else if(msg == '!xp') {
            let i = 0
            while(i<10) {
                bot.chat(`/summon minecraft:experience_bottle ~2 ~2 ~`)
                bot.chat(`/summon minecraft:experience_bottle ~ ~2 ~2`)
                i + 1;
            }
            i = 0;
            
        }
        else if (username != '<BOT_USERNAME>') {
            // Call the function and log the result
            chatGPT(msg).then(result => {
                bot.chat(result);
            });
        }   
    }
    catch (TypeError) { 
        // bot.chat("I'm having a seizure. (code error, relogging)")
        bot.chat('/kick 2lup')
    }
}

createBot()