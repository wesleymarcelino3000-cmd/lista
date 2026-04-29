# ListaInno - Vercel Blob versão API simples

Esta versão não usa Next.js. Ela usa:
- index.html, style.css e script.js na raiz
- funções Vercel em /api/lists
- Vercel Blob para salvar as listas

## Como subir no Vercel

1. Apague os arquivos antigos do repositório ou crie um repositório novo.
2. Envie TODOS os arquivos deste ZIP.
3. No Vercel:
   - Framework Preset: Other
   - Build Command: vazio
   - Output Directory: vazio
4. Verifique se o Blob está Connected.
5. Faça Redeploy.

## Teste obrigatório

Abra no navegador:

/api/lists/all

O correto é aparecer:

{"lists":[]}

Se aparecer HTML, o Vercel ainda está com a versão antiga ou os arquivos não foram substituídos.
