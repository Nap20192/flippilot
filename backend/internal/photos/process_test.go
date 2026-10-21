package photos

import (
	"bytes"
	"encoding/binary"
	"errors"
	"hash/crc32"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"testing"
)

func halves(w, h int) *image.RGBA {
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			c := color.RGBA{0, 0, 255, 255}
			if x < w/2 {
				c = color.RGBA{255, 0, 0, 255}
			}
			img.Set(x, y, c)
		}
	}
	return img
}

func withOrientation(t *testing.T, jpg []byte, o uint16) []byte {
	var tiff bytes.Buffer
	tiff.WriteString("MM")
	binary.Write(&tiff, binary.BigEndian, uint16(42))
	binary.Write(&tiff, binary.BigEndian, uint32(8))
	binary.Write(&tiff, binary.BigEndian, uint16(1))
	binary.Write(&tiff, binary.BigEndian, uint16(0x0112))
	binary.Write(&tiff, binary.BigEndian, uint16(3))
	binary.Write(&tiff, binary.BigEndian, uint32(1))
	binary.Write(&tiff, binary.BigEndian, o)
	binary.Write(&tiff, binary.BigEndian, uint16(0))
	binary.Write(&tiff, binary.BigEndian, uint32(0))
	payload := append([]byte("Exif\x00\x00"), tiff.Bytes()...)
	var out bytes.Buffer
	out.Write(jpg[:2])
	out.Write([]byte{0xFF, 0xE1})
	binary.Write(&out, binary.BigEndian, uint16(len(payload)+2))
	out.Write(payload)
	out.Write(jpg[2:])
	return out.Bytes()
}

func decode(t *testing.T, b []byte) image.Image {
	img, err := jpeg.Decode(bytes.NewReader(b))
	if err != nil {
		t.Fatal(err)
	}
	return img
}

func isRed(c color.Color) bool {
	r, g, b, _ := c.RGBA()
	return r > 0xC000 && g < 0x4000 && b < 0x4000
}

func TestExifOrientationAppliedAndStripped(t *testing.T) {
	var src bytes.Buffer
	jpeg.Encode(&src, halves(40, 20), &jpeg.Options{Quality: 95})
	in := withOrientation(t, src.Bytes(), 6)
	if jpegOrientation(in) != 6 {
		t.Fatal("orientation not parsed")
	}
	p, err := Process(in)
	if err != nil {
		t.Fatal(err)
	}
	if p.Width != 20 || p.Height != 40 {
		t.Fatalf("size %dx%d, want 20x40", p.Width, p.Height)
	}
	img := decode(t, p.Full)
	if !isRed(img.At(10, 5)) || isRed(img.At(10, 35)) {
		t.Fatal("rotation wrong: red half should be on top")
	}
	if bytes.Contains(p.Full, []byte("Exif")) || bytes.Contains(p.Thumb, []byte("Exif")) {
		t.Fatal("EXIF metadata kept")
	}
}

func TestResizeAndThumb(t *testing.T) {
	var src bytes.Buffer
	png.Encode(&src, halves(3000, 1500))
	p, err := Process(src.Bytes())
	if err != nil {
		t.Fatal(err)
	}
	if p.Width != MaxSide || p.Height != MaxSide/2 {
		t.Fatalf("full %dx%d", p.Width, p.Height)
	}
	th := decode(t, p.Thumb).Bounds()
	if th.Dx() != ThumbSide || th.Dy() != ThumbSide/2 {
		t.Fatalf("thumb %v", th)
	}
}

func TestRejectsNonImages(t *testing.T) {
	for _, b := range [][]byte{[]byte("hello"), []byte("<svg xmlns='http://www.w3.org/2000/svg'/>"), {}} {
		if _, err := Process(b); !errors.Is(err, ErrUnsupported) {
			t.Fatalf("%q: %v", b, err)
		}
	}
}

func TestRejectsPixelBomb(t *testing.T) {
	var src bytes.Buffer
	png.Encode(&src, image.NewRGBA(image.Rect(0, 0, 1, 1)))
	b := src.Bytes()
	binary.BigEndian.PutUint32(b[16:], 20000)
	binary.BigEndian.PutUint32(b[20:], 20000)
	binary.BigEndian.PutUint32(b[29:], crc32.ChecksumIEEE(b[12:29]))
	if _, err := Process(b); !errors.Is(err, ErrTooLarge) {
		t.Fatalf("got %v", err)
	}
}

func TestDiskRejectsBadKeys(t *testing.T) {
	d, err := NewDisk(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	for _, k := range []string{"../x.jpg", "abc.jpg", "0123456789abcdef0123456789abcdef.png"} {
		if err := d.Put(k, []byte("x")); err == nil {
			t.Fatalf("accepted key %q", k)
		}
	}
	k := "0123456789abcdef0123456789abcdef.jpg"
	if err := d.Put(k, []byte("data")); err != nil {
		t.Fatal(err)
	}
	f, err := d.Open(k)
	if err != nil {
		t.Fatal(err)
	}
	f.Close()
	if err := d.Delete(k); err != nil {
		t.Fatal(err)
	}
	if _, err := d.Open(k); !errors.Is(err, ErrNotFound) {
		t.Fatalf("got %v", err)
	}
}
