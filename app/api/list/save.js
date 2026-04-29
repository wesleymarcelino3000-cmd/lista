import { put } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({
        error: "BLOB_READ_WRITE_TOKEN não encontrado. Conecte o Blob no projeto e faça Redeploy."
      });
    }

    const data = req.body;

    if (!data?.training?.id) {
      return res.status(400).json({ error: "Código da lista não informado." });
    }

    const id = String(data.training.id).trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
    data.training.id = id;
    data.savedAt = new Date().toISOString();

    await put(`listainno/${id}.json`, JSON.stringify(data, null, 2), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true
    });

    return res.status(200).json({ ok: true, id });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Erro ao salvar no Vercel Blob." });
  }
}
