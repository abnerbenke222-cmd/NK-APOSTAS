const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const fs = require("fs");

const TOKEN = "SEU_TOKEN_AQUI";
const CLIENT_ID = "SEU_CLIENT_ID_AQUI";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* ===== BANCO ===== */

if (!fs.existsSync("./filas.json")) {
  fs.writeFileSync("./filas.json", JSON.stringify({ filas: [] }, null, 2));
}

function getFilas() {
  return JSON.parse(fs.readFileSync("./filas.json"));
}

function saveFilas(data) {
  fs.writeFileSync("./filas.json", JSON.stringify(data, null, 2));
}

/* ===== REGISTRAR SLASH ===== */

const commands = [
  new SlashCommandBuilder()
    .setName("criarfila")
    .setDescription("Criar nova fila")
    .addStringOption(opt =>
      opt.setName("modo")
        .setDescription("Ex: 1x1 ou 2x2")
        .setRequired(true))
    .addIntegerOption(opt =>
      opt.setName("preco")
        .setDescription("Preço da partida")
        .setRequired(true))
    .addIntegerOption(opt =>
      opt.setName("maximo")
        .setDescription("Máximo de jogadores")
        .setRequired(true))
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );
})();

/* ===== READY ===== */

client.once("ready", () => {
  console.log("🔥 Sistema de Filas Online");
});

/* ===== INTERAÇÕES ===== */

client.on("interactionCreate", async interaction => {

  let data = getFilas();

  /* ===== CRIAR FILA ===== */

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "criarfila") {

      const modo = interaction.options.getString("modo");
      const preco = interaction.options.getInteger("preco");
      const max = interaction.options.getInteger("maximo");

      const id = Date.now().toString();

      const novaFila = {
        id,
        modo,
        preco,
        max,
        jogadores: []
      };

      data.filas.push(novaFila);
      saveFilas(data);

      const embed = new EmbedBuilder()
        .setTitle(`${modo} | Fila`)
        .setDescription(
          `💰 **Preço:** R$ ${preco},00\n\n` +
          `👥 **Jogadores:**\nSem jogadores...`
        )
        .setColor("Purple");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`entrar_${id}`)
          .setLabel("Entrar")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`sair_${id}`)
          .setLabel("Sair")
          .setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }
  }

  /* ===== BOTÕES ===== */

  if (interaction.isButton()) {

    const [acao, id] = interaction.customId.split("_");

    const fila = data.filas.find(f => f.id === id);
    if (!fila) return;

    if (acao === "entrar") {

      if (fila.jogadores.includes(interaction.user.id)) {
        return interaction.reply({ content: "Você já está na fila.", ephemeral: true });
      }

      if (fila.jogadores.length >= fila.max) {
        return interaction.reply({ content: "Fila cheia!", ephemeral: true });
      }

      fila.jogadores.push(interaction.user.id);
      saveFilas(data);

      atualizarMensagem(interaction, fila);
    }

    if (acao === "sair") {

      fila.jogadores = fila.jogadores.filter(id => id !== interaction.user.id);
      saveFilas(data);

      atualizarMensagem(interaction, fila);
    }
  }

});

/* ===== ATUALIZAR EMBED ===== */

async function atualizarMensagem(interaction, fila) {

  const jogadoresTexto = fila.jogadores.length > 0
    ? fila.jogadores.map(id => `<@${id}>`).join("\n")
    : "Sem jogadores...";

  const embed = new EmbedBuilder()
    .setTitle(`${fila.modo} | Fila`)
    .setDescription(
      `💰 **Preço:** R$ ${fila.preco},00\n\n` +
      `👥 **Jogadores (${fila.jogadores.length}/${fila.max}):**\n${jogadoresTexto}`
    )
    .setColor("Purple");

  await interaction.update({
    embeds: [embed],
    components: interaction.message.components
  });
}

client.login(TOKEN);
