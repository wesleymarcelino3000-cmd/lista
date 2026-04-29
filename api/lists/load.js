import { get } from "@vercel/blob";

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

    const result = await get(`listainno/${id}.json`, { access: "private" });

    if (!result || result.statusCode !== 200) {
      return res.status(404).json({ error: "Lista não encontrada." });
    }

    const text = await new Response(result.stream).text();
    const data = JSON.parse(text);

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Erro ao carregar do Vercel Blob." });
  }
}
