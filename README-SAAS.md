# Lava Pet SaaS — MODO 1 CLIENTE (single-tenant)

## Objetivo
Rodar o Lava Pet para **um único petshop**, com portal do cliente e painel
do gestor falando com o mesmo backend (`server.py`), sem Google Sheets e
sem complicação multi-tenant no dia a dia. O seletor de petshop continua
existindo, mas com 1 loja ele seleciona sozinho.

## Como executar (seu caso: 1 cliente)

1. Crie o `.env` a partir do exemplo:
```bash
cp .env.example .env
# edite ADMIN_EMAIL, ADMIN_PASSWORD, DEFAULT_PETSHOP_NAME e JWT_SECRET
```

2. Instale as dependências uma vez:
```bash
python -m pip install flask flask-cors python-dotenv bcrypt pyjwt
```

3. Inicie o backend (ele serve o front + a API na mesma porta):
```bash
python server.py
```

4. Acesse:
- Portal do cliente: `http://127.0.0.1:5000/`
- Painel do gestor: `http://127.0.0.1:5000/admin`
- Sobre: `http://127.0.0.1:5000/sobre`

5. Primeiro acesso: entre no `/admin` com `ADMIN_EMAIL` + `ADMIN_PASSWORD`
do `.env`. Depois abra **Config** e preencha nome, WhatsApp, horários,
serviços e Pix. O portal passa a refletir essa configuração
automaticamente (`GET /api/public/config`).

Não precisa de `python -m http.server` separado nem de planilha. Deixe
`api-config.js` com `LAVAPET_SAAS_URL = ''` (mesma origem) e
`LAVAPET_API_URL = ''` (planilha desativada).

## Endpoints usados no modo 1 cliente

### Públicos (portal, sem login)
- `GET /api/public/config` — configuração oficial da loja.
- `GET /api/public/slots?data=AAAA-MM-DD` — horários ocupados do dia.
- `POST /api/public/appointments` — cria reserva com trava anti-conflito
(409 `Horário já reservado` se duplicar).

## Endpoints principais

### POST /api/auth/login
Body:

```json
{
  "email": "admin@lavapet.com",
  "password": "123456"
}
```

Resposta:

```json
{
  "token": "jwt",
  "user": {
    "id": "...",
    "name": "Admin Master",
    "email": "admin@lavapet.com",
    "role": "super_admin",
    "petshop_id": "...",
    "selected_petshop_id": "..."
  },
  "petshops": []
}
```

### POST /api/auth/select-petshop
Header:

```http
Authorization: Bearer <token>
```

Body:

```json
{
  "petshop_id": "..."
}
```

### GET /api/petshops
Lista petshops acessíveis ao usuário autenticado.

### POST /api/petshops
Cria um novo petshop (apenas `super_admin`).

### GET /api/users
Lista usuários por petshop.

### POST /api/users
Cria novo usuário (super admin ou admin do petshop).

Body:

```json
{
  "name": "Maria Silva",
  "email": "maria@exemplo.com",
  "password": "senha-segura",
  "role": "funcionario",
  "petshop_id": "..."
}
```

Se `petshop_id` não for enviado, o backend usa o petshop selecionado pelo usuário autenticado.

### POST /api/auth/change-password
Troca a senha do usuário autenticado sem armazenar credenciais no navegador.

```json
{
  "current_password": "senha-atual",
  "new_password": "nova-senha"
}
```

### GET/POST /api/config
Lê ou grava as configurações do petshop selecionado.

### GET/POST /api/appointments
Lista ou cria agendamentos persistidos no petshop selecionado.

### PUT/DELETE /api/appointments/<id>
Atualiza status ou remove um agendamento existente.

## Regras de negócio
- `super_admin` pode ver todos os petshops e todos os usuários.
- `admin_petshop` só gerencia um petshop.
- `funcionario` mantém vínculo ao petshop.
- A seleção de petshop fica centralizada no backend, não no navegador.

## Uso no painel
- A autenticação usa JWT em memória durante a sessão.
- O seletor do cabeçalho troca o petshop no backend para usuários com acesso a mais de um tenant.
- Em **Config**, o gestor pode cadastrar usuários, alterar a própria senha e editar a configuração da empresa.
- Agendamentos manuais e alterações de status são enviados para o backend.
- `localStorage` ainda pode conter dados de compatibilidade da interface antiga, mas não é usado para validar autenticação, senha ou autorização de tenant.

## Produção
- Troque `JWT_SECRET`, `ADMIN_PASSWORD` e `APP_PORT` no ambiente de produção.
- Restrinja `CORS` ao domínio real do cliente.
- Use HTTPS e um servidor WSGI, como Gunicorn ou Waitress, em vez do servidor de desenvolvimento do Flask.
- Faça backup de `saas.db` ou migre para PostgreSQL antes de operar em escala.
