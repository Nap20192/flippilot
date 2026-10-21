package httpapi

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"flippilot/internal/ai"
	"flippilot/internal/photos"
	"flippilot/internal/store"
)

type client struct {
	t     *testing.T
	url   string
	token string
}

func newClient(t *testing.T, aiURL string) *client {
	st, err := store.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	ph, err := photos.NewDisk(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	srv := httptest.NewServer(New(st, ph, ai.New(aiURL), []string{"http://localhost:5173"}, slog.New(slog.NewTextHandler(io.Discard, nil))))
	t.Cleanup(srv.Close)
	return &client{t: t, url: srv.URL}
}

func (c *client) do(method, path string, body any, want int) map[string]any {
	c.t.Helper()
	var rd io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rd = bytes.NewReader(b)
	}
	req, _ := http.NewRequest(method, c.url+path, rd)
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
		c.t.Fatalf("%s %s: status %d, want %d: %s", method, path, resp.StatusCode, want, raw)
	}
	var out map[string]any
	if len(raw) > 0 && raw[0] == '{' {
		json.Unmarshal(raw, &out)
	}
	if len(raw) > 0 && raw[0] == '[' {
		var arr []any
		json.Unmarshal(raw, &arr)
		out = map[string]any{"items": arr}
	}
	return out
}

func items(m map[string]any, k string) []any {
	v, _ := m[k].([]any)
	return v
}

func TestPublicEndpoints(t *testing.T) {
	c := newClient(t, "")
	if h := c.do("GET", "/healthz", nil, 200); h["ai"] != "not connected" {
		t.Fatalf("%v", h)
	}
	c.do("GET", "/api/meta", nil, 200)

	calc := c.do("POST", "/api/calculate", map[string]any{
		"src": "DE", "dst": "CZ", "price": 17900, "pcur": "EUR", "resale": 21400, "rcur": "EUR",
		"days": 45, "transport": 450, "expreg": 120, "impreg": 300, "insp": 150, "repairs": 900,
		"prep": 200, "sell": 400, "hold": 8, "other": 0, "cont": 5, "target": 12, "year": 2021, "km": 62000,
		"vat": 0, "rsC": 6, "rpC": 40, "dyC": 50, "rsO": 4, "rpO": 20, "dyO": 30, "vatDirection": "Recoverable",
	}, 200)
	sc := items(calc, "scenarios")
	if len(sc) != 3 || len(items(calc, "sensitivity")) != 15 {
		t.Fatalf("%v", calc)
	}
	net := func(i int) float64 { return sc[i].(map[string]any)["net"].(float64) }
	if !(net(0) < net(1) && net(1) < net(2)) {
		t.Fatalf("scenarios not ordered: %v %v %v", net(0), net(1), net(2))
	}

	bad := c.do("POST", "/api/calculate", map[string]any{"price": -1, "resale": "", "year": 1850, "km": 1, "src": "DE", "dst": "DE"}, 422)
	if len(items(bad, "details")) < 3 {
		t.Fatalf("%v", bad)
	}

	an := c.do("POST", "/api/analyze", map[string]any{
		"make": "Volkswagen", "model": "Golf 8 2.0 TDI", "year": 2021, "km": 62000, "engine": "Diesel",
		"trans": "Manual", "cond": "Good", "country": "DE", "price": 17900, "resale": "", "transport": "", "repairs": "", "days": 45,
	}, 200)
	if an["resaleFromComps"] != true || an["insufficient"] != false {
		t.Fatalf("expected comps-based resale: %v", an)
	}

	ls := c.do("GET", "/api/listings?country=DE&maxKm=100000", nil, 200)
	if n := len(items(ls, "items")); n == 0 || n >= 14 {
		t.Fatalf("filter returned %d", n)
	}
	d := c.do("GET", "/api/deals", nil, 200)
	if d["searched"].(float64) != 14 || len(items(d, "matches"))+len(items(d, "excluded")) != 14 {
		t.Fatalf("%v", d["searched"])
	}
	c.do("POST", "/api/deals/screen", map[string]any{"rules": map[string]any{"capital": 0}}, 422)
	c.do("GET", "/api/listings/d0", nil, 200)
	c.do("GET", "/api/listings/nope", nil, 404)

	plan := c.do("POST", "/api/repairs/plan", map[string]any{"vehicle": map[string]any{"km": 214000, "engine": "Diesel", "trans": "Automatic", "year": 2017, "desc": "Engine noise"}}, 200)
	if len(items(plan, "items")) < 5 {
		t.Fatalf("%v", plan)
	}

	c.do("POST", "/api/ai/listing-analysis", map[string]any{"desc": "x"}, 503)
	c.do("GET", "/api/watchlist", nil, 401)
}

