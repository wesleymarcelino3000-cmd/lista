import { list } from "@vercel/blob";

export async function GET() {
  try {
    const result = await list({ prefix: "listainno/", limit: 100 });
    const lists = [];

    for (const file of result.blobs || []) {
      try {
        const res = await fetch(file.url, { cache: "no-store" });
        const data = await res.json();
        lists.push({
          id: data.training?.id || file.pathname.split("/").pop()?.replace(".json", ""),
          name: data.training?.name || "Lista sem nome",
          savedAt: data.savedAt || null
        });
      } catch {}
    }

    lists.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));

    return Response.json({ lists });
  } catch (error) {
    return Response.json({ error: error.message || "Erro ao listar." }, { status: 500 });
  }
}
