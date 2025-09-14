// server.js
// Dependências: express mercadopago node-fetch dotenv
// npm i express mercadopago node-fetch dotenv

const express = require('express');
const mercadopago = require('mercadopago');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(express.json());

// === CONFIG: use variável de ambiente MP_ACCESS_TOKEN (NUNCA comitar) ===
if (!process.env.MP_ACCESS_TOKEN) {
  console.error('ERRO: MP_ACCESS_TOKEN não definido. Defina no .env ou nas variáveis do host.');
  process.exit(1);
}
mercadopago.configure({ access_token: process.env.MP_ACCESS_TOKEN });
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
// ======================================================================

// health
app.get('/', (req, res) => res.json({ ok: true }));

/**
 * POST /check_card
 * body: { token: string, transaction_amount?: number, payer: { email } }
 *
 * Retorna JSON:
 * { ok:true, card_valid: boolean, payment: { id, status, status_detail }, refund?: {...} }
 */
app.post('/check_card', async (req, res) => {
  try {
    const { token, transaction_amount = 1.00, payer } = req.body;
    if (!token || !payer || !payer.email) {
      return res.status(400).json({ ok: false, error: 'Faltando token ou payer.email' });
    }

    // 1) tenta criar pagamento (autorização)
    const payment_data = {
      transaction_amount: Number(transaction_amount),
      token,
      description: 'Auth check (temporary)',
      installments: 1,
      payer: { email: payer.email }
    };

    const paymentResp = await mercadopago.payment.save(payment_data);
    const payment = paymentResp && paymentResp.body ? paymentResp.body : paymentResp;
    const status = payment.status || '';
    const status_detail = payment.status_detail || '';

    // Se aprovado/authorized/etc, tenta full refund para liberar o valor
    if (['approved', 'authorized', 'in_process'].includes(status)) {
      try {
        const refundsUrl = `https://api.mercadopago.com/v1/payments/${payment.id}/refunds`;
        const r = await fetch(refundsUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${MP_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({}) // full refund
        });
        const refundJson = await r.json();
        return res.json({
          ok: true,
          card_valid: true,
          payment: { id: payment.id, status, status_detail },
          refund: refundJson
        });
      } catch (errRefund) {
        // Payment approved but refund falhou — ainda consideramos o cartão válido,
        // mas alertamos sobre o erro de refund
        return res.json({
          ok: true,
          card_valid: true,
          payment: { id: payment.id, status, status_detail },
          refund_error: errRefund && errRefund.message ? errRefund.message : String(errRefund)
        });
      }
    }

    // pagamento recusado -> cartão inválido / negado
    return res.json({
      ok: true,
      card_valid: false,
      payment: { id: payment.id, status, status_detail }
    });

  } catch (err) {
    console.error('Erro check_card:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Erro interno' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
