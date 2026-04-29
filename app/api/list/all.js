import { list } from "@vercel/blob";

export default async function handler(req, res) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(200).json({ lists: [] });
    }

    const result = await list({ prefix: "listainno/", limit: 100 });
    const lists = [];

    for (const file of result.blobs || []) {
      try {
        const response = await fetch(file.url, { cache: "no-store" });
        const data = await response.json();
        lists.push({
          id: data.training?.id || file.pathname.split("/").pop()?.replace(".json", ""),
          name: data.training?.name || "Lista sem nome",
          savedAt: data.savedAt || null
        });
      } catch {}
    }

    lists.sort((a,b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
    return res.status(200).json({ lists });
  } catch (error) {
    return res.status(500).json({ lists: [], error: error?.message || "Erro ao listar." });
  }
}
