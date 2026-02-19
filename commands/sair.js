const fs = require("fs");
const fila = require("../database/fila.json");

module.exports = {
  name: "sair",
  execute(interaction) {

    if (!fila.fila.includes(interaction.user.id)) {
      return interaction.reply({ content: "❌ Você não está na fila.", ephemeral: true });
    }

    fila.fila = fila.fila.filter(id => id !== interaction.user.id);

    fs.writeFileSync("./database/fila.json", JSON.stringify(fila, null, 2));

    interaction.reply({ content: "🚪 Você saiu da fila!", ephemeral: true });
  }
};

