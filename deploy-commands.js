const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('entrar')
    .setDescription('Entrar na fila de mediadores'),

  new SlashCommandBuilder()
    .setName('sair')
    .setDescription('Sair da fila de mediadores'),

  new SlashCommandBuilder()
    .setName('configpix')
    .setDescription('Configurar sua chave PIX')
    .addStringOption(option =>
      option.setName('chave')
        .setDescription('Sua chave PIX')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('nome')
        .setDescription('Seu nome completo')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('cidade')
        .setDescription('Sua cidade')
        .setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Registrando comandos...');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );

    console.log('Comandos registrados com sucesso!');
  } catch (error) {
    console.error(error);
  }
})();
