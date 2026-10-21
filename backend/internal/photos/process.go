package photos

import (
	"bytes"
	"errors"
	"image"
	"image/jpeg"
	_ "image/png"

	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
)

const (
	MaxPixels    = 50_000_000
	MaxSide      = 2560
	ThumbSide    = 480
	FullQuality  = 88
	ThumbQuality = 80
)

var (
	ErrUnsupported = errors.New("unsupported image format: use JPEG, PNG or WebP")
	ErrTooLarge    = errors.New("image resolution is too large")
)

type Processed struct {
	Full   []byte
	Thumb  []byte
	Width  int
	Height int
}

func Process(data []byte) (Processed, error) {
	var p Processed
	cfg, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return p, ErrUnsupported
	}
	if format != "jpeg" && format != "png" && format != "webp" {
		return p, ErrUnsupported
	}
	if cfg.Width <= 0 || cfg.Height <= 0 || cfg.Width*cfg.Height > MaxPixels {
		return p, ErrTooLarge
	}
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return p, ErrUnsupported
	}
	if format == "jpeg" {
		img = orient(img, jpegOrientation(data))
	}
	full := fit(img, MaxSide)
	if p.Full, err = encode(full, FullQuality); err != nil {
		return p, err
	}
	if p.Thumb, err = encode(fit(full, ThumbSide), ThumbQuality); err != nil {
		return p, err
	}
	b := full.Bounds()
	p.Width, p.Height = b.Dx(), b.Dy()
	return p, nil
}

func fit(img image.Image, side int) image.Image {
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	if w <= side && h <= side {
		return toRGBA(img)
	}
	if w >= h {
		h, w = max(1, h*side/w), side
	} else {
		w, h = max(1, w*side/h), side
	}
	dst := image.NewRGBA(image.Rect(0, 0, w, h))
	draw.CatmullRom.Scale(dst, dst.Bounds(), img, b, draw.Src, nil)
	return dst
}

func toRGBA(img image.Image) *image.RGBA {
	if r, ok := img.(*image.RGBA); ok && r.Bounds().Min == (image.Point{}) {
		return r
	}
	b := img.Bounds()
	dst := image.NewRGBA(image.Rect(0, 0, b.Dx(), b.Dy()))
	draw.Draw(dst, dst.Bounds(), image.White, image.Point{}, draw.Src)
	draw.Draw(dst, dst.Bounds(), img, b.Min, draw.Over)
	return dst
}

func encode(img image.Image, q int) ([]byte, error) {
	var buf bytes.Buffer
	err := jpeg.Encode(&buf, toRGBA(img), &jpeg.Options{Quality: q})
	return buf.Bytes(), err
}
