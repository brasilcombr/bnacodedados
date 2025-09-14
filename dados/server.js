import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(express.json());

// --- diretório base (para servir index.html) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// token do Mercado Pago (configure no Render -> Environment Variables)
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

// rota raiz → abre o index.html
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

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
    console.error(err);
    res.status(500).json({ error: "Erro ao validar cartão" });
  }
});

// rota para processar pagamento
app.post("/process_payment", async (req, res) => {
  try {
    const { token, transaction_amount, description, installments, payer } =
      req.body;

    if (!token) {
      return res.status(400).json({ error: "Token do cartão é obrigatório" });
    }

    const response = await fetch(`https://api.mercadopago.com/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        token,
        transaction_amount,
        description,
        installments,
        payment_method_id: "visa", // simplificado; MP detecta no token
        payer,
      }),
    });

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao processar pagamento" });
  }
});

// start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
