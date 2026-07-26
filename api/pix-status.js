// GET /api/pix-status?transactionId=...
// Consulta o status da cobrança no gateway Duttyfy. Frontend faz polling nessa rota.

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const gatewayUrl = process.env.DUTTYFY_PIX_URL_ENCRYPTED;
  if (!gatewayUrl) {
    console.error("DUTTYFY_PIX_URL_ENCRYPTED não configurada");
    return res.status(500).json({ error: "Configuração do gateway ausente" });
  }

  const { transactionId } = req.query;
  if (!transactionId) {
    return res.status(400).json({ error: "transactionId é obrigatório" });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `${gatewayUrl}?transactionId=${encodeURIComponent(transactionId)}`,
      { method: "GET", signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({ error: "Falha ao consultar status" });
    }

    const data = await response.json();

    // Quando status === "COMPLETED", atualize seu banco com UPDATE condicional
    // (nunca INSERT OR REPLACE, isso apaga campos existentes como amount/created_at):
    // if (data.status === "COMPLETED") {
    //   await db.transactions.update(
    //     { id: transactionId },
    //     { status: "COMPLETED", paidAt: data.paidAt }
    //   );
    // }

    return res.status(200).json(data);
  } catch (err) {
    console.error("pix-status error:", err.message);
    return res.status(500).json({ error: "Erro interno" });
  }
}
