package store

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"

	_ "modernc.org/sqlite"

	"flippilot/internal/domain"
)

var (
	ErrNotFound    = errors.New("not found")
	ErrEmailTaken  = errors.New("email already registered")
	ErrBadPassword = errors.New("invalid email or password")
)

const MaxAnalyses = 20

type Store struct{ db *sql.DB }

const schema = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY,
	email TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	created_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
	token_hash TEXT PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	expires_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS user_prefs (
	user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	settings TEXT,
	deal_rules TEXT
);
CREATE TABLE IF NOT EXISTS watchlist (
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	vehicle_id TEXT NOT NULL,
	vehicle TEXT NOT NULL,
	note TEXT NOT NULL DEFAULT '',
	created_at TIMESTAMP NOT NULL,
	PRIMARY KEY (user_id, vehicle_id)
);
CREATE TABLE IF NOT EXISTS price_logs (
	id INTEGER PRIMARY KEY,
	user_id INTEGER NOT NULL,
	vehicle_id TEXT NOT NULL,
	day TEXT NOT NULL,
	price REAL NOT NULL,
	FOREIGN KEY (user_id, vehicle_id) REFERENCES watchlist(user_id, vehicle_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS analyses (
	id INTEGER PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	vehicle TEXT NOT NULL,
	saved_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS alert_rules (
	id INTEGER PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	rule TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS defects (
	id INTEGER PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	vehicle_id TEXT NOT NULL,
	description TEXT NOT NULL,
	cost REAL NOT NULL,
	created_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS defects_vehicle ON defects(user_id, vehicle_id);
CREATE TABLE IF NOT EXISTS photos (
	id TEXT PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	vehicle_id TEXT NOT NULL,
	width INTEGER NOT NULL,
	height INTEGER NOT NULL,
	size INTEGER NOT NULL,
	is_main INTEGER NOT NULL DEFAULT 0,
	created_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS photos_vehicle ON photos(user_id, vehicle_id);
`

func Open(path string) (*Store, error) {
	dsn := "file:" + path + "?_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)"
	if path == ":memory:" {
		dsn = "file::memory:?_pragma=foreign_keys(1)"
	}
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	if _, err := db.Exec(schema); err != nil {
		db.Close()
		return nil, err
	}
	return &Store{db}, nil
}

func (s *Store) Close() error { return s.db.Close() }

func now() time.Time { return time.Now().UTC() }

func (s *Store) CreateUser(ctx context.Context, email, passwordHash string) (domain.User, error) {
	u := domain.User{Email: strings.ToLower(strings.TrimSpace(email)), CreatedAt: now()}
	res, err := s.db.ExecContext(ctx, `INSERT INTO users(email, password_hash, created_at) VALUES(?,?,?)`, u.Email, passwordHash, u.CreatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			return u, ErrEmailTaken
		}
		return u, err
	}
	u.ID, _ = res.LastInsertId()
	return u, nil
}

func (s *Store) UserByEmail(ctx context.Context, email string) (domain.User, string, error) {
	var u domain.User
	var hash string
	err := s.db.QueryRowContext(ctx, `SELECT id, email, created_at, password_hash FROM users WHERE email = ?`,
		strings.ToLower(strings.TrimSpace(email))).Scan(&u.ID, &u.Email, &u.CreatedAt, &hash)
	if errors.Is(err, sql.ErrNoRows) {
		return u, "", ErrNotFound
	}
	return u, hash, err
}

func hashToken(t string) string { h := sha256.Sum256([]byte(t)); return hex.EncodeToString(h[:]) }

func (s *Store) CreateSession(ctx context.Context, userID int64, ttl time.Duration) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	tok := hex.EncodeToString(b)
	_, err := s.db.ExecContext(ctx, `INSERT INTO sessions(token_hash, user_id, expires_at) VALUES(?,?,?)`, hashToken(tok), userID, now().Add(ttl))
	return tok, err
}

func (s *Store) UserBySession(ctx context.Context, token string) (domain.User, error) {
	var u domain.User
	err := s.db.QueryRowContext(ctx, `SELECT u.id, u.email, u.created_at FROM sessions s JOIN users u ON u.id = s.user_id
		WHERE s.token_hash = ? AND s.expires_at > ?`, hashToken(token), now()).Scan(&u.ID, &u.Email, &u.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return u, ErrNotFound
	}
	return u, err
}

func (s *Store) DeleteSession(ctx context.Context, token string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM sessions WHERE token_hash = ?`, hashToken(token))
	return err
}

func (s *Store) Settings(ctx context.Context, userID int64) (domain.Settings, error) {
	v := domain.DefaultSettings()
	return v, s.loadPref(ctx, userID, "settings", &v)
}

func (s *Store) SaveSettings(ctx context.Context, userID int64, v domain.Settings) error {
	return s.savePref(ctx, userID, "settings", v)
}

func (s *Store) DealRules(ctx context.Context, userID int64) (domain.DealRules, error) {
	v := domain.DefaultDealRules()
	return v, s.loadPref(ctx, userID, "deal_rules", &v)
}

func (s *Store) SaveDealRules(ctx context.Context, userID int64, v domain.DealRules) error {
	return s.savePref(ctx, userID, "deal_rules", v)
}

func (s *Store) loadPref(ctx context.Context, userID int64, col string, into any) error {
	var raw sql.NullString
	err := s.db.QueryRowContext(ctx, `SELECT `+col+` FROM user_prefs WHERE user_id = ?`, userID).Scan(&raw)
	if errors.Is(err, sql.ErrNoRows) || (err == nil && !raw.Valid) {
		return nil
	}
	if err != nil {
		return err
	}
	return json.Unmarshal([]byte(raw.String), into)
}

func (s *Store) savePref(ctx context.Context, userID int64, col string, v any) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `INSERT INTO user_prefs(user_id, `+col+`) VALUES(?, ?)
		ON CONFLICT(user_id) DO UPDATE SET `+col+` = excluded.`+col, userID, string(b))
	return err
}

func (s *Store) Watchlist(ctx context.Context, userID int64) ([]domain.WatchItem, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT vehicle, note FROM watchlist WHERE user_id = ? ORDER BY created_at`, userID)
	if err != nil {
		return nil, err
	}
	items := []domain.WatchItem{}
	for rows.Next() {
		var raw string
		var it domain.WatchItem
		if err := rows.Scan(&raw, &it.Note); err != nil {
			rows.Close()
			return nil, err
		}
		if err := json.Unmarshal([]byte(raw), &it.Vehicle); err != nil {
			rows.Close()
			return nil, err
		}
		it.Log = []domain.PriceLog{}
		items = append(items, it)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for i := range items {
		if items[i].Log, err = s.priceLogs(ctx, userID, items[i].ID); err != nil {
			return nil, err
		}
	}
	return items, nil
}

func (s *Store) priceLogs(ctx context.Context, userID int64, vehicleID string) ([]domain.PriceLog, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT day, price FROM price_logs WHERE user_id = ? AND vehicle_id = ? ORDER BY id`, userID, vehicleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.PriceLog{}
	for rows.Next() {
		var p domain.PriceLog
		if err := rows.Scan(&p.Date, &p.Price); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *Store) AddToWatchlist(ctx context.Context, userID int64, v domain.Vehicle) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `INSERT INTO watchlist(user_id, vehicle_id, vehicle, created_at) VALUES(?,?,?,?)
		ON CONFLICT(user_id, vehicle_id) DO UPDATE SET vehicle = excluded.vehicle`, userID, v.ID, string(b), now())
	return err
}

func (s *Store) RemoveFromWatchlist(ctx context.Context, userID int64, vehicleID string) error {
	return affected(s.db.ExecContext(ctx, `DELETE FROM watchlist WHERE user_id = ? AND vehicle_id = ?`, userID, vehicleID))
}

func (s *Store) SetWatchNote(ctx context.Context, userID int64, vehicleID, note string) error {
	return affected(s.db.ExecContext(ctx, `UPDATE watchlist SET note = ? WHERE user_id = ? AND vehicle_id = ?`, note, userID, vehicleID))
}

func (s *Store) LogPrice(ctx context.Context, userID int64, vehicleID string, p domain.PriceLog) error {
	var one int
	err := s.db.QueryRowContext(ctx, `SELECT 1 FROM watchlist WHERE user_id = ? AND vehicle_id = ?`, userID, vehicleID).Scan(&one)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `INSERT INTO price_logs(user_id, vehicle_id, day, price) VALUES(?,?,?,?)`, userID, vehicleID, p.Date, p.Price)
	return err
}

