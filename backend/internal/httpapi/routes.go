package httpapi

import (
	"context"
	"errors"
	"net/http"
	"net/mail"
	"slices"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"flippilot/internal/ai"
	"flippilot/internal/analysis"
	"flippilot/internal/demo"
	"flippilot/internal/domain"
	"flippilot/internal/engine"
	"flippilot/internal/store"
)

func (s *Server) routes() {
	m := s.mux
	m.HandleFunc("GET /healthz", s.health)
	m.HandleFunc("GET /api/meta", s.meta)

	m.HandleFunc("POST /api/auth/register", s.register)
	m.HandleFunc("POST /api/auth/login", s.login)
	m.HandleFunc("POST /api/auth/logout", s.logout)
	m.HandleFunc("GET /api/me", s.auth(s.me))

	m.HandleFunc("POST /api/calculate", s.calculate)
	m.HandleFunc("POST /api/analyze", s.analyze)
	m.HandleFunc("POST /api/repairs/plan", s.repairPlan)
	m.HandleFunc("GET /api/listings", s.listings)
	m.HandleFunc("GET /api/listings/{id}", s.listing)
	m.HandleFunc("GET /api/deals", s.deals)
	m.HandleFunc("POST /api/deals/screen", s.screenDeals)

	m.HandleFunc("GET /api/settings", s.auth(s.getSettings))
	m.HandleFunc("PUT /api/settings", s.auth(s.putSettings))
	m.HandleFunc("GET /api/deal-rules", s.auth(s.getRules))
	m.HandleFunc("PUT /api/deal-rules", s.auth(s.putRules))

	m.HandleFunc("GET /api/watchlist", s.auth(s.watchlist))
	m.HandleFunc("POST /api/watchlist", s.auth(s.addWatch))
	m.HandleFunc("PATCH /api/watchlist/{id}", s.auth(s.patchWatch))
	m.HandleFunc("DELETE /api/watchlist/{id}", s.auth(s.deleteWatch))
	m.HandleFunc("POST /api/watchlist/{id}/prices", s.auth(s.logPrice))

	m.HandleFunc("GET /api/analyses", s.auth(s.analyses))
	m.HandleFunc("POST /api/analyses", s.auth(s.saveAnalysis))
	m.HandleFunc("DELETE /api/analyses/{id}", s.auth(s.deleteAnalysis))

	m.HandleFunc("GET /api/alerts", s.auth(s.alerts))
	m.HandleFunc("POST /api/alerts", s.auth(s.createAlert))
	m.HandleFunc("DELETE /api/alerts/{id}", s.auth(s.deleteAlert))
	m.HandleFunc("POST /api/alerts/{id}/test", s.auth(s.testAlert))

	m.HandleFunc("GET /api/vehicles/{id}/defects", s.auth(s.defects))
	m.HandleFunc("POST /api/vehicles/{id}/defects", s.auth(s.createDefect))
	m.HandleFunc("DELETE /api/defects/{id}", s.auth(s.deleteDefect))

	m.HandleFunc("GET /api/vehicles/{id}/photos", s.auth(s.listPhotos))
	m.HandleFunc("POST /api/vehicles/{id}/photos", s.auth(s.uploadPhotos))
	m.HandleFunc("PUT /api/photos/{id}/main", s.auth(s.setMainPhoto))
	m.HandleFunc("DELETE /api/photos/{id}", s.auth(s.deletePhoto))
	m.HandleFunc("GET /api/photos/{id}", s.servePhoto(false))
	m.HandleFunc("GET /api/photos/{id}/thumb", s.servePhoto(true))

	m.HandleFunc("POST /api/ai/listing-analysis", s.aiListing)
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	aiStatus := "not connected"
	if s.ai.Enabled() {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := s.ai.Health(ctx); err != nil {
			aiStatus = "unreachable"
		} else {
			aiStatus = "ok"
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "ai": aiStatus})
}

