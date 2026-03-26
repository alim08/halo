package handler

import (
	"net/http"

	"halo/backend/internal/auth"
	"halo/backend/internal/handler/httputil"
	"halo/backend/internal/service"
)

// PhotoUploadHandler handles POST /v1/me/photos/upload-url.
type PhotoUploadHandler struct {
	uploadService *service.PhotoUploadService
}

// NewPhotoUploadHandler creates a new PhotoUploadHandler.
func NewPhotoUploadHandler(uploadService *service.PhotoUploadService) *PhotoUploadHandler {
	return &PhotoUploadHandler{uploadService: uploadService}
}

type createUploadURLRequest struct {
	ContentType string `json:"content_type"`
}

// CreateUploadURL returns a presigned S3 PUT URL for photo upload.
func (h *PhotoUploadHandler) CreateUploadURL(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserIDFromContext(r.Context())
	if userID == "" {
		httputil.Unauthorized(w, "not authenticated")
		return
	}

	var req createUploadURLRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.BadRequest(w, err.Error())
		return
	}

	if req.ContentType == "" {
		httputil.BadRequest(w, "content_type is required")
		return
	}

	if !service.ValidContentTypes[req.ContentType] {
		httputil.BadRequest(w, "unsupported content_type")
		return
	}

	resp, _, err := h.uploadService.CreateUploadURL(r.Context(), &service.UploadURLRequest{
		UserID:      userID,
		ContentType: req.ContentType,
	})
	if err != nil {
		httputil.InternalError(w)
		return
	}

	httputil.EncodeJSON(w, http.StatusOK, resp)
}
