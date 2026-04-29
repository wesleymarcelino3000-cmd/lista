import { list } from "@vercel/blob";

export default async function handler(req, res) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({
        error: "BLOB_READ_WRITE_TOKEN não encontrado. Conecte o Blob no projeto e faça Redeploy."
      });
    }

    const id = String(req.query.id || "").trim().toUpperCase();

    if (!id) {
      return res.status(400).json({ error: "Informe o código da lista." });
    }

    const result = await list({ prefix: `listainno/${id}.json`, limit: 1 });
    const file = result.blobs?.[0];

    if (!file) {
      return res.status(404).json({ error: "Lista não encontrada." });
    }

    const response = await fetch(file.url, { cache: "no-store" });
    const data = await response.json();

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Erro ao carregar do Vercel Blob." });
  }
}
