# Todo App — Claude Code Context

## Project overview

Full-stack todo application with JWT authentication.

- **Backend**: Go 1.22 + Gin, PostgreSQL via `database/sql`, JWT (HS256)
- **Frontend**: React 18 + Vite + TailwindCSS 3, Axios
- **Infrastructure**: Docker Compose for PostgreSQL

## Repository layout

```
todolistsapp/
├── docker-compose.yml              # PostgreSQL on port 5432
├── backend/
│   ├── cmd/server/main.go          # entrypoint — wires DB, repos, handlers, Gin router
│   ├── internal/
│   │   ├── auth/jwt.go             # GenerateToken / ValidateToken (HS256)
│   │   ├── middleware/auth.go      # RequireAuth — reads Bearer header, sets user_id + username in ctx
│   │   ├── model/model.go          # shared structs: User, Todo, request/response types
│   │   ├── handler/auth.go         # POST /api/auth/login
│   │   ├── handler/todo.go         # GET/POST/PATCH/DELETE /api/todos
│   │   └── repository/
│   │       ├── user.go             # FindByUsername
│   │       └── todo.go             # FindAllByUser, FindByID, Create, Update, Delete
│   └── migrations/001_init.sql     # schema + seeded admin user (password: admin123)
└── frontend/
    ├── index.html
    ├── vite.config.js              # proxies /api → http://localhost:8080
    ├── tailwind.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx                 # top-level auth router (login ↔ todos)
        ├── index.css               # Tailwind directives
        ├── api/client.js           # axios instance — attaches Bearer token, handles 401
        ├── pages/
        │   ├── LoginPage.jsx
        │   └── TodosPage.jsx
        └── components/
            ├── AddTodo.jsx
            └── TodoItem.jsx        # inline edit, toggle complete, delete
```

## API routes

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/api/auth/login` | No | `handler.AuthHandler.Login` |
| GET | `/api/todos` | Bearer | `handler.TodoHandler.List` |
| POST | `/api/todos` | Bearer | `handler.TodoHandler.Create` |
| PATCH | `/api/todos/:id` | Bearer | `handler.TodoHandler.Update` |
| DELETE | `/api/todos/:id` | Bearer | `handler.TodoHandler.Delete` |

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `host=localhost port=5432 user=postgres password=postgres dbname=todos sslmode=disable` | PostgreSQL DSN |
| `JWT_SECRET` | `changeme-secret` | HMAC signing key — override in production |
| `PORT` | `8080` | Backend listen port |

## Running locally

```bash
# 1. Start database
docker compose up -d

# 2. Backend (from repo root)
cd backend && go run ./cmd/server/

# 3. Frontend (new terminal)
cd frontend && npm run dev
```

App: http://localhost:5173 — login: `admin` / `admin123`

## Key conventions

### Backend
- Handlers read `user_id` from Gin context (set by `middleware.RequireAuth`); never trust user-supplied IDs for ownership checks.
- All repository functions take `userID` as a scoping parameter — todos are always filtered by owner.
- `database/sql` only — no ORM. Raw SQL queries live in `repository/`.
- Error responses follow `gin.H{"error": "..."}` with appropriate HTTP status.
- `go mod tidy` after adding dependencies.

### Frontend
- `src/api/client.js` is the single axios instance. All API calls go through it — never import axios directly in components.
- JWT is stored in `localStorage` under the key `token`. The axios request interceptor attaches it automatically.
- A 401 response triggers automatic logout and redirect to login (axios response interceptor).
- State lives in `TodosPage` — child components receive data and callbacks as props.
- Tailwind only — no CSS modules or styled-components.

## Adding a new backend endpoint

1. Add request/response types to `internal/model/model.go` if needed.
2. Add SQL method to the relevant `internal/repository/` file.
3. Add handler method to `internal/handler/`.
4. Register the route in `cmd/server/main.go` (inside the `api` group for authenticated routes).

## Adding a new frontend page

1. Create `src/pages/NewPage.jsx`.
2. Add route logic in `src/App.jsx` (currently manual state-based routing — extend the condition there).
3. Use `client` from `src/api/client.js` for all HTTP calls.