func (s *Server) meta(w http.ResponseWriter, r *http.Request) {
	routes := map[string]engine.Route{}
	for _, src := range engine.SourceCountries {
		for _, dst := range engine.DestCountries {
			if rt := engine.RouteFor(src, dst); rt != nil {
				routes[src+">"+dst] = *rt
			}
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"sourceCountries":  engine.SourceCountries,
		"destCountries":    engine.DestCountries,
		"routes":           routes,
		"conditionRepairs": engine.ConditionRepairBase,
		"defaultSettings":  domain.DefaultSettings(),
		"defaultDealRules": domain.DefaultDealRules(),
		"scenarios":        map[string]engine.Scenario{"conservative": engine.Conservative, "optimistic": engine.Optimistic},
		"fxIsLive":         false,
		"demoData":         true,
		"aiConnected":      s.ai.Enabled(),
		"maxSavedAnalyses": store.MaxAnalyses,
	})
}

type credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *Server) register(w http.ResponseWriter, r *http.Request) {
	var c credentials
	if !decode(w, r, &c) {
		return
	}
	var errs []string
	if _, err := mail.ParseAddress(c.Email); err != nil || !strings.Contains(c.Email, "@") {
		errs = append(errs, "Enter a valid email address.")
	}
	if len(c.Password) < 8 || len(c.Password) > 72 {
		errs = append(errs, "Password must be 8 to 72 characters.")
	}
	if len(errs) > 0 {
		writeInvalid(w, errs)
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(c.Password), bcrypt.DefaultCost)
	if err != nil {
		s.fail(w, err)
		return
	}
	u, err := s.store.CreateUser(r.Context(), c.Email, string(hash))
	if errors.Is(err, store.ErrEmailTaken) {
		writeErr(w, http.StatusConflict, err.Error())
		return
	}
	if err != nil {
		s.fail(w, err)
		return
	}
	s.issueSession(w, r, u, http.StatusCreated)
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var c credentials
	if !decode(w, r, &c) {
		return
	}
	u, hash, err := s.store.UserByEmail(r.Context(), c.Email)
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		s.fail(w, err)
		return
	}
	if err != nil || bcrypt.CompareHashAndPassword([]byte(hash), []byte(c.Password)) != nil {
		writeErr(w, http.StatusUnauthorized, store.ErrBadPassword.Error())
		return
	}
	s.issueSession(w, r, u, http.StatusOK)
}

