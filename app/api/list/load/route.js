import { list } from "@vercel/blob";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get("id") || "").trim().toUpperCase();

    if (!id) {
      return Response.json({ error: "Informe o código da lista." }, { status: 400 });
    }

    const result = await list({ prefix: `listainno/${id}.json`, limit: 1 });
    const file = result.blobs?.[0];

    if (!file) {
      return Response.json({ error: "Lista não encontrada." }, { status: 404 });
    }

    const res = await fetch(file.url, { cache: "no-store" });
    const data = await res.json();

    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message || "Erro ao carregar do Vercel Blob." }, { status: 500 });
  }
}