func (s *Store) Analyses(ctx context.Context, userID int64) ([]domain.SavedAnalysis, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, vehicle, saved_at FROM analyses WHERE user_id = ? ORDER BY id DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.SavedAnalysis{}
	for rows.Next() {
		var id int64
		var raw string
		var a domain.SavedAnalysis
		if err := rows.Scan(&id, &raw, &a.SavedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(raw), &a.Vehicle); err != nil {
			return nil, err
		}
		a.VehicleID = a.Vehicle.ID
		if a.VehicleID == "" {
			a.VehicleID = "a" + itoa(id)
		}
		a.ID = "a" + itoa(id)
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *Store) SaveAnalysis(ctx context.Context, userID int64, v domain.Vehicle) (string, error) {
	v.Demo = false
	b, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return "", err
	}
	defer tx.Rollback()
	res, err := tx.ExecContext(ctx, `INSERT INTO analyses(user_id, vehicle, saved_at) VALUES(?,?,?)`, userID, string(b), now())
	if err != nil {
		return "", err
	}
	id, _ := res.LastInsertId()
	if _, err := tx.ExecContext(ctx, `DELETE FROM analyses WHERE user_id = ? AND id NOT IN
		(SELECT id FROM analyses WHERE user_id = ? ORDER BY id DESC LIMIT ?)`, userID, userID, MaxAnalyses); err != nil {
		return "", err
	}
	return "a" + itoa(id), tx.Commit()
}

