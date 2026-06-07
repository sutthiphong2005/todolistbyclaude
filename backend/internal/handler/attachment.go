package handler

import (
	"database/sql"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/todoapp/backend/internal/repository"
)

const maxUploadSize = 10 << 20 // 10 MB

type AttachmentHandler struct {
	attachRepo *repository.AttachmentRepository
	todoRepo   *repository.TodoRepository
	uploadDir  string
}

func NewAttachmentHandler(attachRepo *repository.AttachmentRepository, todoRepo *repository.TodoRepository, uploadDir string) *AttachmentHandler {
	return &AttachmentHandler{attachRepo: attachRepo, todoRepo: todoRepo, uploadDir: uploadDir}
}

func (h *AttachmentHandler) List(c *gin.Context) {
	userID := c.GetInt("user_id")
	todoID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid todo id"})
		return
	}

	// ensure todo belongs to user
	if _, err := h.todoRepo.FindByID(todoID, userID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "todo not found"})
		return
	}

	list, err := h.attachRepo.FindByTodo(todoID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch attachments"})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *AttachmentHandler) Upload(c *gin.Context) {
	userID := c.GetInt("user_id")
	todoID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid todo id"})
		return
	}

	if _, err := h.todoRepo.FindByID(todoID, userID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "todo not found"})
		return
	}

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxUploadSize)
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file field required (max 10MB)"})
		return
	}
	defer file.Close()

	ext := filepath.Ext(header.Filename)
	storedName := uuid.New().String() + ext
	destPath := filepath.Join(h.uploadDir, storedName)

	dest, err := os.Create(destPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save file"})
		return
	}
	defer dest.Close()

	size, err := io.Copy(dest, file)
	if err != nil {
		os.Remove(destPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not write file"})
		return
	}

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" || mimeType == "application/octet-stream" {
		mimeType = mime.TypeByExtension(ext)
		if mimeType == "" {
			mimeType = "application/octet-stream"
		}
	}

	attachment, err := h.attachRepo.Create(todoID, userID, header.Filename, storedName, size, mimeType)
	if err != nil {
		os.Remove(destPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save attachment record"})
		return
	}
	c.JSON(http.StatusCreated, attachment)
}

func (h *AttachmentHandler) Download(c *gin.Context) {
	userID := c.GetInt("user_id")
	aid, err := strconv.Atoi(c.Param("aid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid attachment id"})
		return
	}

	a, err := h.attachRepo.FindByID(aid, userID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "attachment not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch attachment"})
		return
	}

	filePath := filepath.Join(h.uploadDir, a.StoredName)
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, a.OriginalName))
	c.File(filePath)
}

func (h *AttachmentHandler) Delete(c *gin.Context) {
	userID := c.GetInt("user_id")
	aid, err := strconv.Atoi(c.Param("aid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid attachment id"})
		return
	}

	a, err := h.attachRepo.FindByID(aid, userID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "attachment not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch attachment"})
		return
	}

	if err := h.attachRepo.Delete(aid, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not delete attachment"})
		return
	}

	os.Remove(filepath.Join(h.uploadDir, a.StoredName))
	c.Status(http.StatusNoContent)
}
