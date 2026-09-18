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

```bash
python server.py
```

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

## Regras de negócio
- `super_admin` pode ver todos os petshops e todos os usuários.
- `admin_petshop` só gerencia um petshop.
- `funcionario` mantém vínculo ao petshop.
- A seleção de petshop fica centralizada no backend, não no navegador.

## Próximo passo recomendado
Conectar o frontend para consumir esses endpoints e remover qualquer uso de `localStorage` na autenticação e no contexto de empresa.
