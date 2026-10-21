package httpapi

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"runtime/debug"
	"slices"
	"strings"
	"time"

	"flippilot/internal/ai"
	"flippilot/internal/domain"
	"flippilot/internal/photos"
	"flippilot/internal/store"
)

const (
	maxBody    = 1 << 20
	sessionTTL = 30 * 24 * time.Hour
)

type Server struct {
	store   *store.Store
	photos  photos.Storage
	ai      *ai.Client
	origins []string
	log     *slog.Logger
	mux     *http.ServeMux
}

func New(st *store.Store, ph photos.Storage, aiClient *ai.Client, origins []string, log *slog.Logger) *Server {
	s := &Server{store: st, photos: ph, ai: aiClient, origins: origins, log: log, mux: http.NewServeMux()}
	s.routes()
	return s
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	rw := &statusWriter{ResponseWriter: w, status: http.StatusOK}
	defer func() {
		if p := recover(); p != nil {
			s.log.Error("panic", "err", p, "stack", string(debug.Stack()))
			writeErr(rw, http.StatusInternalServerError, "internal error")
		}
		s.log.Info("request", "method", r.Method, "path", r.URL.Path, "status", rw.status, "dur", time.Since(start))
	}()
	s.cors(rw, r)
	if r.Method == http.MethodOptions {
		rw.WriteHeader(http.StatusNoContent)
		return
	}
	limit := int64(maxBody)
	if r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/photos") {
		limit = maxUploadBody
	}
	r.Body = http.MaxBytesReader(rw, r.Body, limit)
	s.mux.ServeHTTP(rw, r)
}

func (s *Server) cors(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return
	}
	if !slices.Contains(s.origins, "*") && !slices.Contains(s.origins, origin) {
		return
	}
	h := w.Header()
	h.Set("Access-Control-Allow-Origin", origin)
	h.Set("Vary", "Origin")
	h.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
	h.Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
	h.Set("Access-Control-Max-Age", "600")
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

type authed func(w http.ResponseWriter, r *http.Request, u domain.User)

func bearer(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if t, ok := strings.CutPrefix(h, "Bearer "); ok {
		return strings.TrimSpace(t)
	}
	return ""
}

func (s *Server) optionalUser(r *http.Request) (domain.User, bool) {
	tok := bearer(r)
	if tok == "" {
		return domain.User{}, false
	}
	u, err := s.store.UserBySession(r.Context(), tok)
	return u, err == nil
}

func (s *Server) auth(h authed) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := s.optionalUser(r)
		if !ok {
			writeErr(w, http.StatusUnauthorized, "sign in required")
			return
		}
		h(w, r, u)
	}
}

func (s *Server) settingsFor(r *http.Request) (domain.Settings, error) {
	if u, ok := s.optionalUser(r); ok {
		return s.store.Settings(r.Context(), u.ID)
	}
	return domain.DefaultSettings(), nil
}

func (s *Server) rulesFor(r *http.Request) (domain.DealRules, error) {
	if u, ok := s.optionalUser(r); ok {
		return s.store.DealRules(r.Context(), u.ID)
	}
	return domain.DefaultDealRules(), nil
}

func decode(w http.ResponseWriter, r *http.Request, v any) bool {
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(v); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]any{"error": msg})
}

func writeInvalid(w http.ResponseWriter, errs []string) {
	writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "invalid input", "details": errs})
}

func (s *Server) fail(w http.ResponseWriter, err error) {
	if errors.Is(err, store.ErrNotFound) {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	s.log.Error("handler", "err", err)
	writeErr(w, http.StatusInternalServerError, "internal error")
}
