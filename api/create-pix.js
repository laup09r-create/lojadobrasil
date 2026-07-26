// POST /api/create-pix
// Recebe os dados do checkout do frontend, valida, e repassa pro gateway Duttyfy.
// A DUTTYFY_PIX_URL_ENCRYPTED nunca é exposta ao cliente - fica só aqui, no servidor.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const gatewayUrl = process.env.DUTTYFY_PIX_URL_ENCRYPTED;
  if (!gatewayUrl) {
    console.error("DUTTYFY_PIX_URL_ENCRYPTED não configurada");
    return res.status(500).json({ error: "Configuração do gateway ausente" });
  }

  try {
    const { amount, customer, item, utm } = req.body || {};

    // ---- validação básica ----
    if (!Number.isInteger(amount) || amount < 100) {
      return res.status(400).json({ error: "amount inválido" });
    }
    if (!customer || !customer.name || !customer.email) {
      return res.status(400).json({ error: "dados do cliente incompletos" });
    }

    const document = String(customer.document || "").replace(/\D/g, "");
    if (document.length !== 11 && document.length !== 14) {
      return res.status(400).json({ error: "CPF/CNPJ inválido" });
    }

    const phone = String(customer.phone || "").replace(/\D/g, "");
    if (phone.length < 10 || phone.length > 11) {
      return res.status(400).json({ error: "telefone inválido" });
    }

    if (!item || !item.title) {
      return res.status(400).json({ error: "item inválido" });
    }

    const payload = {
      amount,
      customer: {
        name: customer.name,
        document,
        email: customer.email,
        phone
      },
      item: {
        title: item.title,
        price: item.price ?? amount,
        quantity: item.quantity ?? 1
      },
      paymentMethod: "PIX",
      utm: utm || ""
    };

    const result = await callGatewayWithRetry(gatewayUrl, payload);

    if (!result.ok) {
      console.error("Gateway retornou erro:", result.status);
      return res.status(502).json({ error: "Falha ao gerar PIX" });
    }

    const data = await result.json();

    // Persistir transactionId aqui (banco de dados) antes de responder ao cliente.
    // Ex.: await db.transactions.insert({ id: data.transactionId, amount, status: "PENDING", createdAt: new Date() });

    return res.status(200).json({
      pixCode: data.pixCode,
      transactionId: data.transactionId,
      status: data.status
    });
  } catch (err) {
    console.error("create-pix error:", err.message);
    return res.status(500).json({ error: "Erro interno" });
  }
}

async function callGatewayWithRetry(url, payload, attempt = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (response.status >= 500 && attempt < 3) {
      await sleep(attempt * 1000);
      return callGatewayWithRetry(url, payload, attempt + 1);
    }
    return response;
  } catch (err) {
    clearTimeout(timeout);
    if (attempt < 3) {
      await sleep(attempt * 1000);
      return callGatewayWithRetry(url, payload, attempt + 1);
    }
    throw err;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