func (s *Server) issueSession(w http.ResponseWriter, r *http.Request, u domain.User, status int) {
	tok, err := s.store.CreateSession(r.Context(), u.ID, sessionTTL)
	if err != nil {
		s.fail(w, err)
		return
	}
	writeJSON(w, status, map[string]any{"token": tok, "user": u, "expiresIn": int(sessionTTL.Seconds())})
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	if tok := bearer(r); tok != "" {
		if err := s.store.DeleteSession(r.Context(), tok); err != nil {
			s.fail(w, err)
			return
		}
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) me(w http.ResponseWriter, r *http.Request, u domain.User) {
	writeJSON(w, http.StatusOK, u)
}

type calcRequest struct {
	engine.Input
}

type calcCase struct {
	Name string `json:"name"`
	engine.Result
}

type sensitivityCell struct {
	ResaleChange  float64 `json:"resaleChange"`
	RepairsChange float64 `json:"repairsChange"`
	Net           float64 `json:"net"`
	ROI           float64 `json:"roi"`
}

func (s *Server) calculate(w http.ResponseWriter, r *http.Request) {
	var req calcRequest
	if !decode(w, r, &req) {
		return
	}
	in := req.Input
	if in.Src == "" {
		in.Src = in.Country
	}
	if in.Dst == "" {
		in.Dst = "CZ"
	}
	if errs := engine.Validate(in, engine.ModeCalc); len(errs) > 0 {
		writeInvalid(w, errs)
		return
	}
	if in.FX == nil {
		if st, err := s.settingsFor(r); err == nil {
			in.FX = st.FX()
		}
	}
	if in.VATDirection == "Payable" {
		in.VAT = engine.N(-in.VAT.F())
	}
	cases := []calcCase{
		{"conservative", engine.Run(in, engine.Scenario{Rs: -in.RsC.Or(6), Rm: in.RpC.Or(40), Dm: in.DyC.Or(50)})},
		{"expected", engine.Run(in, engine.Expected)},
		{"optimistic", engine.Run(in, engine.Scenario{Rs: in.RsO.Or(4), Rm: -in.RpO.Or(20), Dm: -in.DyO.Or(30)})},
	}
	var grid []sensitivityCell
	for _, rp := range []float64{-.5, 0, .5} {
		for _, rs := range []float64{-.1, -.05, 0, .05, .1} {
			x := engine.Run(in, engine.Scenario{Rs: rs * 100, Rm: rp * 100})
			grid = append(grid, sensitivityCell{rs, rp, x.Net, x.ROI})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"scenarios": cases, "sensitivity": grid})
}

func vehicleInput(v domain.Vehicle) engine.Input {
	dst := v.Dst
	if dst == "" {
		dst = "CZ"
	}
	return engine.Input{
		Price: v.Price, Resale: v.Resale, Src: v.Country, Dst: dst, Year: v.Year, Km: v.Km,
		Transport: v.Transport, Repairs: v.Repairs, Days: v.Days, Cond: v.Cond,
	}
}

func (s *Server) analyze(w http.ResponseWriter, r *http.Request) {
	var v domain.Vehicle
	if !decode(w, r, &v) {
		return
	}
	if errs := engine.Validate(vehicleInput(v), engine.ModeAnalyzer); len(errs) > 0 {
		writeInvalid(w, errs)
		return
	}
	st, err := s.settingsFor(r)
	if err != nil {
		s.fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, analysis.Analyze(v, st, demo.Comparables()))
}

func (s *Server) repairPlan(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Vehicle   domain.Vehicle  `json:"vehicle"`
		Confirmed []domain.Defect `json:"confirmed"`
	}
	if !decode(w, r, &req) {
		return
	}
	if u, ok := s.optionalUser(r); ok && req.Confirmed == nil && req.Vehicle.ID != "" {
		ds, err := s.store.Defects(r.Context(), u.ID, req.Vehicle.ID)
		if err != nil {
			s.fail(w, err)
			return
		}
		req.Confirmed = ds
	}
	writeJSON(w, http.StatusOK, analysis.PlanRepairs(req.Vehicle, req.Confirmed))
}

type listingFilter struct {
	Query    string
	Country  string
	Make     string
	MaxPrice float64
	MaxKm    float64
}

func parseFilter(r *http.Request) listingFilter {
	q := r.URL.Query()
	f := listingFilter{Query: strings.ToLower(q.Get("q")), Country: q.Get("country"), Make: q.Get("make")}
	f.MaxPrice, _ = strconv.ParseFloat(q.Get("maxPrice"), 64)
	f.MaxKm, _ = strconv.ParseFloat(q.Get("maxKm"), 64)
	return f
}

func (f listingFilter) match(v domain.Vehicle) bool {
	return (f.Query == "" || strings.Contains(strings.ToLower(v.Make+" "+v.Model), f.Query)) &&
		(f.Country == "" || v.Country == f.Country) &&
		(f.Make == "" || v.Make == f.Make) &&
		(f.MaxPrice == 0 || v.Price.F() <= f.MaxPrice) &&
		(f.MaxKm == 0 || v.Km.F() <= f.MaxKm)
}

type analyzedListing struct {
	Vehicle  domain.Vehicle  `json:"vehicle"`
	Analysis analysis.Result `json:"analysis"`
	Reasons  []string        `json:"reasons,omitempty"`
}

func (s *Server) listings(w http.ResponseWriter, r *http.Request) {
	st, err := s.settingsFor(r)
	if err != nil {
		s.fail(w, err)
		return
	}
	f := parseFilter(r)
	out := []analyzedListing{}
	for _, v := range demo.Listings() {
		if f.match(v) {
			out = append(out, analyzedListing{Vehicle: v, Analysis: analysis.Analyze(v, st, demo.Comparables())})
		}
	}
	slices.SortStableFunc(out, func(a, b analyzedListing) int { return b.Analysis.Score - a.Analysis.Score })
	writeJSON(w, http.StatusOK, map[string]any{"items": out, "demo": true})
}

