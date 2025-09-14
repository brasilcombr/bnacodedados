import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

// rota para validar cartão
app.post("/check_card", async (req, res) => {
  try {
    const { card_number } = req.body;

    if (!card_number) {
      return res.status(400).json({ error: "Número do cartão é obrigatório" });
    }

    const response = await fetch(`https://api.mercadopago.com/v1/card_tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        card_number,
        expiration_month: 12,
        expiration_year: 2030,
        security_code: "123",
        cardholder: {
          name: "APRO",
        },
      }),
    });

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error("Erro:", err);
    res.status(500).json({ error: "Erro ao validar cartão" });
  }
});

// 🚀 Porta dinâmica exigida pelo Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
