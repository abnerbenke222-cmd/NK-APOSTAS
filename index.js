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

/* ================== BANCO EM MEMÓRIA ================== */

let config = {
  cargoMediador: null,
  categoriaPartidas: null,
  taxa: 0.30,
  banner: null
};

let mediadoresFila = [];
let pixMediadores = {};
let filasAtivas = {};

/* ================== REGISTRAR COMANDOS ================== */

const commands = [

  new SlashCommandBuilder()
    .setName("configurar")
    .setDescription("Configurar sistema")
    .addSubcommand(s =>
      s.setName("definir_cargo_mediador")
        .setDescription("Define cargo de mediador")
        .addRoleOption(o =>
          o.setName("cargo")
            .setDescription("Cargo de mediador")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("definir_categoria")
        .setDescription("Define categoria das partidas")
        .addChannelOption(o =>
          o.setName("categoria")
            .setDescription("Categoria")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("definir_banner")
        .setDescription("Define imagem banner")
        .addStringOption(o =>
          o.setName("url")
            .setDescription("URL da imagem")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("definir_taxa")
        .setDescription("Define taxa do mediador")
        .addNumberOption(o =>
          o.setName("valor")
            .setDescription("Valor da taxa")
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("mediadorfila")
    .setDescription("Entrar na fila de mediadores"),

  new SlashCommandBuilder()
    .setName("setpix")
    .setDescription("Definir seu PIX")
    .addStringOption(o =>
      o.setName("tipo")
        .setDescription("cpf, gmail, telefone, chave aleatoria")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("chave")
        .setDescription("Sua chave PIX")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("criarfila")
    .setDescription("Criar nova fila")
    .addStringOption(o =>
      o.setName("modo")
        .setDescription("1x1, 2x2, 3x3")
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

].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
})();

/* ================== BOT READY ================== */

client.once("ready", () => {
  console.log(`🔥 NK APOSTAS ONLINE como ${client.user.tag}`);
});

/* ================== INTERAÇÕES ================== */

client.on("interactionCreate", async (interaction) => {

  if (interaction.isChatInputCommand()) {

    /* ===== CONFIGURAR ===== */

    if (interaction.commandName === "configurar") {

      const sub = interaction.options.getSubcommand();

      if (sub === "definir_cargo_mediador") {
        config.cargoMediador = interaction.options.getRole("cargo").id;
        return interaction.reply("✅ Cargo mediador definido!");
      }

      if (sub === "definir_categoria") {
        config.categoriaPartidas = interaction.options.getChannel("categoria").id;
        return interaction.reply("✅ Categoria definida!");
      }

      if (sub === "definir_banner") {
        config.banner = interaction.options.getString("url");
        return interaction.reply("✅ Banner definido!");
      }

      if (sub === "definir_taxa") {
        config.taxa = interaction.options.getNumber("valor");
        return interaction.reply("✅ Taxa definida!");
      }
    }

    /* ===== MEDIADOR FILA ===== */

    if (interaction.commandName === "mediadorfila") {

      if (!config.cargoMediador)
        return interaction.reply({ content: "⚠️ Cargo mediador não configurado.", ephemeral: true });

      if (!interaction.member.roles.cache.has(config.cargoMediador))
        return interaction.reply({ content: "❌ Você não é mediador.", ephemeral: true });

      if (mediadoresFila.includes(interaction.user.id))
        return interaction.reply({ content: "⚠️ Você já está na fila.", ephemeral: true });

      mediadoresFila.push(interaction.user.id);

      return interaction.reply("✅ Você entrou na fila de mediadores!");
    }

    /* ===== SET PIX ===== */

    if (interaction.commandName === "setpix") {

      const tipo = interaction.options.getString("tipo");
      const chave = interaction.options.getString("chave");

      pixMediadores[interaction.user.id] = { tipo, chave };

      return interaction.reply({ content: "✅ PIX salvo com sucesso!", ephemeral: true });
    }

    /* ===== CRIAR FILA ===== */

    if (interaction.commandName === "criarfila") {

      const modo = interaction.options.getString("modo");
      const preco = interaction.options.getNumber("preco");

      const jogadoresNecessarios =
        modo === "1x1" ? 2 :
        modo === "2x2" ? 4 :
        6;

      const filaId = Date.now();

      filasAtivas[filaId] = {
        modo,
        preco,
        jogadores: [],
        necessario: jogadoresNecessarios
      };

      const embed = new EmbedBuilder()
        .setTitle(`🎮 Fila ${modo}`)
        .setDescription(`💰 Preço: R$${preco}\n💵 Taxa: R$${config.taxa}\n👥 Jogadores:\nSem jogadores`)
        .setColor("Green");

      if (config.banner) embed.setImage(config.banner);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`entrar_${filaId}`)
          .setLabel("Entrar")
          .setStyle(ButtonStyle.Success)
      );

      await interaction.reply({ embeds: [embed], components: [row] });
    }
  }

  /* ===== BOTÕES ===== */

  if (interaction.isButton()) {

    if (interaction.customId.startsWith("entrar_")) {

      const filaId = interaction.customId.split("_")[1];
      const fila = filasAtivas[filaId];

      if (!fila) return;

      if (fila.jogadores.includes(interaction.user.id))
        return interaction.reply({ content: "Você já entrou!", ephemeral: true });

      fila.jogadores.push(interaction.user.id);

      const lista = fila.jogadores.map(id => `<@${id}>`).join("\n");

      const embed = new EmbedBuilder()
        .setTitle(`🎮 Fila ${fila.modo}`)
        .setDescription(`💰 Preço: R$${fila.preco}\n💵 Taxa: R$${config.taxa}\n👥 Jogadores:\n${lista}`)
        .setColor("Green");

      if (config.banner) embed.setImage(config.banner);

      await interaction.update({ embeds: [embed] });

      if (fila.jogadores.length === fila.necessario) {

        if (mediadoresFila.length === 0)
          return interaction.followUp("⚠️ Nenhum mediador disponível.");

        const mediadorId = mediadoresFila.shift();
        const mediadorPix = pixMediadores[mediadorId];

        const canal = await interaction.guild.channels.create({
          name: `partida-${fila.modo}`,
          type: ChannelType.GuildText,
          parent: config.categoriaPartidas || null,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.ViewChannel]
            },
            ...fila.jogadores.map(id => ({
              id,
              allow: [PermissionFlagsBits.ViewChannel]
            })),
            {
              id: mediadorId,
              allow: [PermissionFlagsBits.ViewChannel]
            }
          ]
        });

        const painel = new EmbedBuilder()
          .setTitle("📌 Partida Iniciada")
          .setDescription(`👨‍⚖️ Mediador: <@${mediadorId}>`)
          .setColor("Blue");

        const botoes = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("enviar_pix")
            .setLabel("Enviar PIX")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("fechar_fila")
            .setLabel("Fechar Fila")
            .setStyle(ButtonStyle.Danger)
        );

        await canal.send({ embeds: [painel], components: [botoes] });

        filasAtivas[filaId] = null;
      }
    }

    if (interaction.customId === "enviar_pix") {

      const pix = pixMediadores[interaction.user.id];

      if (!pix)
        return interaction.reply({ content: "⚠️ Você não cadastrou PIX.", ephemeral: true });

      return interaction.reply(`💰 PIX (${pix.tipo}): ${pix.chave}`);
    }

    if (interaction.customId === "fechar_fila") {
      await interaction.channel.delete();
    }
  }

});

client.login(TOKEN);