func (s *Server) listing(w http.ResponseWriter, r *http.Request) {
	v, ok := demo.Listing(r.PathValue("id"))
	if !ok {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	st, err := s.settingsFor(r)
	if err != nil {
		s.fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, analyzedListing{Vehicle: v, Analysis: analysis.Analyze(v, st, demo.Comparables())})
}

func (s *Server) deals(w http.ResponseWriter, r *http.Request) {
	rules, err := s.rulesFor(r)
	if err != nil {
		s.fail(w, err)
		return
	}
	s.screen(w, r, rules, parseFilter(r))
}

func (s *Server) screenDeals(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Rules    domain.DealRules `json:"rules"`
		Query    string           `json:"q"`
		Country  string           `json:"country"`
		Make     string           `json:"make"`
		MaxPrice float64          `json:"maxPrice"`
		MaxKm    float64          `json:"maxKm"`
	}
	req.Rules = domain.DefaultDealRules()
	if !decode(w, r, &req) {
		return
	}
	s.screen(w, r, req.Rules, listingFilter{strings.ToLower(req.Query), req.Country, req.Make, req.MaxPrice, req.MaxKm})
}

func (s *Server) screen(w http.ResponseWriter, r *http.Request, rules domain.DealRules, f listingFilter) {
	if errs := analysis.ValidateRules(rules); len(errs) > 0 {
		writeInvalid(w, errs)
		return
	}
	st, err := s.settingsFor(r)
	if err != nil {
		s.fail(w, err)
		return
	}
	matches, excluded := []analyzedListing{}, []analyzedListing{}
	pool := 0
	for _, v := range demo.Listings() {
		if !f.match(v) {
			continue
		}
		pool++
		a := analysis.Analyze(v, st, demo.Comparables())
		item := analyzedListing{Vehicle: v, Analysis: a, Reasons: analysis.RejectReasons(a, rules)}
		if len(item.Reasons) == 0 {
			matches = append(matches, item)
		} else {
			excluded = append(excluded, item)
		}
	}
	slices.SortStableFunc(matches, func(a, b analyzedListing) int { return b.Analysis.Score - a.Analysis.Score })
	writeJSON(w, http.StatusOK, map[string]any{
		"capital": analysis.CapitalFor(rules), "rules": rules, "searched": pool,
		"matches": matches, "excluded": excluded, "demo": true,
	})
}

func (s *Server) getSettings(w http.ResponseWriter, r *http.Request, u domain.User) {
	v, err := s.store.Settings(r.Context(), u.ID)
	if err != nil {
		s.fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, v)
}

var currencies = []string{"EUR", "USD", "CZK", "UAH", "RUB", "KZT", "PLN", "GBP", "CHF"}

func (s *Server) putSettings(w http.ResponseWriter, r *http.Request, u domain.User) {
	v := domain.DefaultSettings()
	if !decode(w, r, &v) {
		return
	}
	var errs []string
	if !slices.Contains(currencies, v.Currency) {
		errs = append(errs, "Unsupported display currency.")
	}
	if v.Target < 0 || v.Reg < 0 || v.Fees < 0 || v.Day < 0 {
		errs = append(errs, "Target ROI, registration, fees and daily holding cost cannot be negative.")
	}
	if !(v.FXCZK > 0) || !(v.FXPLN > 0) {
		errs = append(errs, "Exchange rates must be greater than 0.")
	}
	if len(errs) > 0 {
		writeInvalid(w, errs)
		return
	}
	if err := s.store.SaveSettings(r.Context(), u.ID, v); err != nil {
		s.fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, v)
}

func (s *Server) getRules(w http.ResponseWriter, r *http.Request, u domain.User) {
	v, err := s.store.DealRules(r.Context(), u.ID)
	if err != nil {
		s.fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"rules": v, "capital": analysis.CapitalFor(v)})
}

func (s *Server) putRules(w http.ResponseWriter, r *http.Request, u domain.User) {
	v := domain.DefaultDealRules()
	if !decode(w, r, &v) {
		return
	}
	if errs := analysis.ValidateRules(v); len(errs) > 0 {
		writeInvalid(w, errs)
		return
	}
	if err := s.store.SaveDealRules(r.Context(), u.ID, v); err != nil {
		s.fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"rules": v, "capital": analysis.CapitalFor(v)})
}

