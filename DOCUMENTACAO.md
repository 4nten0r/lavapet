# Documentação técnica do Lava Pet

## Visão geral

O projeto é uma aplicação estática em HTML, CSS e JavaScript. O portal do cliente coleta os dados do tutor e do pet, apresenta serviços e horários disponíveis e registra o agendamento. O painel administrativo usa os mesmos dados locais para acompanhar a agenda, alterar status, configurar a empresa e exportar informações.

Os dados do navegador ficam em `localStorage` e a sessão administrativa fica em `sessionStorage`. O Google Apps Script é usado como integração opcional para consultar e enviar agendamentos a uma planilha.

## Arquivos da aplicação

### `config.js`

Camada compartilhada de configuração e regras básicas:

- define valores padrão da empresa, serviços, horários, Pix e templates de WhatsApp;
- lê e grava a configuração em `localStorage` com merge dos valores padrão;
- lê e grava datas e horários bloqueados;
- calcula se uma data está fechada ou bloqueada;
- calcula horários livres removendo agendamentos ativos e bloqueios;
- formata datas, substitui placeholders dos templates e abre links do WhatsApp;
- fornece a máscara de telefone usada pelo painel e pelas telas que carregam esse arquivo.

### `script.js`

Controla o portal do cliente (`preview.html`):

- alterna o tema claro/escuro e salva a preferência;
- executa sons, animações, confetes e feedback visual;
- valida nome, telefone e consentimento LGPD;
- conduz as etapas de identificação, cadastro do pet, serviço, data e horário;
- exibe serviços e horários a partir da configuração da empresa;
- combina agendamentos locais com os horários recebidos do Google Apps Script;
- revalida disponibilidade antes de confirmar;
- cria o registro local, gera o código `#PET-XXXX` e mostra o comprovante;
- oferece cópia da chave Pix e compartilhamento do comprovante por WhatsApp.

### `admin.js`

Controla o painel do gestor (`admin.html`):

- cria o acesso no primeiro uso e autentica com hash SHA-256 via Web Crypto;
- cria sessão administrativa com expiração de oito horas;
- carrega, filtra, ordena e atualiza os agendamentos locais;
- calcula total do dia, receita, concluídos e próximo atendimento;
- permite iniciar, concluir, reabrir e excluir agendamentos;
- permite agendamento manual, respeitando os horários livres quando possível;
- envia confirmação e lembrete por WhatsApp;
- exporta relatório CSV e backup JSON;
- edita identidade visual, serviços, horários, Pix, templates e bloqueios;
- oferece remoção dos dados locais conforme a solicitação de apagamento LGPD.

### `preview.html`

Interface do portal de agendamento. Contém as telas de login do tutor, cadastro do pet, seleção de serviço, escolha de data e horário e confirmação. Carrega `config.js` antes de `script.js`.

### `admin.html`

Interface do painel administrativo. Define as telas de autenticação, dashboard, filtros, modal de agendamento manual e modal de configurações. Carrega `config.js` antes de `admin.js`.

### `landing.html`

Página comercial com apresentação do produto, benefícios, planos e links para o portal, o painel e a política de privacidade. Usa `config.js` para aplicar o nome configurado da empresa.

### `privacidade.html`

Apresenta a política de privacidade e as orientações relacionadas ao tratamento dos dados informados no agendamento.

### `vercel.json`

Define as rotas limpas do deploy na Vercel: `/` e `/agendar` abrem o portal, `/admin` e `/gestor` abrem o painel, e `/sobre` e `/privacidade` abrem as páginas institucionais correspondentes.

### `api-config.js` e `.env.example`

`api-config.js` contém apenas a URL pública e o token da instalação atual. O arquivo `.env.example` documenta os mesmos valores necessários no Apps Script. Como HTML estático não lê variáveis de ambiente sozinho, não coloque segredos reais em `.env` esperando que eles apareçam no navegador; a URL e o token do frontend são informações públicas e servem apenas como controle básico da instalação.

### `apps-script/Code.gs`

É o backend opcional para uma planilha por cliente. A função `configurar()` cria a aba `Agendamentos`, `doGet()` lista os horários e `doPost()` grava reservas usando `LockService` para reduzir conflitos simultâneos. O `SHEET_ID`, `SHEET_NAME` e `API_TOKEN` devem ficar nas propriedades do projeto do Apps Script, nunca no HTML.

### `README.md`

Documenta funcionalidades, primeiro acesso, execução local, deploy, limitações conhecidas e estrutura do projeto.

## Fluxos principais

### Agendamento do cliente

1. O tutor informa nome, telefone e aceita a política de privacidade.
2. O cliente informa o pet e escolhe um serviço configurado.
3. O portal remove horários ocupados, bloqueados ou pertencentes a dias fechados.
4. A confirmação é revalidada e salva em `lavapet_real_appointments`.
5. O portal tenta enviar os dados ao Google Apps Script sem bloquear a confirmação local.

### Gestão administrativa

1. No primeiro acesso, o gestor cria a credencial no navegador.
2. O painel abre a agenda salva localmente e aplica os filtros selecionados.
3. Alterações de status, novos agendamentos e exclusões são persistidos no navegador.
4. Configurações, bloqueios, exportações e apagamento de dados ficam disponíveis no modal de configurações.

## Debug e limitações observadas

- A aplicação depende de navegador com `localStorage`, `sessionStorage`, Web Crypto, Clipboard e, opcionalmente, Notifications.
- A sincronização remota usa um endpoint público de Google Apps Script configurado diretamente nos scripts.
- Os dados locais não são compartilhados automaticamente entre dispositivos; o próprio README registra essa limitação.
- O arquivo `teste-automatico.html` foi removido intencionalmente e não faz parte deste projeto.
- Para uma implantação vendável de pequeno porte, configure uma planilha e um Apps Script por pet shop e preencha `api-config.js` com a URL e o token daquela instalação.
- As telas do portal não dependem de transições de opacidade para ficar interativas; os controles permanecem visíveis mesmo quando o navegador não avança animações CSS.
- A validação executável recomendada é abrir `preview.html` e `admin.html` por um servidor HTTP local, pois alguns recursos do navegador funcionam de forma diferente quando o HTML é aberto diretamente.

## Execução local

Na raiz do projeto:

```bash
python -m http.server 8080
```

Depois, acesse `http://localhost:8080/preview.html` e `http://localhost:8080/admin.html`.
