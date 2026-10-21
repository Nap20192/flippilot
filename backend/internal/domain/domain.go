package domain

import (
	"time"

	"flippilot/internal/engine"
)

type Vehicle struct {
	ID        string     `json:"id"`
	Make      string     `json:"make"`
	Model     string     `json:"model"`
	Year      engine.Num `json:"year"`
	Km        engine.Num `json:"km"`
	Engine    string     `json:"engine"`
	Trans     string     `json:"trans"`
	Cond      string     `json:"cond"`
	Country   string     `json:"country"`
	Dst       string     `json:"dst"`
	Price     engine.Num `json:"price"`
	Resale    engine.Num `json:"resale"`
	Transport engine.Num `json:"transport"`
	Repairs   engine.Num `json:"repairs"`
	Days      engine.Num `json:"days"`
	Desc      string     `json:"desc"`
	URL       string     `json:"url"`
	Accident  string     `json:"accident"`
	Service   string     `json:"service"`
	VIN       string     `json:"vin"`
	Demo      bool       `json:"demo"`
}

type Comparable struct {
	Make   string  `json:"make"`
	Model  string  `json:"model"`
	Year   float64 `json:"year"`
	Km     float64 `json:"km"`
	Engine string  `json:"engine"`
	Price  float64 `json:"price"`
	Source string  `json:"source"`
}

type Settings struct {
	Name     string  `json:"name"`
	Currency string  `json:"cur"`
	Target   float64 `json:"target"`
	Reg      float64 `json:"reg"`
	Fees     float64 `json:"fees"`
	Day      float64 `json:"day"`
	FXCZK    float64 `json:"fxCZK"`
	FXPLN    float64 `json:"fxPLN"`
}

func DefaultSettings() Settings {
	return Settings{Name: "Demo user", Currency: "EUR", Target: 12, Reg: 300, Fees: 250, Day: 8, FXCZK: 25, FXPLN: 4.3}
}

func (s Settings) FX() map[string]float64 {
	cz, pl := s.FXCZK, s.FXPLN
	if !(cz > 0) {
		cz = 25
	}
	if !(pl > 0) {
		pl = 4.3
	}
	return map[string]float64{"EUR": 1, "CZK": cz, "PLN": pl}
}

type DealRules struct {
	Capital        float64 `json:"capital"`
	ReservePct     float64 `json:"reservePct"`
	MinPositionPct float64 `json:"minPositionPct"`
	MaxPositionPct float64 `json:"maxPositionPct"`
	MinProfit      float64 `json:"minProfit"`
	MinMargin      float64 `json:"minMargin"`
	MinROI         float64 `json:"minROI"`
	MaxLoss        float64 `json:"maxLoss"`
	MaxRisk        string  `json:"maxRisk"`
}

func DefaultDealRules() DealRules {
	return DealRules{Capital: 30000, ReservePct: 15, MinPositionPct: 10, MaxPositionPct: 80,
		MinProfit: 500, MinMargin: 4, MinROI: 5, MaxLoss: 1200, MaxRisk: "Medium"}
}

type AlertRule struct {
	ID        int64   `json:"id"`
	Make      string  `json:"make"`
	Model     string  `json:"model"`
	Ceiling   float64 `json:"ceil"`
	MinProfit float64 `json:"minP"`
	MinROI    float64 `json:"minR"`
	MaxRisk   string  `json:"risk"`
	Country   string  `json:"cty"`
	Market    string  `json:"mk"`
}

type PriceLog struct {
	Date  string  `json:"d"`
	Price float64 `json:"p"`
}

type WatchItem struct {
	Vehicle
	Note  string     `json:"note"`
	Log   []PriceLog `json:"log"`
	Photo *Photo     `json:"photo"`
}

type SavedAnalysis struct {
	Vehicle
	VehicleID string    `json:"vehicleId"`
	SavedAt   time.Time `json:"savedAt"`
	Photo     *Photo    `json:"photo"`
}

type Photo struct {
	ID        string    `json:"id"`
	VehicleID string    `json:"vehicleId"`
	Width     int       `json:"width"`
	Height    int       `json:"height"`
	Size      int       `json:"size"`
	Main      bool      `json:"main"`
	URL       string    `json:"url"`
	ThumbURL  string    `json:"thumbUrl"`
	CreatedAt time.Time `json:"createdAt"`
}

type Defect struct {
	ID          int64     `json:"id"`
	VehicleID   string    `json:"vehicleId"`
	Description string    `json:"description"`
	Cost        float64   `json:"cost"`
	CreatedAt   time.Time `json:"createdAt"`
}

type User struct {
	ID        int64     `json:"id"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"createdAt"`
}