func TestUserFlow(t *testing.T) {
	c := newClient(t, "")
	c.do("POST", "/api/auth/register", map[string]any{"email": "bad", "password": "short"}, 422)
	reg := c.do("POST", "/api/auth/register", map[string]any{"email": "Trader@Example.com", "password": "correct-horse"}, 201)
	c.do("POST", "/api/auth/register", map[string]any{"email": "trader@example.com", "password": "correct-horse"}, 409)
	c.do("POST", "/api/auth/login", map[string]any{"email": "trader@example.com", "password": "wrong-pass"}, 401)
	login := c.do("POST", "/api/auth/login", map[string]any{"email": "trader@example.com", "password": "correct-horse"}, 200)
	if reg["token"] == login["token"] {
		t.Fatal("tokens reused")
	}
	c.token = login["token"].(string)
	if me := c.do("GET", "/api/me", nil, 200); me["email"] != "trader@example.com" {
		t.Fatalf("%v", me)
	}

	s := c.do("GET", "/api/settings", nil, 200)
	if s["target"].(float64) != 12 {
		t.Fatalf("%v", s)
	}
	s["target"] = 20
	c.do("PUT", "/api/settings", s, 200)
	s["fxCZK"] = 0
	c.do("PUT", "/api/settings", s, 422)
	maxDefault := c.do("GET", "/api/listings/d0", nil, 200)["analysis"].(map[string]any)["maxPrice"].(float64)
	anon := &client{t: t, url: c.url}
	maxAnon := anon.do("GET", "/api/listings/d0", nil, 200)["analysis"].(map[string]any)["maxPrice"].(float64)
	if !(maxDefault < maxAnon) {
		t.Fatalf("higher target ROI should lower max price: %v vs %v", maxDefault, maxAnon)
	}

	rules := c.do("GET", "/api/deal-rules", nil, 200)["rules"].(map[string]any)
	rules["maxRisk"] = "High"
	rules["minProfit"] = 0
	c.do("PUT", "/api/deal-rules", rules, 200)
	rules["minPositionPct"] = 90
	rules["maxPositionPct"] = 10
	c.do("PUT", "/api/deal-rules", rules, 422)

	c.do("POST", "/api/watchlist", map[string]any{"id": "d0"}, 201)
	c.do("POST", "/api/watchlist", map[string]any{"id": "d0"}, 201)
	c.do("PATCH", "/api/watchlist/d0", map[string]any{"note": "call seller"}, 204)
	c.do("POST", "/api/watchlist/d0/prices", map[string]any{"p": 18500, "d": "2026-10-01"}, 201)
	c.do("POST", "/api/watchlist/d0/prices", map[string]any{"p": 17200}, 201)
	c.do("POST", "/api/watchlist/d0/prices", map[string]any{"p": 0}, 422)
	c.do("POST", "/api/watchlist/zzz/prices", map[string]any{"p": 100}, 404)
	wl := items(c.do("GET", "/api/watchlist", nil, 200), "items")
	if len(wl) != 1 {
		t.Fatalf("watchlist has %d items", len(wl))
	}
	w0 := wl[0].(map[string]any)
	if w0["note"] != "call seller" || w0["priceChange"].(float64) != -1300 || len(w0["log"].([]any)) != 2 {
		t.Fatalf("%v", w0)
	}
	c.do("DELETE", "/api/watchlist/d0", nil, 204)
	c.do("DELETE", "/api/watchlist/d0", nil, 404)

	v := map[string]any{"make": "Škoda", "model": "Octavia", "year": 2020, "km": 90000, "cond": "Good", "country": "DE", "price": 15000, "resale": 18000}
	var last string
	for i := 0; i < store.MaxAnalyses+3; i++ {
		last = c.do("POST", "/api/analyses", v, 201)["id"].(string)
	}
	hist := items(c.do("GET", "/api/analyses", nil, 200), "items")
	if len(hist) != store.MaxAnalyses || hist[0].(map[string]any)["id"] != last {
		t.Fatalf("history len %d", len(hist))
	}
	c.do("DELETE", "/api/analyses/"+last, nil, 204)

	al := c.do("POST", "/api/alerts", map[string]any{"make": "Volkswagen", "model": "Golf", "ceil": 20000, "minP": 0, "minR": 0, "risk": "High"}, 201)
	c.do("POST", "/api/alerts", map[string]any{"risk": "Extreme"}, 422)
	id := int(al["id"].(float64))
	tr := c.do("POST", "/api/alerts/"+itoa(id)+"/test", nil, 200)
	if len(items(tr, "matches")) != 1 || tr["notificationSent"] != false {
		t.Fatalf("%v", tr)
	}
	c.do("DELETE", "/api/alerts/"+itoa(id), nil, 204)
	c.do("POST", "/api/alerts/"+itoa(id)+"/test", nil, 404)

	df := c.do("POST", "/api/vehicles/d9/defects", map[string]any{"description": "Cracked windscreen", "cost": 350}, 201)
	c.do("POST", "/api/vehicles/d9/defects", map[string]any{"description": "", "cost": 1}, 422)
	plan := c.do("POST", "/api/repairs/plan", map[string]any{"vehicle": map[string]any{"id": "d9", "km": 1000, "year": 2025}}, 200)
	found := false
	for _, it := range items(plan, "items") {
		if it.(map[string]any)["name"] == "Cracked windscreen" {
			found = true
		}
	}
	if !found {
		t.Fatalf("confirmed defect missing: %v", plan)
	}
	c.do("DELETE", "/api/defects/"+itoa(int(df["id"].(float64))), nil, 204)

	other := &client{t: t, url: c.url}
	other.token = other.do("POST", "/api/auth/register", map[string]any{"email": "other@example.com", "password": "another-pass"}, 201)["token"].(string)
	if n := len(items(other.do("GET", "/api/analyses", nil, 200), "items")); n != 0 {
		t.Fatalf("other user sees %d analyses", n)
	}

	c.do("POST", "/api/auth/logout", nil, 204)
	c.do("GET", "/api/me", nil, 401)
}

