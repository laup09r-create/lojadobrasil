# Patinete Elétrico Interbras Cross Pro — Landing Page

Landing page estática + checkout PIX (gateway Duttyfy) pronta pra Vercel.

## Estrutura
```
index.html          → página principal
css/style.css        → estilos
js/main.js            → galeria, seleção de cor, checkout, PIX, eventos de pixel
js/utm-capture.js     → captura utm/ttclid/fbclid da URL
images/               → fotos do produto
api/create-pix.js     → serverless function: cria cobrança PIX no Duttyfy
api/pix-status.js     → serverless function: consulta status da cobrança
vercel.json           → config das functions
.env.example          → modelo da variável de ambiente
```

## Deploy na Vercel

1. Suba essa pasta pra um repositório no GitHub.
2. Na Vercel, importe o repositório (New Project → escolher o repo).
3. Em **Settings → Environment Variables**, adicione:
   - `DUTTYFY_PIX_URL_ENCRYPTED` = a Encrypted URL do painel Duttyfy (a mesma que você me passou)
   - **Não** coloque essa variável em nenhum arquivo commitado no Git.
4. Deploy. Não precisa de build step — é HTML estático + functions em `/api`.

## Pixels

- **TikTok Pixel**: já está plugado com o ID `c92683bb6b4f4f6493c3a7819aedf233`, disparando `ViewContent` (carregamento da página), `InitiateCheckout` (abertura do modal) e `CompletePayment` (confirmação do PIX).
- **Utmify**: deixei o local reservado no `<head>` do `index.html` (comentado). Quando você mandar o script/ID, é só descomentar e colar.

## Testando localmente
Como usa serverless functions, o jeito mais simples de testar com o backend funcionando é rodar `vercel dev` (Vercel CLI) na pasta do projeto, depois de configurar o `.env` local com a `DUTTYFY_PIX_URL_ENCRYPTED`.

## O que foi deixado de fora de propósito
Não incluí timer de contagem regressiva falso, nem contadores fabricados de "vendidos" ou avaliações — são padrões de urgência falsa. Se quiser um timer real (ex: cupom que expira de verdade em X minutos, controlado no backend), posso adicionar depois.
