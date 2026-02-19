const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* ================= BANCO EM MEMÓRIA ================= */

let ownerId = null;
let devs = [];
let users = {};
let planos = {};
let mediadores = [];
let filas = {};

/* ================= FUNÇÃO USER BASE ================= */

function getUser(id) {
  if (!users[id]) {
    users[id] = {
      moedas: 0,
      vitorias: 0,
      derrotas: 0,
      partidas: 0,
      plano: "Nenhum"
    };
  }
  return users[id];
}

/* ================= COMANDOS ================= */

const commands = [

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Mostra a latência do bot"),

  new SlashCommandBuilder()
    .setName("perfil")
    .setDescription("Veja seu perfil"),

  new SlashCommandBuilder()
    .setName("pagar")
    .setDescription("Pagar moedas")
    .addUserOption(o => o.setName("usuario").setRequired(true))
    .addIntegerOption(o => o.setName("quantidade").setRequired(true)),

  new SlashCommandBuilder()
    .setName("gerenciar")
    .setDescription("Gerenciar moedas")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName("usuario").setRequired(true))
    .addIntegerOption(o => o.setName("moedas").setRequired(true)),

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Ranking")
    .addStringOption(o =>
      o.setName("tipo")
        .setRequired(true)
        .addChoices(
          { name: "moedas", value: "moedas" },
          { name: "vitorias", value: "vitorias" },
          { name: "derrotas", value: "derrotas" },
          { name: "partidas", value: "partidas" }
        )
    ),

  new SlashCommandBuilder()
    .setName("plano_gerar")
    .setDescription("Gerar chave de plano (DEV)")
    .addStringOption(o => o.setName("nome").setRequired(true)),

  new SlashCommandBuilder()
    .setName("plano_resgatar")
    .setDescription("Resgatar chave")
    .addStringOption(o => o.setName("chave").setRequired(true)),

  new SlashCommandBuilder()
    .setName("owner")
    .setDescription("Definir dono do bot")
    .addUserOption(o => o.setName("usuario").setRequired(true)),

  new SlashCommandBuilder()
    .setName("info")
    .setDescription("Informações do bot"),

  new SlashCommandBuilder()
    .setName("fila_criar")
    .setDescription("Criar fila")
    .addStringOption(o =>
      o.setName("modo")
        .setRequired(true)
        .addChoices(
          { name: "1x1", value: "1x1" },
          { name: "2x2", value: "2x2" }
        )
    )

].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
})();

/* ================= READY ================= */

client.once("ready", () => {
  console.log("🔥 BOT MAXIMO ONLINE");
});

/* ================= INTERAÇÃO ================= */

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  /* PING */
  if (commandName === "ping") {
    return interaction.reply(`🏓 ${client.ws.ping}ms`);
  }

  /* PERFIL */
  if (commandName === "perfil") {
    const data = getUser(interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle(`Perfil de ${interaction.user.username}`)
      .setColor("#2b2d31")
      .addFields(
        { name: "Moedas", value: `${data.moedas}`, inline: true },
        { name: "Vitórias", value: `${data.vitorias}`, inline: true },
        { name: "Derrotas", value: `${data.derrotas}`, inline: true },
        { name: "Partidas", value: `${data.partidas}`, inline: true },
        { name: "Plano", value: `${data.plano}`, inline: true }
      );

    return interaction.reply({ embeds: [embed] });
  }

  /* PAGAR */
  if (commandName === "pagar") {
    const user = interaction.options.getUser("usuario");
    const quant = interaction.options.getInteger("quantidade");

    const authorData = getUser(interaction.user.id);
    const targetData = getUser(user.id);

    if (authorData.moedas < quant)
      return interaction.reply({ content: "Saldo insuficiente.", ephemeral: true });

    authorData.moedas -= quant;
    targetData.moedas += quant;

    return interaction.reply(`💸 Transferido ${quant} moedas para ${user}`);
  }

  /* GERENCIAR */
  if (commandName === "gerenciar") {
    const user = interaction.options.getUser("usuario");
    const moedas = interaction.options.getInteger("moedas");

    getUser(user.id).moedas += moedas;

    return interaction.reply(`💰 Atualizado saldo de ${user}`);
  }

  /* RANK */
  if (commandName === "rank") {
    const tipo = interaction.options.getString("tipo");

    const ranking = Object.entries(users)
      .sort((a, b) => b[1][tipo] - a[1][tipo])
      .slice(0, 10);

    const desc = ranking.map((u, i) =>
      `**${i + 1}º** <@${u[0]}> - ${u[1][tipo]}`
    ).join("\n");

    const embed = new EmbedBuilder()
      .setTitle(`Ranking de ${tipo}`)
      .setColor("#2b2d31")
      .setDescription(desc || "Sem dados");

    return interaction.reply({ embeds: [embed] });
  }

  /* PLANO GERAR */
  if (commandName === "plano_gerar") {
    if (interaction.user.id !== ownerId && !devs.includes(interaction.user.id))
      return interaction.reply({ content: "Apenas DEV.", ephemeral: true });

    const nome = interaction.options.getString("nome");
    const chave = Math.random().toString(36).substring(2, 10).toUpperCase();

    planos[chave] = nome;

    return interaction.reply(`🔑 Chave gerada: ${chave}`);
  }

  /* PLANO RESGATAR */
  if (commandName === "plano_resgatar") {
    const chave = interaction.options.getString("chave");

    if (!planos[chave])
      return interaction.reply({ content: "Chave inválida.", ephemeral: true });

    getUser(interaction.user.id).plano = planos[chave];
    delete planos[chave];

    return interaction.reply("✅ Plano ativado!");
  }

  /* OWNER */
  if (commandName === "owner") {
    ownerId = interaction.options.getUser("usuario").id;
    return interaction.reply("👑 Owner definido!");
  }

  /* INFO */
  if (commandName === "info") {
    const embed = new EmbedBuilder()
      .setTitle("Bot Sistema Max")
      .setColor("#2b2d31")
      .setDescription("Sistema completo de economia, plano e fila.");

    return interaction.reply({ embeds: [embed] });
  }

  /* FILA */
  if (commandName === "fila_criar") {
    const modo = interaction.options.getString("modo");
    filas[Date.now()] = { modo, jogadores: [] };

    return interaction.reply(`🎮 Fila ${modo} criada!`);
  }

});

client.login(TOKEN);
