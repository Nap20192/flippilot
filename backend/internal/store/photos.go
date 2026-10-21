package store

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"strings"

	"flippilot/internal/domain"
)

const MaxPhotosPerVehicle = 30

var ErrPhotoLimit = errors.New("photo limit reached for this vehicle")

func NewPhotoID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

const photoCols = `id, vehicle_id, width, height, size, is_main, created_at`

type scanner interface{ Scan(...any) error }

func scanPhoto(r scanner) (domain.Photo, error) {
	var p domain.Photo
	var main int
	err := r.Scan(&p.ID, &p.VehicleID, &p.Width, &p.Height, &p.Size, &main, &p.CreatedAt)
	p.Main = main == 1
	return p, err
}

func (s *Store) CountPhotos(ctx context.Context, userID int64, vehicleID string) (int, error) {
	var n int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM photos WHERE user_id = ? AND vehicle_id = ?`, userID, vehicleID).Scan(&n)
	return n, err
}

func (s *Store) AddPhoto(ctx context.Context, userID int64, p domain.Photo) (domain.Photo, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return p, err
	}
	defer tx.Rollback()
	var n, mains int
	if err := tx.QueryRowContext(ctx, `SELECT COUNT(*), COALESCE(SUM(is_main), 0) FROM photos WHERE user_id = ? AND vehicle_id = ?`,
		userID, p.VehicleID).Scan(&n, &mains); err != nil {
		return p, err
	}
	if n >= MaxPhotosPerVehicle {
		return p, ErrPhotoLimit
	}
	p.Main = mains == 0
	p.CreatedAt = now()
	if _, err := tx.ExecContext(ctx, `INSERT INTO photos(`+photoCols+`, user_id) VALUES(?,?,?,?,?,?,?,?)`,
		p.ID, p.VehicleID, p.Width, p.Height, p.Size, boolInt(p.Main), p.CreatedAt, userID); err != nil {
		return p, err
	}
	return p, tx.Commit()
}

func (s *Store) Photos(ctx context.Context, userID int64, vehicleID string) ([]domain.Photo, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT `+photoCols+` FROM photos WHERE user_id = ? AND vehicle_id = ?
		ORDER BY is_main DESC, rowid`, userID, vehicleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.Photo{}
	for rows.Next() {
		p, err := scanPhoto(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *Store) PhotoExists(ctx context.Context, id string) (bool, error) {
	var one int
	err := s.db.QueryRowContext(ctx, `SELECT 1 FROM photos WHERE id = ?`, id).Scan(&one)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

func (s *Store) MainPhotos(ctx context.Context, userID int64, vehicleIDs []string) (map[string]domain.Photo, error) {
	out := map[string]domain.Photo{}
	if len(vehicleIDs) == 0 {
		return out, nil
	}
	args := []any{userID}
	for _, id := range vehicleIDs {
		args = append(args, id)
	}
	q := `SELECT ` + photoCols + ` FROM photos WHERE user_id = ? AND is_main = 1 AND vehicle_id IN (?` +
		strings.Repeat(",?", len(vehicleIDs)-1) + `)`
	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		p, err := scanPhoto(rows)
		if err != nil {
			return nil, err
		}
		out[p.VehicleID] = p
	}
	return out, rows.Err()
}

func (s *Store) SetMainPhoto(ctx context.Context, userID int64, id string) (domain.Photo, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Photo{}, err
	}
	defer tx.Rollback()
	p, err := scanPhoto(tx.QueryRowContext(ctx, `SELECT `+photoCols+` FROM photos WHERE user_id = ? AND id = ?`, userID, id))
	if errors.Is(err, sql.ErrNoRows) {
		return p, ErrNotFound
	}
	if err != nil {
		return p, err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE photos SET is_main = (id = ?) WHERE user_id = ? AND vehicle_id = ?`, id, userID, p.VehicleID); err != nil {
		return p, err
	}
	p.Main = true
	return p, tx.Commit()
}

func (s *Store) DeletePhoto(ctx context.Context, userID int64, id string) (domain.Photo, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Photo{}, err
	}
	defer tx.Rollback()
	p, err := scanPhoto(tx.QueryRowContext(ctx, `SELECT `+photoCols+` FROM photos WHERE user_id = ? AND id = ?`, userID, id))
	if errors.Is(err, sql.ErrNoRows) {
		return p, ErrNotFound
	}
	if err != nil {
		return p, err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM photos WHERE id = ?`, id); err != nil {
		return p, err
	}
	if p.Main {
		if _, err := tx.ExecContext(ctx, `UPDATE photos SET is_main = 1 WHERE id = (
			SELECT id FROM photos WHERE user_id = ? AND vehicle_id = ? ORDER BY rowid LIMIT 1)`, userID, p.VehicleID); err != nil {
			return p, err
		}
	}
	return p, tx.Commit()
}

func boolInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
