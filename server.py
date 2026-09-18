import os
import sqlite3
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import bcrypt
import jwt
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "saas.db"
JWT_SECRET = os.getenv("JWT_SECRET", "change_me_super_secret")
JWT_ALGORITHM = "HS256"
APP_PORT = int(os.getenv("APP_PORT", "5000"))
DEFAULT_ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@lavapet.com")
DEFAULT_ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "123456")
DEFAULT_PETSHOP_NAME = os.getenv("DEFAULT_PETSHOP_NAME", "Lavapet Demo")

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS petshops (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            petshop_id TEXT,
            selected_petshop_id TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (petshop_id) REFERENCES petshops(id)
        )
        """
    )
    conn.commit()

    petshop_row = conn.execute("SELECT id FROM petshops WHERE slug = ?", ("lavapet-demo",)).fetchone()
    if not petshop_row:
        petshop_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO petshops (id, name, slug, created_at) VALUES (?, ?, ?, ?)",
            (petshop_id, DEFAULT_PETSHOP_NAME, "lavapet-demo", datetime.utcnow().isoformat()),
        )
    else:
        petshop_id = petshop_row["id"]

    user_row = conn.execute("SELECT id FROM users WHERE email = ?", (DEFAULT_ADMIN_EMAIL.lower(),)).fetchone()
    if not user_row:
        password_hash = bcrypt.hashpw(DEFAULT_ADMIN_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        conn.execute(
            """
            INSERT INTO users (id, name, email, password_hash, role, petshop_id, selected_petshop_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid.uuid4()),
                "Admin Master",
                DEFAULT_ADMIN_EMAIL.lower(),
                password_hash,
                "super_admin",
                petshop_id,
                petshop_id,
                datetime.utcnow().isoformat(),
            ),
        )

    conn.commit()
    conn.close()


