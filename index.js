const { Client, GatewayIntentBits } = require('discord.js');

const TOKEN = process.env.TOKEN;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => {
  console.log(`Bot online como ${client.user.tag}`);
});
https://github.com/
client.login(TOKEN);
