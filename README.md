# Lava Pet 🛁

Uma aplicação web moderna e intuitiva para agendamento de serviços de banho e tosa para pets. Interface elegante com gradientes, animações suaves e um fluxo de agendamento otimizado para dispositivos móveis.

🌐 **[Aceda à Aplicação](https://lavapet.vercel.app)**

---

## ✨ Funcionalidades

- 👤 **Identificação do Tutor** - Nome e WhatsApp para contacto
- 🐕 **Dados do Pet** - Nome, raça (opcional) e informações de identificação
- 🛁 **Seleção de Serviço** - Banho, Tosa ou Banho + Tosa
- 📅 **Agendamento por Data** - Calendário com restrição a datas futuras
- ⏰ **Horários Disponíveis** - Grade interativa de horários (08:00 às 17:00)
- ✅ **Confirmação Imediata** - Resumo do agendamento com todos os detalhes
- 💾 **Integração com Google Sheets** - Dados sincronizados em tempo real
- 📱 **Design Responsivo** - Otimizado para mobile com gradientes e animações
- 🎨 **UI/UX Premium** - Transições suaves, splash screen e feedback visual

---

## 🎯 Como Usar

### 1. Bem-vindo
A aplicação exibe uma splash screen animada com o logo "Lava Pet" por 2.5 segundos.

### 2. Identificação
Preencha seus dados:
- **Seu Nome**: Nome completo
- **WhatsApp / Telefone**: Número de contacto com código de área

Clique em "Avançar" para continuar.

### 3. Dados do Pet
Insira as informações do seu amigo peludo:
- **Nome do Pet**: Nome do seu cão/gato (obrigatório)
- **Raça**: Raça do pet (opcional)
- **Serviço Desejado**: 
  - 🛁 Apenas Banho
  - ✂️ Apenas Tosa
  - ✨ Banho Completo + Tosa

### 4. Escolha de Data
Selecione a data desejada no calendário. A aplicação permite apenas datas a partir de hoje.

### 5. Seleção de Horário
A grade de horários mostra:
- ✅ Horários **disponíveis** em branco (clicáveis)
- ❌ Horários **ocupados** em cinzento (desativados e riscados)

Horários funcionais: **08:00 até 17:00** (9 horários disponíveis por dia)

### 6. Confirmação
Revise o resumo do seu agendamento:
- Pet
- Serviço
- Data (formatada em português)
- Hora

Clique em "Fazer Novo Agendamento" para agendar outro pet.

---

## 🛠️ Tecnologias

- **Frontend**: HTML5, Tailwind CSS, Poppins Font, JavaScript Vanilla
- **Animações**: CSS Transitions, Tailwind Utilities
- **Backend**: Google Apps Script (Google Sheets API)
- **Deploy**: Vercel
- **Design System**: Gradientes azul/índigo com feedback visual interativo

---

## 📦 Estrutura do Projeto

```
lavapet/
├── preview.html     # Interface principal da aplicação
├── script.js        # Lógica e gestão de estado
├── vercel.json      # Configuração de deploy
└── README.md        # Este ficheiro
```

### preview.html
Marcação HTML com:
- Splash screen animada
- Formulário de login
- Cadastro do pet
- Seletor de data e horários
- Tela de confirmação

### script.js
Responsável por:
- Gestão de estado (dados do tutor, pet, horários)
- Navegação entre screens/ecrãs
- Geração dinâmica de horários
- Carregamento de horários ocupados do Google Sheets
- Validação de formulários
- Envio de agendamentos para Google Sheets
- Feedback visual com animações de carregamento

---

## 🔌 Integração com Google Sheets

A aplicação conecta-se a um Google Apps Script que expõe uma API web.

**Dados Recebidos (GET):**
A aplicação busca lista de agendamentos já realizados para marcar horários como ocupados.

Estrutura esperada:
```json
[
  { "data": "2026-07-21", "hora": "09:00" },
  { "data": "2026-07-21", "hora": "14:00" }
]
```

**Dados Enviados (POST):**
Quando um novo agendamento é confirmado:

```json
{
  "pet": "Bob (Poodle)",
  "cliente": "João Silva / (11) 98765-4321",
  "servico": "Banho e Tosa",
  "data": "2026-07-25",
  "hora": "10:00"
}
```

---

## 🚀 Instalação e Execução

### Localmente

1. Clone o repositório:
```bash
git clone https://github.com/4nten0r/lavapet.git
cd lavapet
```

2. Abra o ficheiro `preview.html` num navegador web.

### Servidor Local
```bash
# Com Python 3
python -m http.server 8000

# Com Node.js (http-server)
npx http-server
```

Aceda a `http://localhost:8000`

### Deploy no Vercel

Este projeto está configurado para deploy automático no Vercel:

1. Faça push para o repositório GitHub
2. Vercel detecta as mudanças automaticamente
3. O site é publicado em `https://lavapet.vercel.app`

---

## ⚙️ Configuração

### Conectar Google Sheets

1. Crie um Google Sheets com a estrutura de agendamentos
2. Crie um Google Apps Script ligado à folha
3. Configure o script para:
   - **GET**: Retornar JSON com horários ocupados
   - **POST**: Receber e gravar novos agendamentos
4. Publique o Apps Script como Web App
5. Copie o URL do Web App
6. Substitua `API_URL` em `script.js`:

```javascript
const API_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";
```

### Personalizar Horários

Em `script.js`, na função `gerarHorarios()`:

```javascript
const horarios = [
  "08:00", "09:00", "10:00", "11:00",
  "13:00", "14:00", "15:00", "16:00", "17:00"
];
```

Modifique este array com os horários desejados.

### Personalizar Serviços

Em `preview.html`, na seção de seleção de serviço:

```html
<option value="Banho">🛁 Apenas Banho</option>
<option value="Tosa">✂️ Apenas Tosa</option>
<option value="Banho e Tosa">✨ Banho Completo + Tosa</option>
```

---

## 🎨 Design e Cores

### Paleta de Cores
- **Primária**: Azul (#2563EB) - Gradiente azul/índigo
- **Secundária**: Verde/Teal (#10B981) - Para ações de confirmação
- **Neutros**: Cinza (#6B7280, #D1D5DB)
- **Fundos**: Gradiente azul claro a índigo

### Tipografia
- **Font**: Poppins (Google Fonts)
- **Pesos**: 300, 400, 500, 600, 700

### Animações
- Splash screen com fade out (500ms)
- Bounce animation no ícone 🛁
- Spin animation no botão de carregamento
- Transições suaves em hover (200ms)
- Efeitos de sombra e opacidade

---

## 🐛 Resolução de Problemas

### "Erro ao carregar horários"
- Verifique se a URL do Google Apps Script está correta
- Confirme que o script está publicado e acessível
- Verifique a consola do navegador (F12) para mais detalhes

### Horários não aparecem
- Confirme que a data foi selecionada
- Verifique se a data é válida (não pode ser no passado)
- Veja a consola para erros de JavaScript

### Agendamento não é guardado
- Verifique a URL do endpoint POST
- Confirme que o Google Apps Script aceita requisições POST
- Verifique as permissões e configurações do Apps Script
- Teste a conexão de internet

### Layout desalinhado no mobile
- Limpe o cache do navegador
- Tente num navegador diferente
- Verifique a resolução da tela

---

## 📱 Breakpoints Responsivos

- **Mobile**: até 640px
- **Tablet**: 641px até 1024px
- **Desktop**: acima de 1024px

A aplicação é otimizada para uso em **dispositivos móveis**.

---

## 📄 Licença

Este projeto está disponível para uso pessoal e profissional.

---

## 👤 Autor

**4nten0r** - [GitHub](https://github.com/4nten0r)

---

## 📞 Suporte

Para questões ou sugestões, abra uma [issue](https://github.com/4nten0r/lavapet/issues) no repositório.

---

## 🔄 Histórico de Versões

- **v1.0.0** (Junho 2026) - Lançamento inicial
  - Agendamento com validação de horários
  - Integração com Google Sheets
  - Design responsivo com animações
  - Splash screen e confirmação

---

**Versão**: 1.0.0  
**Última atualização**: Julho 2026  
**Status**: ✅ Ativo e em uso

