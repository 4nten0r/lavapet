# Lava Pet - Agenda digital para banho e tosa

Plataforma web de agendamento e gestão para pet shops, banho e tosa e profissionais de estética animal. O cliente agenda sozinho pela página da empresa, sem conflitos de horário, e o gestor acompanha toda a operação em um painel próprio.

## Ambientes (Vercel)

| Ambiente | URL |
|---|---|
| Portal do cliente | `https://lavapet.vercel.app/` |
| Painel do gestor | `https://lavapet.vercel.app/admin` |
| Landing comercial e planos | `https://lavapet.vercel.app/sobre` |
| Política de privacidade | `https://lavapet.vercel.app/privacidade` |

---

## Funcionalidades

### Portal do cliente (`/`)
- Fluxo em três passos: identificação, pet e serviço, data e horário.
- Interface mobile-first com tema claro/escuro (luminária interativa).
- Serviços, preços e horários definidos na configuração da empresa, sem tocar em código.
- Horários ocupados, dias fechados da semana e datas bloqueadas aparecem como indisponíveis.
- Consentimento LGPD obrigatório antes de coletar qualquer dado.
- Comprovante digital `#PET-XXXX` com sinal de reserva via Pix (chave copiável) quando configurado.
- Envio do comprovante por WhatsApp com mensagem personalizada da empresa.

### Painel do gestor (`/admin`)
- Primeiro acesso cria as credenciais do gestor (e-mail + senha com hash SHA-256). Não existe senha padrão.
- Sessão com expiração automática (8 horas) e alteração de senha nas configurações.
- Métricas do dia, agenda real (site + balcão) e status de atendimento: Em Atendimento, Concluído, Reabrir.
- Confirmação por WhatsApp com 1 clique e botão "Lembrete" por agendamento.
- Agendamento manual (balcão/telefone) respeitando os horários livres.
- Relatório do dia em CSV e backup completo em JSON.
- Configurações da empresa: nome, slogan, WhatsApp, cor da marca, horários, serviços (nome, descrição, preço, duração), bloqueio de datas, chave Pix, sinal (%) e templates de mensagem.
- Exportar dados e "Apagar Dados (LGPD)".

### Camada de configuração (`config.js`)
- White-label: o que o gestor define no painel é aplicado a todas as telas (portal, comprovante, WhatsApp, landing e política de privacidade).
- Dados salvos em `localStorage` e agendamentos sincronizados com Google Apps Script (Google Sheets).

### Rotas (`vercel.json`)
`/` e `/agendar` apontam para o portal do cliente; `/admin` e `/gestor` para o painel; `/sobre` para a landing; `/privacidade` para a política.

## Tecnologias

- HTML5, Tailwind CSS, JavaScript Vanilla (ES6+), Web Audio API, Web Animations API, Canvas.
- Web Crypto API (SHA-256) e Web Notifications API no painel do gestor.
- Google Apps Script (Google Sheets) para sincronização de agendamentos.
- Deploy: Vercel (principal) com rotas limpas, GitHub Pages (alternativa).

---

## Primeiro acesso ao painel

1. Abra `/admin`.
2. Defina o e-mail e a senha do gestor (mínimo de 6 caracteres). Não existe senha padrão.
3. O assistente de configuração abre automaticamente: preencha nome, WhatsApp, horários, serviços e chave Pix.
4. Credenciais e configuração ficam salvas no navegador usado pelo gestor.

## Executar localmente

Abra `preview.html` diretamente no navegador ou sirva a pasta:

```bash
python -m http.server 8080
# ou
npx serve .
```

- Portal do cliente: `http://localhost:8080/preview.html`
- Painel do gestor: `http://localhost:8080/admin.html`



---

## Deploy

### Vercel (principal)

O projeto está conectado à Vercel: cada push na branch `main` gera um deploy automático.

```bash
git add .
git commit -m "mensagem do commit"
git push origin main
```

Alternativa por CLI:

```bash
npx vercel --prod
```

### GitHub Pages (alternativa)

1. No GitHub: **Settings → Pages → Source: GitHub Actions**.
2. Publique os arquivos estáticos da raiz na branch ou serviço escolhido.
3. URL final: `https://4nten0r.github.io/lavapet/` (rotas limpas não se aplicam; o painel fica em `/admin.html`).

---

## Limitações conhecidas (roadmap para SaaS)

- Configuração e agendamentos vivem por dispositivo (`localStorage`): multiempresa multi-dispositivo exige backend próprio.
- Lembretes automáticos agendados e pagamento online exigem integração server-side.
- Evolução recomendada: Supabase/Firebase (dados e autenticação), API oficial de WhatsApp e cobrança por plano.

---

## Estrutura do projeto

```
lavapet/
├── landing.html            # Página comercial (planos Essencial, Profissional e Premium)
├── preview.html            # Portal do cliente
├── script.js               # Motor do portal (fluxo, horários, Pix, white-label)
├── admin.html              # Painel do gestor
├── admin.js                # Autenticação, agenda, configurações e relatórios
├── config.js               # Camada de configuração white-label compartilhada
├── privacidade.html        # Política de privacidade (LGPD)
├── vercel.json             # Rotas limpas do deploy
└── DOCUMENTACAO.md         # Visão técnica dos arquivos e fluxos
```

---

## Licença e autoria

Desenvolvido para **Lava Pet** por [4nten0r](https://github.com/4nten0r).
