package httpapi

import (
	"errors"
	"io"
	"net/http"
	"regexp"
	"time"

	"flippilot/internal/domain"
	"flippilot/internal/photos"
	"flippilot/internal/store"
)

const (
	maxUploadBody   = 64 << 20
	maxPhotoFile    = 15 << 20
	maxFilesPerPost = 10
)

var photoID = regexp.MustCompile(`^[0-9a-f]{32}$`)

func withURLs(p domain.Photo) domain.Photo {
	p.URL = "/api/photos/" + p.ID
	p.ThumbURL = "/api/photos/" + p.ID + "/thumb"
	return p
}

func photoPtr(m map[string]domain.Photo, id string) *domain.Photo {
	if p, ok := m[id]; ok {
		p = withURLs(p)
		return &p
	}
	return nil
}

type rejected struct {
	File  string `json:"file"`
	Error string `json:"error"`
}

func (s *Server) uploadPhotos(w http.ResponseWriter, r *http.Request, u domain.User) {
	vehicleID := r.PathValue("id")
	if err := r.ParseMultipartForm(16 << 20); err != nil {
		var mbe *http.MaxBytesError
		if errors.As(err, &mbe) {
			writeErr(w, http.StatusRequestEntityTooLarge, "upload is larger than 64 MB")
			return
		}
		writeErr(w, http.StatusBadRequest, "expected multipart/form-data with a \"photos\" field")
		return
	}
	defer r.MultipartForm.RemoveAll()
	files := r.MultipartForm.File["photos"]
	if len(files) == 0 {
		writeInvalid(w, []string{"Attach at least one photo in the \"photos\" field."})
		return
	}
	if len(files) > maxFilesPerPost {
		writeInvalid(w, []string{"Upload at most 10 photos at a time."})
		return
	}
	n, err := s.store.CountPhotos(r.Context(), u.ID, vehicleID)
	if err != nil {
		s.fail(w, err)
		return
	}
	if n+len(files) > store.MaxPhotosPerVehicle {
		writeInvalid(w, []string{"A vehicle can have at most 30 photos."})
		return
	}

	saved, bad := []domain.Photo{}, []rejected{}
	for _, fh := range files {
		if fh.Size > maxPhotoFile {
			bad = append(bad, rejected{fh.Filename, "file is larger than 15 MB"})
			continue
		}
		f, err := fh.Open()
		if err != nil {
			bad = append(bad, rejected{fh.Filename, "could not read file"})
			continue
		}
		data, err := io.ReadAll(io.LimitReader(f, maxPhotoFile+1))
		f.Close()
		if err != nil || len(data) > maxPhotoFile {
			bad = append(bad, rejected{fh.Filename, "could not read file"})
			continue
		}
		p, err := photos.Process(data)
		if err != nil {
			msg := "could not process image"
			if errors.Is(err, photos.ErrUnsupported) || errors.Is(err, photos.ErrTooLarge) {
				msg = err.Error()
			}
			bad = append(bad, rejected{fh.Filename, msg})
			continue
		}
		id := store.NewPhotoID()
		if err := s.storePhoto(id, p); err != nil {
			s.fail(w, err)
			return
		}
		ph, err := s.store.AddPhoto(r.Context(), u.ID, domain.Photo{ID: id, VehicleID: vehicleID, Width: p.Width, Height: p.Height, Size: len(p.Full)})
		if err != nil {
			s.removePhotoFiles(id)
			if errors.Is(err, store.ErrPhotoLimit) {
				bad = append(bad, rejected{fh.Filename, err.Error()})
				continue
			}
			s.fail(w, err)
			return
		}
		saved = append(saved, withURLs(ph))
	}
	status := http.StatusCreated
	if len(saved) == 0 {
		status = http.StatusUnprocessableEntity
	}
	writeJSON(w, status, map[string]any{"photos": saved, "rejected": bad})
}

func (s *Server) storePhoto(id string, p photos.Processed) error {
	if err := s.photos.Put(id+".jpg", p.Full); err != nil {
		return err
	}
	if err := s.photos.Put(id+"_thumb.jpg", p.Thumb); err != nil {
		s.photos.Delete(id + ".jpg")
		return err
	}
	return nil
}

func (s *Server) removePhotoFiles(id string) {
	for _, k := range []string{id + ".jpg", id + "_thumb.jpg"} {
		if err := s.photos.Delete(k); err != nil {
			s.log.Error("delete photo file", "key", k, "err", err)
		}
	}
}

func (s *Server) listPhotos(w http.ResponseWriter, r *http.Request, u domain.User) {
	items, err := s.store.Photos(r.Context(), u.ID, r.PathValue("id"))
	if err != nil {
		s.fail(w, err)
		return
	}
	for i := range items {
		items[i] = withURLs(items[i])
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) setMainPhoto(w http.ResponseWriter, r *http.Request, u domain.User) {
	p, err := s.store.SetMainPhoto(r.Context(), u.ID, r.PathValue("id"))
	if err != nil {
		s.fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, withURLs(p))
}

func (s *Server) deletePhoto(w http.ResponseWriter, r *http.Request, u domain.User) {
	p, err := s.store.DeletePhoto(r.Context(), u.ID, r.PathValue("id"))
	if err != nil {
		s.fail(w, err)
		return
	}
	s.removePhotoFiles(p.ID)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) servePhoto(thumb bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		if !photoID.MatchString(id) {
			writeErr(w, http.StatusNotFound, "not found")
			return
		}
		ok, err := s.store.PhotoExists(r.Context(), id)
		if err != nil {
			s.fail(w, err)
			return
		}
		if !ok {
			writeErr(w, http.StatusNotFound, "not found")
			return
		}
		key := id + ".jpg"
		if thumb {
			key = id + "_thumb.jpg"
		}
		f, err := s.photos.Open(key)
		if errors.Is(err, photos.ErrNotFound) {
			writeErr(w, http.StatusNotFound, "not found")
			return
		}
		if err != nil {
			s.fail(w, err)
			return
		}
		defer f.Close()
		h := w.Header()
		h.Set("Content-Type", "image/jpeg")
		h.Set("Cache-Control", "private, max-age=31536000, immutable")
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Content-Security-Policy", "default-src 'none'")
		http.ServeContent(w, r, key, time.Time{}, f)
	}
}
