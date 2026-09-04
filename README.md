# Lava Pet 🛁

Uma plataforma web moderna e fluida para agendamento e gestão de serviços pet. Conta com experiência mobile-first, física orbital, iluminação dinâmica (spotlight lamp), alternador de modo claro/escuro interativo e portal administrativo seguro e separado para o proprietário do petshop.

🌐 **Ambientes Disponíveis:**
- **Portal do Cliente:** `https://lavapet.vercel.app/`
- **Portal do Gestor / Dono:** `https://lavapet.vercel.app/admin`

---

## ✨ Funcionalidades

### 🐾 Portal do Cliente
- 💡 **Luminária Interativa**: Puxe a cordinha ou clique na luminária para acender/apagar a luz e alternar entre **Modo Claro ☀️** e **Modo Escuro 🌙**.
- 💫 **Animação Orbital Cinética**: Anel pontilhado (`stroke-dasharray: 2 7`) com rotação física no splash screen e no carregamento de horários.
- 👤 **Identificação Rápida**: Nome e WhatsApp com formatação automática de máscara `(00) 00000-0000`.
- 🐕 **Cadastro do Pet & Mascote Reativo**: Emoji do mascote reage conforme você digita o nome do pet.
- 🛁 **Seleção de Serviços VIP**: Cards táteis de Banho, Tosa e Combo com efeitos de luz.
- 📅 **Pílulas de Dias Rápidos**: Seleção ágil de datas (`Hoje`, `Amanhã`, dias da semana) e calendário integrado.
- ⏰ **Horários em Tempo Real**: 9 horários disponíveis por dia com atualização de status.
- 🎟️ **Comprovante em Ticket VIP**: Protocolo digital `#PET-XXXX` com recorte lateral e chuva comemorativa de confetes em Canvas (60 FPS).
- 💬 **Compartilhamento no WhatsApp**: Botão direto para salvar ou enviar o comprovante com todos os detalhes.

### 📋 Portal do Gestor / Dono (`/admin`)
- 🔒 **Autenticação Criptografada**: Login protegido por hash criptográfico SHA-256 (Web Crypto API) e tokens de sessão com expiração automática.
- 📊 **Métricas Diárias em Tempo Real**: Total de pets agendados no dia, faturamento previsto em R$ calculado automaticamente, atendimentos concluídos e próximo pet da fila.
- 📅 **Agenda Real Sem Mocks**: Exibe estritamente os agendamentos reais recebidos pelo site ou cadastrados no balcão.
- 💬 **1-Clique para WhatsApp**: Disparo de mensagem pré-formatada para confirmar o atendimento com o tutor.
- ⚡ **Gestão de Atendimento**: Botões para marcar "Em Atendimento" e "Concluído".
- ➕ **Agendamento Manual / Balcão**: Modal para cadastrar clientes que ligam ou comparecem presencialmente.
- 🔔 **Alertas Sonoros & Push**: Sintetizador harmônico Web Audio API e notificações no PC/celular a cada novo agendamento.

---

## 🛠️ Tecnologias

- **Frontend Cliente**: HTML5, Tailwind CSS, JavaScript Vanilla (ES6+), Web Audio API, Web Animations API, Canvas Confetti.
- **Frontend Gestor**: Dashboard Dark SaaS Glassmorphism, Web Crypto API (SHA-256), Web Notifications API.
- **Backend & Armazenamento**: Google Apps Script (Google Sheets API) + Repositório local sincronizado.
- **Deploy**: Vercel com rotas limpas (`/` para cliente, `/admin` para gestor).

---

## 🔐 Acesso Administrativo Inicial

- **URL**: `/admin` ou `/gestor`
- **E-mail**: `admin@lavapet.com`
- **Senha**: `admin123`

---

## 📦 Estrutura do Projeto

```
lavapet/
├── preview.html     # Portal do Cliente (Experiência Mobile First)
├── script.js        # Motor de regras, física, temas e agendamento do cliente
├── admin.html       # Portal Administrativo do Dono do Petshop
├── admin.js         # Motor de autenticação, agenda real e métricas
├── vercel.json      # Roteamento limpo no Vercel (/ e /admin)
└── README.md        # Documentação do projeto
```

---

## 📄 Licença e Autoria

Desenvolvido para **Lava Pet** por [4nten0r](https://github.com/4nten0r).
