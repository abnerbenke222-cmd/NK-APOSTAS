const fs = require("fs");
const fila = require("../database/fila.json");

module.exports = {
  name: "entrar",
  execute(interaction) {

    if (fila.fila.includes(interaction.user.id)) {
      return interaction.reply({ content: "❌ Você já está na fila.", ephemeral: true });
    }

    fila.fila.push(interaction.user.id);

    fs.writeFileSync("./database/fila.json", JSON.stringify(fila, null, 2));

    interaction.reply({ content: "✅ Você entrou na fila de mediadores!", ephemeral: true });
  }
};