def create_user_record(name, email, password, role, petshop_id=None):
    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (email.lower(),)).fetchone()
    if existing:
        conn.close()
        raise ValueError("Usuário já existe.")

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user_id = str(uuid.uuid4())
    conn.execute(
        """
        INSERT INTO users (id, name, email, password_hash, role, petshop_id, selected_petshop_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (user_id, name, email.lower(), password_hash, role, petshop_id, petshop_id, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()
    return user_id


def decode_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception:
        return None


def get_current_user_from_request():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload:
        return None

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (payload.get("sub"),)).fetchone()
    conn.close()
    if not user:
        return None
    return dict(user)


def user_has_access(user, petshop_id):
    if not petshop_id:
        return True
    if user["role"] == "super_admin":
        return True
    if user["petshop_id"] == petshop_id:
        return True
    return False


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "service": "lavapet-saas", "timestamp": datetime.utcnow().isoformat()})


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email e senha obrigatórios."}), 400

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()

    if not user:
        return jsonify({"error": "Credenciais inválidas."}), 401

    if not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        return jsonify({"error": "Credenciais inválidas."}), 401

    petshops = []
    conn = get_db()
    if user["role"] == "super_admin":
        rows = conn.execute("SELECT * FROM petshops ORDER BY name ASC").fetchall()
    else:
        rows = conn.execute("SELECT * FROM petshops WHERE id = ? ORDER BY name ASC", (user["petshop_id"],)).fetchall()
    for row in rows:
        petshops.append(dict(row))
    conn.close()

    selected_petshop_id = user["selected_petshop_id"] or (petshops[0]["id"] if petshops else None)
    token = jwt.encode({
        "sub": user["id"],
        "role": user["role"],
        "selected_petshop_id": selected_petshop_id,
        "exp": datetime.utcnow() + timedelta(hours=8)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return jsonify({
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "petshop_id": user["petshop_id"],
            "selected_petshop_id": selected_petshop_id,
        },
        "petshops": petshops,
    })


@app.route("/api/auth/select-petshop", methods=["POST"])
def select_petshop():
    user = get_current_user_from_request()
    if not user:
        return jsonify({"error": "Token inválido."}), 401

    data = request.get_json(silent=True) or {}
    petshop_id = data.get("petshop_id")
    if not petshop_id:
        return jsonify({"error": "petshop_id obrigatório."}), 400

    if user["role"] != "super_admin" and user["petshop_id"] != petshop_id:
        return jsonify({"error": "Você não tem acesso a este petshop."}), 403

    conn = get_db()
    exists = conn.execute("SELECT id FROM petshops WHERE id = ?", (petshop_id,)).fetchone()
    if not exists:
        conn.close()
        return jsonify({"error": "Petshop não encontrado."}), 404

    conn.execute("UPDATE users SET selected_petshop_id = ? WHERE id = ?", (petshop_id, user["id"]))
    conn.commit()
    conn.close()

    return jsonify({"ok": True, "selected_petshop_id": petshop_id})


@app.route("/api/me", methods=["GET"])
def me():
    user = get_current_user_from_request()
    if not user:
        return jsonify({"error": "Token inválido."}), 401

    conn = get_db()
    if user["role"] == "super_admin":
        petshops = conn.execute("SELECT * FROM petshops ORDER BY name ASC").fetchall()
    else:
        petshops = conn.execute("SELECT * FROM petshops WHERE id = ? ORDER BY name ASC", (user["petshop_id"],)).fetchall()
    conn.close()

    return jsonify({
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "petshop_id": user["petshop_id"],
            "selected_petshop_id": user["selected_petshop_id"],
        },
        "petshops": [dict(row) for row in petshops],
    })


@app.route("/api/petshops", methods=["GET", "POST"])
def petshops():
    user = get_current_user_from_request()
    if not user:
        return jsonify({"error": "Token inválido."}), 401

    if request.method == "GET":
        conn = get_db()
        if user["role"] == "super_admin":
            rows = conn.execute("SELECT * FROM petshops ORDER BY name ASC").fetchall()
        else:
            rows = conn.execute("SELECT * FROM petshops WHERE id = ? ORDER BY name ASC", (user["petshop_id"],)).fetchall()
        conn.close()
        return jsonify({"petshops": [dict(row) for row in rows]})

    if user["role"] != "super_admin":
        return jsonify({"error": "Apenas super admin pode criar petshop."}), 403

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    slug = (data.get("slug") or "").strip().lower().replace(" ", "-")
    if not name or not slug:
        return jsonify({"error": "Nome e slug são obrigatórios."}), 400

    conn = get_db()
    exists = conn.execute("SELECT id FROM petshops WHERE slug = ?", (slug,)).fetchone()
    if exists:
        conn.close()
        return jsonify({"error": "Slug já existente."}), 409

    petshop_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO petshops (id, name, slug, created_at) VALUES (?, ?, ?, ?)",
        (petshop_id, name, slug, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "petshop": {"id": petshop_id, "name": name, "slug": slug}}), 201


@app.route("/api/users", methods=["GET", "POST"])
def users():
    user = get_current_user_from_request()
    if not user:
        return jsonify({"error": "Token inválido."}), 401

    if request.method == "GET":
        petshop_id = request.args.get("petshop_id")
        if user["role"] != "super_admin" and user["petshop_id"] != petshop_id:
            return jsonify({"error": "Sem acesso."}), 403

        conn = get_db()
        if petshop_id:
            rows = conn.execute("SELECT * FROM users WHERE petshop_id = ? ORDER BY name ASC", (petshop_id,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM users ORDER BY name ASC").fetchall()
        conn.close()
        return jsonify({"users": [dict(row) for row in rows]})

    if user["role"] not in ("super_admin", "admin_petshop"):
        return jsonify({"error": "Sem permissão para criar usuários."}), 403

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = (data.get("role") or "admin_petshop").strip().lower()
    petshop_id = data.get("petshop_id")

    if not name or not email or len(password) < 6:
        return jsonify({"error": "Nome, email e senha com pelo menos 6 caracteres são obrigatórios."}), 400

    allowed_roles = {"admin_petshop", "funcionario"}
    if user["role"] == "super_admin":
        allowed_roles.add("super_admin")
    if role not in allowed_roles:
        return jsonify({"error": "Role inválida."}), 400

    if user["role"] != "super_admin" and user["petshop_id"] != petshop_id:
        return jsonify({"error": "Você só pode criar usuários do seu petshop."}), 403

    try:
        user_id = create_user_record(name, email, password, role, petshop_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 409

    return jsonify({"ok": True, "user": {"id": user_id, "name": name, "email": email, "role": role, "petshop_id": petshop_id}}), 201


@app.before_request
def ensure_db_ready():
    init_db()


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=APP_PORT, debug=True)