func (s *Server) watchlist(w http.ResponseWriter, r *http.Request, u domain.User) {
	items, err := s.store.Watchlist(r.Context(), u.ID)
	if err != nil {
		s.fail(w, err)
		return
	}
	st, err := s.store.Settings(r.Context(), u.ID)
	if err != nil {
		s.fail(w, err)
		return
	}
	type row struct {
		domain.WatchItem
		Analysis    analysis.Result `json:"analysis"`
		PriceChange float64         `json:"priceChange"`
	}
	ids := make([]string, len(items))
	for i, it := range items {
		ids[i] = it.ID
	}
	mains, err := s.store.MainPhotos(r.Context(), u.ID, ids)
	if err != nil {
		s.fail(w, err)
		return
	}
	out := make([]row, 0, len(items))
	for _, it := range items {
		it.Photo = photoPtr(mains, it.ID)
		x := row{WatchItem: it, Analysis: analysis.Analyze(it.Vehicle, st, demo.Comparables())}
		if n := len(it.Log); n > 1 {
			x.PriceChange = it.Log[n-1].Price - it.Log[0].Price
		}
		out = append(out, x)
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) addWatch(w http.ResponseWriter, r *http.Request, u domain.User) {
	var v domain.Vehicle
	if !decode(w, r, &v) {
		return
	}
	if d, ok := demo.Listing(v.ID); ok && v.Make == "" {
		v = d
	}
	if v.ID == "" {
		v.ID = "u" + strconv.FormatInt(time.Now().UnixMilli(), 10)
	}
	if errs := engine.Validate(vehicleInput(v), engine.ModeAnalyzer); len(errs) > 0 {
		writeInvalid(w, errs)
		return
	}
	if err := s.store.AddToWatchlist(r.Context(), u.ID, v); err != nil {
		s.fail(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, v)
}

func (s *Server) patchWatch(w http.ResponseWriter, r *http.Request, u domain.User) {
	var req struct {
		Note *string `json:"note"`
	}
	if !decode(w, r, &req) {
		return
	}
	if req.Note == nil {
		writeInvalid(w, []string{"Nothing to update."})
		return
	}
	if err := s.store.SetWatchNote(r.Context(), u.ID, r.PathValue("id"), *req.Note); err != nil {
		s.fail(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) deleteWatch(w http.ResponseWriter, r *http.Request, u domain.User) {
	if err := s.store.RemoveFromWatchlist(r.Context(), u.ID, r.PathValue("id")); err != nil {
		s.fail(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) logPrice(w http.ResponseWriter, r *http.Request, u domain.User) {
	var p domain.PriceLog
	if !decode(w, r, &p) {
		return
	}
	if !(p.Price > 0) {
		writeInvalid(w, []string{"Enter a price greater than 0."})
		return
	}
	if p.Date == "" {
		p.Date = time.Now().UTC().Format(time.DateOnly)
	} else if _, err := time.Parse(time.DateOnly, p.Date); err != nil {
		writeInvalid(w, []string{"Date must be YYYY-MM-DD."})
		return
	}
	if err := s.store.LogPrice(r.Context(), u.ID, r.PathValue("id"), p); err != nil {
		s.fail(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

func (s *Server) analyses(w http.ResponseWriter, r *http.Request, u domain.User) {
	items, err := s.store.Analyses(r.Context(), u.ID)
	if err != nil {
		s.fail(w, err)
		return
	}
	ids := make([]string, len(items))
	for i, it := range items {
		ids[i] = it.VehicleID
	}
	mains, err := s.store.MainPhotos(r.Context(), u.ID, ids)
	if err != nil {
		s.fail(w, err)
		return
	}
	for i := range items {
		items[i].Photo = photoPtr(mains, items[i].VehicleID)
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) saveAnalysis(w http.ResponseWriter, r *http.Request, u domain.User) {
	var v domain.Vehicle
	if !decode(w, r, &v) {
		return
	}
	if errs := engine.Validate(vehicleInput(v), engine.ModeAnalyzer); len(errs) > 0 {
		writeInvalid(w, errs)
		return
	}
	id, err := s.store.SaveAnalysis(r.Context(), u.ID, v)
	if err != nil {
		s.fail(w, err)
		return
	}
	v.ID, v.Demo = id, false
	writeJSON(w, http.StatusCreated, v)
}

func (s *Server) deleteAnalysis(w http.ResponseWriter, r *http.Request, u domain.User) {
	if err := s.store.DeleteAnalysis(r.Context(), u.ID, r.PathValue("id")); err != nil {
		s.fail(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func pathInt(r *http.Request) (int64, bool) {
	n, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	return n, err == nil
}

func (s *Server) alerts(w http.ResponseWriter, r *http.Request, u domain.User) {
	items, err := s.store.AlertRules(r.Context(), u.ID)
	if err != nil {
		s.fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) createAlert(w http.ResponseWriter, r *http.Request, u domain.User) {
	a := domain.AlertRule{MaxRisk: "Medium"}
	if !decode(w, r, &a) {
		return
	}
	a.Make, a.Model = strings.TrimSpace(a.Make), strings.TrimSpace(a.Model)
	var errs []string
	if a.Ceiling < 0 || a.MinProfit < 0 || a.MinROI < 0 {
		errs = append(errs, "Price ceiling, minimum profit and minimum ROI cannot be negative.")
	}
	if !slices.Contains([]string{"Low", "Medium", "High"}, a.MaxRisk) {
		errs = append(errs, "Maximum risk must be Low, Medium or High.")
	}
	if a.Country != "" && !slices.Contains(engine.SourceCountries, a.Country) {
		errs = append(errs, "Unsupported source country.")
	}
	if len(errs) > 0 {
		writeInvalid(w, errs)
		return
	}
	a, err := s.store.CreateAlertRule(r.Context(), u.ID, a)
	if err != nil {
		s.fail(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, a)
}

func (s *Server) deleteAlert(w http.ResponseWriter, r *http.Request, u domain.User) {
	id, ok := pathInt(r)
	if !ok {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	if err := s.store.DeleteAlertRule(r.Context(), u.ID, id); err != nil {
		s.fail(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) testAlert(w http.ResponseWriter, r *http.Request, u domain.User) {
	id, ok := pathInt(r)
	if !ok {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	a, err := s.store.AlertRule(r.Context(), u.ID, id)
	if err != nil {
		s.fail(w, err)
		return
	}
	st, err := s.store.Settings(r.Context(), u.ID)
	if err != nil {
		s.fail(w, err)
		return
	}
	out := []analyzedListing{}
	for _, v := range demo.Listings() {
		res := analysis.Analyze(v, st, demo.Comparables())
		if analysis.MatchesAlert(v, res, a) {
			out = append(out, analyzedListing{Vehicle: v, Analysis: res})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"rule": a, "matches": out, "notificationSent": false, "demo": true})
}

func (s *Server) defects(w http.ResponseWriter, r *http.Request, u domain.User) {
	items, err := s.store.Defects(r.Context(), u.ID, r.PathValue("id"))
	if err != nil {
		s.fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) createDefect(w http.ResponseWriter, r *http.Request, u domain.User) {
	var d domain.Defect
	if !decode(w, r, &d) {
		return
	}
	d.Description = strings.TrimSpace(d.Description)
	if d.Description == "" || d.Cost < 0 {
		writeInvalid(w, []string{"Enter a name and a cost of 0 or more."})
		return
	}
	d.VehicleID = r.PathValue("id")
	d, err := s.store.CreateDefect(r.Context(), u.ID, d)
	if err != nil {
		s.fail(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, d)
}

func (s *Server) deleteDefect(w http.ResponseWriter, r *http.Request, u domain.User) {
	id, ok := pathInt(r)
	if !ok {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	if err := s.store.DeleteDefect(r.Context(), u.ID, id); err != nil {
		s.fail(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) aiListing(w http.ResponseWriter, r *http.Request) {
	var v domain.Vehicle
	if !decode(w, r, &v) {
		return
	}
	res, err := s.ai.AnalyzeListing(r.Context(), v)
	if errors.Is(err, ai.ErrNotConfigured) {
		writeErr(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	if err != nil {
		s.log.Error("ai", "err", err)
		writeErr(w, http.StatusBadGateway, "ai service error")
		return
	}
	writeJSON(w, http.StatusOK, res)
}
