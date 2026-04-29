# ListaInno - Vercel Blob PRIVATE corrigido

Corrigido para o seu Blob Store privado.

## Configuração no Vercel

Framework Preset: Other
Build Command: vazio
Output Directory: vazio

## Depois de subir

1. Confirme que o Blob está Connected.
2. Faça Redeploy.
3. Teste:

/api/ping

Deve retornar:
{"ok":true,"api":"online"}

/api/lists/all

Deve retornar:
{"lists":[]}

Depois teste o botão Salvar online no app.
