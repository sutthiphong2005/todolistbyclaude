package repository

import (
	"database/sql"
	"time"

	"github.com/todoapp/backend/internal/model"
)

type TodoRepository struct {
	db *sql.DB
}

func NewTodoRepository(db *sql.DB) *TodoRepository {
	return &TodoRepository{db: db}
}

func (r *TodoRepository) FindPageByUser(userID, limit, offset int) ([]model.Todo, error) {
	rows, err := r.db.Query(
		`SELECT id, user_id, title, completed, created_at, updated_at
		 FROM todos WHERE user_id = $1
		 ORDER BY created_at DESC
		 LIMIT $2 OFFSET $3`,
		userID, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var todos []model.Todo
	for rows.Next() {
		var t model.Todo
		if err := rows.Scan(&t.ID, &t.UserID, &t.Title, &t.Completed, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		todos = append(todos, t)
	}
	if todos == nil {
		todos = []model.Todo{}
	}
	return todos, nil
}

func (r *TodoRepository) CountByUser(userID int) (int, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM todos WHERE user_id = $1`, userID).Scan(&count)
	return count, err
}

func (r *TodoRepository) FindByID(id, userID int) (*model.Todo, error) {
	t := &model.Todo{}
	err := r.db.QueryRow(
		`SELECT id, user_id, title, completed, created_at, updated_at FROM todos WHERE id = $1 AND user_id = $2`,
		id, userID,
	).Scan(&t.ID, &t.UserID, &t.Title, &t.Completed, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return t, nil
}

func (r *TodoRepository) Create(userID int, title string) (*model.Todo, error) {
	t := &model.Todo{}
	err := r.db.QueryRow(
		`INSERT INTO todos (user_id, title) VALUES ($1, $2) RETURNING id, user_id, title, completed, created_at, updated_at`,
		userID, title,
	).Scan(&t.ID, &t.UserID, &t.Title, &t.Completed, &t.CreatedAt, &t.UpdatedAt)
	return t, err
}

func (r *TodoRepository) Update(id, userID int, title *string, completed *bool) (*model.Todo, error) {
	existing, err := r.FindByID(id, userID)
	if err != nil {
		return nil, err
	}

	if title != nil {
		existing.Title = *title
	}
	if completed != nil {
		existing.Completed = *completed
	}
	existing.UpdatedAt = time.Now()

	_, err = r.db.Exec(
		`UPDATE todos SET title = $1, completed = $2, updated_at = $3 WHERE id = $4 AND user_id = $5`,
		existing.Title, existing.Completed, existing.UpdatedAt, id, userID,
	)
	if err != nil {
		return nil, err
	}
	return existing, nil
}

func (r *TodoRepository) Delete(id, userID int) error {
	res, err := r.db.Exec(`DELETE FROM todos WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}
