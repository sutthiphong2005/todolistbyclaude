package handler

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/todoapp/backend/internal/model"
	"github.com/todoapp/backend/internal/repository"
)

type TodoHandler struct {
	todoRepo *repository.TodoRepository
}

func NewTodoHandler(todoRepo *repository.TodoRepository) *TodoHandler {
	return &TodoHandler{todoRepo: todoRepo}
}

func (h *TodoHandler) List(c *gin.Context) {
	userID := c.GetInt("user_id")
	todos, err := h.todoRepo.FindAllByUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch todos"})
		return
	}
	c.JSON(http.StatusOK, todos)
}

func (h *TodoHandler) Create(c *gin.Context) {
	userID := c.GetInt("user_id")
	var req model.CreateTodoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	todo, err := h.todoRepo.Create(userID, req.Title)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create todo"})
		return
	}
	c.JSON(http.StatusCreated, todo)
}

func (h *TodoHandler) Update(c *gin.Context) {
	userID := c.GetInt("user_id")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req model.UpdateTodoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	todo, err := h.todoRepo.Update(id, userID, req.Title, req.Completed)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "todo not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update todo"})
		return
	}
	c.JSON(http.StatusOK, todo)
}

func (h *TodoHandler) Delete(c *gin.Context) {
	userID := c.GetInt("user_id")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.todoRepo.Delete(id, userID); err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "todo not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not delete todo"})
		return
	}
	c.Status(http.StatusNoContent)
}
