# Backend Skills (Go + Gin + PostgreSQL)

Common recipes for the `backend/` directory. Each section is self-contained — copy, adapt, run.

---

## Running

### Start the server

```bash
cd backend
go run ./cmd/server/
# listens on :8080
```

### Build a production binary

```bash
cd backend
go build -o server ./cmd/server/
./server
```

### Run tests

```bash
cd backend
go test ./...
```

---

## Dependencies

### Add a new package

```bash
cd backend
go get github.com/some/package@v1.2.3
go mod tidy
```

---

## Authentication

### Hash a password (for seeding users)

```bash
cd backend
go run - <<'EOF'
package main
import (
    "fmt"
    "golang.org/x/crypto/bcrypt"
)
func main() {
    h, _ := bcrypt.GenerateFromPassword([]byte("yourpassword"), 10)
    fmt.Println(string(h))
}
EOF
```

Paste the output into `migrations/001_init.sql` as the `password_hash` value.

### Generate a JWT manually (for testing)

```bash
curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | jq .token
```

### Call a protected endpoint with curl

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | jq -r .token)

curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/todos
```

---

## Adding a new protected endpoint

Follow these four steps in order:

**1. Model** — add request/response types to `internal/model/model.go`:

```go
type CreateFooRequest struct {
    Name string `json:"name" binding:"required"`
}
```

**2. Repository** — add a method to `internal/repository/foo.go`:

```go
func (r *FooRepository) Create(userID int, name string) (*model.Foo, error) {
    f := &model.Foo{}
    err := r.db.QueryRow(
        `INSERT INTO foos (user_id, name) VALUES ($1, $2) RETURNING id, user_id, name, created_at`,
        userID, name,
    ).Scan(&f.ID, &f.UserID, &f.Name, &f.CreatedAt)
    return f, err
}
```

**3. Handler** — add a method to `internal/handler/foo.go`:

```go
func (h *FooHandler) Create(c *gin.Context) {
    userID := c.GetInt("user_id")   // always scope by user — never trust client-supplied IDs
    var req model.CreateFooRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    foo, err := h.fooRepo.Create(userID, req.Name)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create foo"})
        return
    }
    c.JSON(http.StatusCreated, foo)
}
```

**4. Route** — register in `cmd/server/main.go` inside the `api` group:

```go
api.POST("/foos", fooHandler.Create)
```

---

## Database migrations

### Apply initial schema (automatic on first `docker compose up`)

Migrations in `backend/migrations/` are mounted into `/docker-entrypoint-initdb.d` and run once automatically when the volume is empty.

### Apply a new migration manually

```bash
docker compose exec db psql -U postgres -d todos \
  -f /docker-entrypoint-initdb.d/002_new_migration.sql
```

### Connect interactively

```bash
docker compose exec db psql -U postgres -d todos
```

### Useful psql queries

```sql
-- list all users
SELECT id, username, created_at FROM users;

-- list all todos for admin
SELECT t.* FROM todos t JOIN users u ON t.user_id = u.id WHERE u.username = 'admin';

-- manually mark a todo complete
UPDATE todos SET completed = true WHERE id = 1;
```

### Full database reset

```bash
docker compose down -v   # removes the postgres_data volume
docker compose up -d     # recreates and re-runs migrations
```
