package repository

import (
	"database/sql"

	"github.com/todoapp/backend/internal/model"
)

type AttachmentRepository struct {
	db *sql.DB
}

func NewAttachmentRepository(db *sql.DB) *AttachmentRepository {
	return &AttachmentRepository{db: db}
}

func (r *AttachmentRepository) FindByTodo(todoID, userID int) ([]model.Attachment, error) {
	rows, err := r.db.Query(
		`SELECT id, todo_id, user_id, original_name, stored_name, size, mime_type, created_at
		 FROM attachments WHERE todo_id = $1 AND user_id = $2 ORDER BY created_at ASC`,
		todoID, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.Attachment
	for rows.Next() {
		var a model.Attachment
		if err := rows.Scan(&a.ID, &a.TodoID, &a.UserID, &a.OriginalName, &a.StoredName, &a.Size, &a.MimeType, &a.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, a)
	}
	if list == nil {
		list = []model.Attachment{}
	}
	return list, nil
}

func (r *AttachmentRepository) Create(todoID, userID int, originalName, storedName string, size int64, mimeType string) (*model.Attachment, error) {
	a := &model.Attachment{}
	err := r.db.QueryRow(
		`INSERT INTO attachments (todo_id, user_id, original_name, stored_name, size, mime_type)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, todo_id, user_id, original_name, stored_name, size, mime_type, created_at`,
		todoID, userID, originalName, storedName, size, mimeType,
	).Scan(&a.ID, &a.TodoID, &a.UserID, &a.OriginalName, &a.StoredName, &a.Size, &a.MimeType, &a.CreatedAt)
	return a, err
}

func (r *AttachmentRepository) FindByID(id, userID int) (*model.Attachment, error) {
	a := &model.Attachment{}
	err := r.db.QueryRow(
		`SELECT id, todo_id, user_id, original_name, stored_name, size, mime_type, created_at
		 FROM attachments WHERE id = $1 AND user_id = $2`,
		id, userID,
	).Scan(&a.ID, &a.TodoID, &a.UserID, &a.OriginalName, &a.StoredName, &a.Size, &a.MimeType, &a.CreatedAt)
	return a, err
}

func (r *AttachmentRepository) Delete(id, userID int) error {
	res, err := r.db.Exec(`DELETE FROM attachments WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}
