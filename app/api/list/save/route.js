import { put } from "@vercel/blob";

export async function POST(request) {
  try {
    const data = await request.json();

    if (!data?.training?.id) {
      return Response.json({ error: "Código da lista não informado." }, { status: 400 });
    }

    const id = String(data.training.id).trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
    data.training.id = id;
    data.savedAt = new Date().toISOString();

    const body = JSON.stringify(data, null, 2);

    await put(`listainno/${id}.json`, body, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true
    });

    return Response.json({ ok: true, id });
  } catch (error) {
    return Response.json({ error: error.message || "Erro ao salvar no Vercel Blob." }, { status: 500 });
  }
}