func (s *Store) DeleteAnalysis(ctx context.Context, userID int64, id string) error {
	n, ok := parseID(id, "a")
	if !ok {
		return ErrNotFound
	}
	return affected(s.db.ExecContext(ctx, `DELETE FROM analyses WHERE user_id = ? AND id = ?`, userID, n))
}

func (s *Store) AlertRules(ctx context.Context, userID int64) ([]domain.AlertRule, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, rule FROM alert_rules WHERE user_id = ? ORDER BY id`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.AlertRule{}
	for rows.Next() {
		var id int64
		var raw string
		if err := rows.Scan(&id, &raw); err != nil {
			return nil, err
		}
		var r domain.AlertRule
		if err := json.Unmarshal([]byte(raw), &r); err != nil {
			return nil, err
		}
		r.ID = id
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Store) AlertRule(ctx context.Context, userID, id int64) (domain.AlertRule, error) {
	var raw string
	var r domain.AlertRule
	err := s.db.QueryRowContext(ctx, `SELECT rule FROM alert_rules WHERE user_id = ? AND id = ?`, userID, id).Scan(&raw)
	if errors.Is(err, sql.ErrNoRows) {
		return r, ErrNotFound
	}
	if err != nil {
		return r, err
	}
	err = json.Unmarshal([]byte(raw), &r)
	r.ID = id
	return r, err
}

func (s *Store) CreateAlertRule(ctx context.Context, userID int64, r domain.AlertRule) (domain.AlertRule, error) {
	r.ID = 0
	b, err := json.Marshal(r)
	if err != nil {
		return r, err
	}
	res, err := s.db.ExecContext(ctx, `INSERT INTO alert_rules(user_id, rule) VALUES(?,?)`, userID, string(b))
	if err != nil {
		return r, err
	}
	r.ID, _ = res.LastInsertId()
	return r, nil
}

func (s *Store) DeleteAlertRule(ctx context.Context, userID, id int64) error {
	return affected(s.db.ExecContext(ctx, `DELETE FROM alert_rules WHERE user_id = ? AND id = ?`, userID, id))
}

func (s *Store) Defects(ctx context.Context, userID int64, vehicleID string) ([]domain.Defect, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, vehicle_id, description, cost, created_at FROM defects
		WHERE user_id = ? AND vehicle_id = ? ORDER BY id`, userID, vehicleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.Defect{}
	for rows.Next() {
		var d domain.Defect
		if err := rows.Scan(&d.ID, &d.VehicleID, &d.Description, &d.Cost, &d.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (s *Store) CreateDefect(ctx context.Context, userID int64, d domain.Defect) (domain.Defect, error) {
	d.CreatedAt = now()
	res, err := s.db.ExecContext(ctx, `INSERT INTO defects(user_id, vehicle_id, description, cost, created_at) VALUES(?,?,?,?,?)`,
		userID, d.VehicleID, d.Description, d.Cost, d.CreatedAt)
	if err != nil {
		return d, err
	}
	d.ID, _ = res.LastInsertId()
	return d, nil
}

func (s *Store) DeleteDefect(ctx context.Context, userID, id int64) error {
	return affected(s.db.ExecContext(ctx, `DELETE FROM defects WHERE user_id = ? AND id = ?`, userID, id))
}

func affected(res sql.Result, err error) error {
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}