func TestAIProxy(t *testing.T) {
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/healthz":
			w.WriteHeader(200)
		case "/v1/listing-analysis":
			var body struct {
				Vehicle struct {
					Desc string `json:"desc"`
				} `json:"vehicle"`
			}
			json.NewDecoder(r.Body).Decode(&body)
			json.NewEncoder(w).Encode(map[string]any{"summary": "seen: " + body.Vehicle.Desc, "flags": []any{}, "suspectedDefects": []any{}})
		default:
			http.NotFound(w, r)
		}
	}))
	defer fake.Close()
	c := newClient(t, fake.URL)
	if h := c.do("GET", "/healthz", nil, 200); h["ai"] != "ok" {
		t.Fatalf("%v", h)
	}
	if res := c.do("POST", "/api/ai/listing-analysis", map[string]any{"desc": "Motor klopft"}, 200); res["summary"] != "seen: Motor klopft" {
		t.Fatalf("%v", res)
	}
}

func TestCORS(t *testing.T) {
	c := newClient(t, "")
	req, _ := http.NewRequest("OPTIONS", c.url+"/api/analyze", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != 204 || resp.Header.Get("Access-Control-Allow-Origin") != "http://localhost:5173" {
		t.Fatalf("%d %v", resp.StatusCode, resp.Header)
	}
	req.Header.Set("Origin", "https://evil.example")
	resp, _ = http.DefaultClient.Do(req)
	resp.Body.Close()
	if resp.Header.Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("unknown origin allowed")
	}
}

func itoa(n int) string { b, _ := json.Marshal(n); return string(b) }
