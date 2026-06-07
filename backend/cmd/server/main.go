package main

import (
	"database/sql"
	"log"
	"os"
	"path/filepath"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
	"github.com/todoapp/backend/internal/handler"
	"github.com/todoapp/backend/internal/middleware"
	"github.com/todoapp/backend/internal/repository"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "host=localhost port=5433 user=postgres password=postgres dbname=todos sslmode=disable"
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("failed to open db: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("failed to connect to db: %v", err)
	}

	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = filepath.Join(".", "uploads")
	}
	os.MkdirAll(uploadDir, 0755)

	userRepo := repository.NewUserRepository(db)
	todoRepo := repository.NewTodoRepository(db)
	attachRepo := repository.NewAttachmentRepository(db)

	authHandler := handler.NewAuthHandler(userRepo)
	todoHandler := handler.NewTodoHandler(todoRepo)
	attachHandler := handler.NewAttachmentHandler(attachRepo, todoRepo, uploadDir)

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:5174", "http://localhost:5175"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	r.POST("/api/auth/login", authHandler.Login)

	api := r.Group("/api", middleware.RequireAuth())
	{
		api.GET("/todos", todoHandler.List)
		api.POST("/todos", todoHandler.Create)
		api.PATCH("/todos/:id", todoHandler.Update)
		api.DELETE("/todos/:id", todoHandler.Delete)

		api.GET("/todos/:id/attachments", attachHandler.List)
		api.POST("/todos/:id/attachments", attachHandler.Upload)
		api.GET("/todos/:id/attachments/:aid/download", attachHandler.Download)
		api.DELETE("/todos/:id/attachments/:aid", attachHandler.Delete)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}
	log.Printf("server listening on :%s", port)
	r.Run(":" + port)
}
