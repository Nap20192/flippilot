package httpapi

import (
	"bytes"
	"encoding/json"
	"image"
	"image/jpeg"
	"io"
	"mime/multipart"
	"net/http"
	"testing"
)

func jpegBytes(w, h int) []byte {
	var b bytes.Buffer
	jpeg.Encode(&b, image.NewRGBA(image.Rect(0, 0, w, h)), nil)
	return b.Bytes()
}

func (c *client) upload(vehicleID string, files map[string][]byte, want int) map[string]any {
	c.t.Helper()
	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	for name, data := range files {
		fw, _ := mw.CreateFormFile("photos", name)
		fw.Write(data)
	}
	mw.Close()
	req, _ := http.NewRequest("POST", c.url+"/api/vehicles/"+vehicleID+"/photos", &body)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		c.t.Fatal(err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != want {
		c.t.Fatalf("upload: status %d, want %d: %s", resp.StatusCode, want, raw)
	}
	var out map[string]any
	json.Unmarshal(raw, &out)
	return out
}

func (c *client) get(path string) (*http.Response, []byte) {
	resp, err := http.Get(c.url + path)
	if err != nil {
		c.t.Fatal(err)
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	return resp, b
}

func TestPhotos(t *testing.T) {
	c := newClient(t, "")
	c.upload("d0", map[string][]byte{"a.jpg": jpegBytes(10, 10)}, 401)
	c.token = c.do("POST", "/api/auth/register", map[string]any{"email": "p@example.com", "password": "photo-pass"}, 201)["token"].(string)

	res := c.upload("d0", map[string][]byte{"front.jpg": jpegBytes(800, 600), "side.jpg": jpegBytes(640, 480), "notes.txt": []byte("not an image")}, 201)
	saved, bad := items(res, "photos"), items(res, "rejected")
	if len(saved) != 2 || len(bad) != 1 || bad[0].(map[string]any)["file"] != "notes.txt" {
		t.Fatalf("%v", res)
	}
	c.upload("d0", map[string][]byte{"x.txt": []byte("nope")}, 422)

	list := items(c.do("GET", "/api/vehicles/d0/photos", nil, 200), "items")
	if len(list) != 2 {
		t.Fatalf("%v", list)
	}
	first, second := list[0].(map[string]any), list[1].(map[string]any)
	if first["id"] != saved[0].(map[string]any)["id"] || first["main"] != true || second["main"] != false {
		t.Fatal("first uploaded photo should be main")
	}

	resp, body := c.get(first["url"].(string))
	if resp.StatusCode != 200 || resp.Header.Get("Content-Type") != "image/jpeg" || resp.Header.Get("X-Content-Type-Options") != "nosniff" {
		t.Fatalf("%d %v", resp.StatusCode, resp.Header)
	}
	if cfg, err := jpeg.DecodeConfig(bytes.NewReader(body)); err != nil || float64(cfg.Width) != first["width"].(float64) {
		t.Fatalf("full image: %v %v", cfg, err)
	}
	_, tb := c.get(first["thumbUrl"].(string))
	if cfg, err := jpeg.DecodeConfig(bytes.NewReader(tb)); err != nil || cfg.Width != 480 || cfg.Height*4 != cfg.Width*3 {
		t.Fatalf("thumb: %v %v", cfg, err)
	}
	if r, _ := c.get("/api/photos/../../etc/passwd"); r.StatusCode == 200 {
		t.Fatal("path traversal")
	}
	if r, _ := c.get("/api/photos/0123456789abcdef0123456789abcdef"); r.StatusCode != 404 {
		t.Fatalf("unknown photo: %d", r.StatusCode)
	}

	sid := second["id"].(string)
	if m := c.do("PUT", "/api/photos/"+sid+"/main", nil, 200); m["main"] != true {
		t.Fatalf("%v", m)
	}
	c.do("POST", "/api/watchlist", map[string]any{"id": "d0"}, 201)
	wl := items(c.do("GET", "/api/watchlist", nil, 200), "items")[0].(map[string]any)
	if wl["photo"].(map[string]any)["id"] != sid {
		t.Fatalf("watchlist main photo: %v", wl["photo"])
	}

	v := map[string]any{"id": "u1", "make": "BMW", "model": "320d", "year": 2019, "km": 120000, "cond": "Good", "country": "DE", "price": 19000, "resale": 23000}
	c.upload("u1", map[string][]byte{"bmw.jpg": jpegBytes(300, 200)}, 201)
	c.do("POST", "/api/analyses", v, 201)
	h := items(c.do("GET", "/api/analyses", nil, 200), "items")[0].(map[string]any)
	if h["vehicleId"] != "u1" || h["photo"] == nil {
		t.Fatalf("analysis photo: %v", h)
	}

	other := &client{t: t, url: c.url}
	other.token = other.do("POST", "/api/auth/register", map[string]any{"email": "o@example.com", "password": "other-pass"}, 201)["token"].(string)
	other.do("DELETE", "/api/photos/"+sid, nil, 404)
	other.do("PUT", "/api/photos/"+sid+"/main", nil, 404)
	if n := len(items(other.do("GET", "/api/vehicles/d0/photos", nil, 200), "items")); n != 0 {
		t.Fatalf("other user sees %d photos", n)
	}

	c.do("DELETE", "/api/photos/"+sid, nil, 204)
	if r, _ := c.get("/api/photos/" + sid); r.StatusCode != 404 {
		t.Fatal("deleted photo still served")
	}
	left := items(c.do("GET", "/api/vehicles/d0/photos", nil, 200), "items")
	if len(left) != 1 || left[0].(map[string]any)["main"] != true {
		t.Fatalf("remaining photo should become main: %v", left)
	}

	many := map[string][]byte{}
	for i := 0; i < 11; i++ {
		many[string(rune('a'+i))+".jpg"] = jpegBytes(4, 4)
	}
	c.upload("d1", many, 422)
}
