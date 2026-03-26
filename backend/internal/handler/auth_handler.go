package handler

import (
	"errors"
	"net/http"

	"halo/backend/internal/handler/httputil"
	"halo/backend/internal/service"
)

// AuthHandler handles /v1/auth/* endpoints.
type AuthHandler struct {
	authService *service.AuthService
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// registerRequest matches the OpenAPI RegisterRequest schema.
type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// loginRequest matches the OpenAPI LoginRequest schema.
type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Register handles POST /v1/auth/register.
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.BadRequest(w, err.Error())
		return
	}

	result, err := h.authService.Register(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, service.ErrEmailTaken) {
			httputil.Conflict(w, "email already registered")
			return
		}
		// Validation errors (email empty, password too short) are 400.
		httputil.BadRequest(w, err.Error())
		return
	}

	httputil.EncodeJSON(w, http.StatusCreated, result)
}

// Login handles POST /v1/auth/login.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.BadRequest(w, err.Error())
		return
	}

	result, err := h.authService.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			httputil.Unauthorized(w, "invalid email or password")
			return
		}
		httputil.BadRequest(w, err.Error())
		return
	}

	httputil.EncodeJSON(w, http.StatusOK, result)
}
