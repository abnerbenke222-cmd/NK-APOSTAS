const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  REST,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

/* ================= BANCO ================= */

let config = {
  cargoMediador: null,
  categoria: null,
  taxa: 0.30,
  banner: null
};

let mediadores = [];
let pix = {};
let filas = {};

/* ================= COMANDOS ================= */

const commands = [

  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel de configuração")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("mediador")
    .setDescription("Painel de mediador"),

  new SlashCommandBuilder()
    .setName("criarfila")
    .setDescription("Criar fila")
    .addStringOption(o =>
      o.setName("modo")
        .setDescription("1x1, 2x2 ou 3x3")
        .setRequired(true)
        .addChoices(
          { name: "1x1", value: "1x1" },
          { name: "2x2", value: "2x2" },
          { name: "3x3", value: "3x3" }
        )
    )
    .addNumberOption(o =>
      o.setName("preco")
        .setDescription("Preço por jogador")
        .setRequired(true)
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
  console.log(`🔥 NK APOSTAS ONLINE ${client.user.tag}`);
});

/* ================= INTERAÇÕES ================= */

client.on("interactionCreate", async interaction => {

  /* ================= PAINEL ADMIN ================= */

  if (interaction.isChatInputCommand() && interaction.commandName === "painel") {

    const embed = new EmbedBuilder()
      .setTitle("⚙️ Painel NK Apostas")
      .setColor("#2b2d31")
      .setDescription(
        `👑 Cargo Mediador: ${config.cargoMediador ? `<@&${config.cargoMediador}>` : "Não definido"}\n` +
        `📂 Categoria: ${config.categoria ? `<#${config.categoria}>` : "Não definida"}\n` +
        `💰 Taxa: R$ ${config.taxa}\n` +
        `🖼 Banner: ${config.banner ? "Definido" : "Não definido"}`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("set_cargo")
        .setLabel("Definir Cargo Mediador")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("set_categoria")
        .setLabel("Definir Categoria")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("set_taxa")
        .setLabel("Definir Taxa")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("set_banner")
        .setLabel("Definir Banner")
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({ embeds: [embed], components: [row] });
  }

  /* ================= PAINEL MEDIADOR ================= */

  if (interaction.isChatInputCommand() && interaction.commandName === "mediador") {

    const lista = mediadores.length > 0
      ? mediadores.map(id => `<@${id}>`).join("\n")
      : "Nenhum mediador na fila.";

    const embed = new EmbedBuilder()
      .setTitle("👨‍⚖️ Fila de Mediadores")
      .setColor("#2b2d31")
      .setDescription(`📋 Disponíveis:\n${lista}`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("entrar_mediador")
        .setLabel("Entrar na Fila")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("sair_mediador")
        .setLabel("Sair da Fila")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId("set_pix")
        .setLabel("Configurar PIX")
        .setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({ embeds: [embed], components: [row] });
  }

  /* ================= CRIAR FILA ================= */

  if (interaction.isChatInputCommand() && interaction.commandName === "criarfila") {

    const modo = interaction.options.getString("modo");
    const preco = interaction.options.getNumber("preco");

    const necessario = modo === "1x1" ? 2 : modo === "2x2" ? 4 : 6;
    const id = Date.now();

    filas[id] = { modo, preco, necessario, jogadores: [] };

    const embed = new EmbedBuilder()
      .setTitle(`${modo} | Fila`)
      .setColor("#2b2d31")
      .setDescription(
        `ℹ️ Formato: ${modo} Mobile\n` +
        `💰 Preço: R$ ${preco.toFixed(2)}\n\n` +
        `👥 Jogadores:\nSem jogadores`
      );

    if (config.banner) embed.setThumbnail(config.banner);

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

  /* ================= BOTÕES ================= */

  if (interaction.isButton()) {

    /* MEDIADOR ENTRAR */
    if (interaction.customId === "entrar_mediador") {

      if (!config.cargoMediador)
        return interaction.reply({ content: "Cargo não configurado.", ephemeral: true });

      if (!interaction.member.roles.cache.has(config.cargoMediador))
        return interaction.reply({ content: "Você não é mediador.", ephemeral: true });

      if (mediadores.includes(interaction.user.id))
        return interaction.reply({ content: "Você já está na fila.", ephemeral: true });

      mediadores.push(interaction.user.id);
      return interaction.reply({ content: "Você entrou na fila!", ephemeral: true });
    }

    /* MEDIADOR SAIR */
    if (interaction.customId === "sair_mediador") {
      mediadores = mediadores.filter(id => id !== interaction.user.id);
      return interaction.reply({ content: "Você saiu da fila.", ephemeral: true });
    }

    /* SET PIX */
    if (interaction.customId === "set_pix") {
      pix[interaction.user.id] = "Chave não definida";
      return interaction.reply({ content: "Use /setpix no próximo update 😈", ephemeral: true });
    }

    /* FILA ENTRAR */
    if (interaction.customId.startsWith("entrar_")) {

      const id = interaction.customId.split("_")[1];
      const fila = filas[id];
      if (!fila) return;

      if (!fila.jogadores.includes(interaction.user.id))
        fila.jogadores.push(interaction.user.id);

      const lista = fila.jogadores.map(id => `<@${id}>`).join("\n");

      const embed = new EmbedBuilder()
        .setTitle(`${fila.modo} | Fila`)
        .setColor("#2b2d31")
        .setDescription(
          `ℹ️ Formato: ${fila.modo} Mobile\n` +
          `💰 Preço: R$ ${fila.preco.toFixed(2)}\n\n` +
          `👥 Jogadores:\n${lista}`
        );

      if (config.banner) embed.setThumbnail(config.banner);

      await interaction.update({ embeds: [embed] });

      if (fila.jogadores.length === fila.necessario && mediadores.length > 0) {

        const mediador = mediadores.shift();

        const canal = await interaction.guild.channels.create({
          name: `partida-${fila.modo}`,
          type: ChannelType.GuildText,
          parent: config.categoria || null,
          permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            ...fila.jogadores.map(j => ({
              id: j,
              allow: [PermissionFlagsBits.ViewChannel]
            })),
            { id: mediador, allow: [PermissionFlagsBits.ViewChannel] }
          ]
        });

        await canal.send(`👨‍⚖️ Mediador: <@${mediador}>\n💰 Taxa fixa: R$ ${config.taxa}`);
      }
    }

    /* FILA SAIR */
    if (interaction.customId.startsWith("sair_")) {

      const id = interaction.customId.split("_")[1];
      const fila = filas[id];
      if (!fila) return;

      fila.jogadores = fila.jogadores.filter(j => j !== interaction.user.id);

      const lista = fila.jogadores.length > 0
        ? fila.jogadores.map(id => `<@${id}>`).join("\n")
        : "Sem jogadores";

      const embed = new EmbedBuilder()
        .setTitle(`${fila.modo} | Fila`)
        .setColor("#2b2d31")
        .setDescription(
          `ℹ️ Formato: ${fila.modo} Mobile\n` +
          `💰 Preço: R$ ${fila.preco.toFixed(2)}\n\n` +
          `👥 Jogadores:\n${lista}`
        );

      if (config.banner) embed.setThumbnail(config.banner);

      await interaction.update({ embeds: [embed] });
    }
  }
});

client.login(TOKEN);
