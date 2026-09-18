# Lava Pet SaaS multi-tenant

## Objetivo
Este backend fornece autenticação de usuários, gestão de petshops e seleção de tenant sem depender de `localStorage`.

## Variáveis de ambiente
Crie um arquivo `.env` com:

```env
JWT_SECRET=sua_chave_secreta_muito_segura
ADMIN_EMAIL=admin@lavapet.com
ADMIN_PASSWORD=123456
DEFAULT_PETSHOP_NAME=Lavapet Demo
APP_PORT=5000
```

## Como executar

Instale as dependências uma vez:

```bash
python -m pip install flask flask-cors python-dotenv bcrypt pyjwt
```

Inicie o backend:

```bash
python server.py
```

Em outro terminal, abra `admin.html` no navegador. O backend precisa estar ativo em `http://127.0.0.1:5000`.

O primeiro acesso usa os valores de `ADMIN_EMAIL` e `ADMIN_PASSWORD` do `.env`. Depois do login, o gestor pode selecionar o petshop no cabeçalho, configurar a empresa, cadastrar usuários e operar a agenda.

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
