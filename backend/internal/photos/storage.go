package photos

import (
	"errors"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
)

var ErrNotFound = errors.New("photo not found")

type Storage interface {
	Put(key string, data []byte) error
	Open(key string) (io.ReadSeekCloser, error)
	Delete(key string) error
}

var validKey = regexp.MustCompile(`^[0-9a-f]{32}(_thumb)?\.jpg$`)

type Disk struct{ dir string }

func NewDisk(dir string) (*Disk, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	return &Disk{dir: dir}, nil
}

func (d *Disk) path(key string) (string, error) {
	if !validKey.MatchString(key) {
		return "", ErrNotFound
	}
	return filepath.Join(d.dir, key[:2], key), nil
}

func (d *Disk) Put(key string, data []byte) error {
	p, err := d.path(key)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(p), ".upload-*")
	if err != nil {
		return err
	}
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		os.Remove(tmp.Name())
		return err
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmp.Name())
		return err
	}
	return os.Rename(tmp.Name(), p)
}

func (d *Disk) Open(key string) (io.ReadSeekCloser, error) {
	p, err := d.path(key)
	if err != nil {
		return nil, err
	}
	f, err := os.Open(p)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, ErrNotFound
	}
	return f, err
}

func (d *Disk) Delete(key string) error {
	p, err := d.path(key)
	if err != nil {
		return err
	}
	if err := os.Remove(p); err != nil && !errors.Is(err, fs.ErrNotExist) {
		return err
	}
	return nil
}
