import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const data = await request.json();

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return Response.json({
        error: "BLOB_READ_WRITE_TOKEN não encontrado. Conecte o Vercel Blob ao projeto e faça redeploy."
      }, { status: 500 });
    }

    if (!data?.training?.id) {
      return Response.json({ error: "Código da lista não informado." }, { status: 400 });
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

    return Response.json({ ok: true, id });
  } catch (error) {
    return Response.json({
      error: error?.message || "Erro ao salvar no Vercel Blob."
    }, { status: 500 });
  }
}
