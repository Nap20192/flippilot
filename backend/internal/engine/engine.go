package engine

import (
	"math"
)

var (
	transport = map[string]float64{
		"DE>CZ": 450, "DE>SK": 600, "DE>PL": 500, "DE>AT": 400,
		"AT>CZ": 400, "AT>SK": 350, "AT>PL": 600,
		"NL>CZ": 750, "NL>SK": 900, "NL>PL": 750, "NL>AT": 800,
		"BE>CZ": 800, "BE>SK": 950, "BE>PL": 800, "BE>AT": 850,
		"PL>CZ": 400, "PL>SK": 450, "PL>AT": 650,
	}
	exportReg  = map[string]float64{"DE": 120, "AT": 150, "NL": 130, "BE": 140, "PL": 100}
	importReg  = map[string]float64{"CZ": 300, "SK": 280, "PL": 260, "AT": 450}
	inspection = map[string]float64{"CZ": 90, "SK": 100, "PL": 70, "AT": 120}

	ConditionRepairBase = map[string]float64{"Excellent": 0, "Good": 350, "Fair": 1100, "Poor": 2600}

	CostLabels = []struct{ Key, Label string }{
		{"transport", "Transport"}, {"expreg", "Export registration"}, {"impreg", "Import registration"},
		{"insp", "Inspection"}, {"repairs", "Repairs"}, {"prep", "Preparation"},
		{"sell", "Selling expenses"}, {"hold", "Holding cost"}, {"other", "Additional expenses"},
	}

	SourceCountries = []string{"DE", "AT", "NL", "BE", "PL"}
	DestCountries   = []string{"CZ", "SK", "PL", "AT"}
)

const CurrentYear = 2026

type Route struct {
	Transport, ExportReg, ImportReg, Inspection float64
}

func RouteFor(src, dst string) *Route {
	t, ok := transport[src+">"+dst]
	if src == dst || !ok {
		return nil
	}
	return &Route{Transport: t, ExportReg: exportReg[src], ImportReg: importReg[dst], Inspection: inspection[dst]}
}

func AutoRepairs(cond string, km, year Num) float64 {
	base, ok := ConditionRepairBase[cond]
	if !ok {
		base = 350
	}
	return base + km.F()/1000*3.5 + math.Max(0, CurrentYear-year.OrZeroDefault(CurrentYear))*45
}

type Input struct {
	Price   Num    `json:"price"`
	PCur    string `json:"pcur"`
	Resale  Num    `json:"resale"`
	RCur    string `json:"rcur"`
	Src     string `json:"src"`
	Country string `json:"country,omitempty"`
	Dst     string `json:"dst"`

	Transport Num `json:"transport"`
	ExpReg    Num `json:"expreg"`
	ImpReg    Num `json:"impreg"`
	Insp      Num `json:"insp"`
	Repairs   Num `json:"repairs"`
	Prep      Num `json:"prep"`
	Other     Num `json:"other"`
	Sell      Num `json:"sell"`
	SellPct   Num `json:"sellPct"`
	Hold      Num `json:"hold"`
	Days      Num `json:"days"`
	Cont      Num `json:"cont"`
	Target    Num `json:"target"`

	Year Num    `json:"year"`
	Km   Num    `json:"km"`
	Cond string `json:"cond"`

	FX map[string]float64 `json:"fx,omitempty"`

	VAT          Num    `json:"vat"`
	VATOk        string `json:"vatOk"`
	VATDirection string `json:"vatDirection"`

	RsC Num `json:"rsC"`
	RpC Num `json:"rpC"`
	DyC Num `json:"dyC"`
	RsO Num `json:"rsO"`
	RpO Num `json:"rpO"`
	DyO Num `json:"dyO"`
}

func (i Input) num(key string) Num {
	switch key {
	case "transport":
		return i.Transport
	case "expreg":
		return i.ExpReg
	case "impreg":
		return i.ImpReg
	case "insp":
		return i.Insp
	case "repairs":
		return i.Repairs
	case "prep":
		return i.Prep
	case "sell":
		return i.Sell
	case "hold":
		return i.Hold
	case "other":
		return i.Other
	}
	return Num{}
}

type Scenario struct {
	Rs, Rm, Dm float64
}

var (
	Conservative = Scenario{Rs: -6, Rm: 40, Dm: 50}
	Expected     = Scenario{}
	Optimistic   = Scenario{Rs: 4, Rm: -20, Dm: -30}
)

type Result struct {
	Price        float64 `json:"price"`
	Transport    float64 `json:"transport"`
	ExportReg    float64 `json:"exportReg"`
	ImportReg    float64 `json:"importReg"`
	Inspection   float64 `json:"inspection"`
	Registration float64 `json:"registration"`
	Repairs      float64 `json:"repairs"`
	Prep         float64 `json:"prep"`
	Other        float64 `json:"other"`
	Resale       float64 `json:"resale"`
	Hold         float64 `json:"hold"`
	Contingency  float64 `json:"contingency"`
	SellCosts    float64 `json:"sellCosts"`
	Investment   float64 `json:"investment"`
	TotalCost    float64 `json:"totalCost"`
	Proceeds     float64 `json:"proceeds"`
	Net          float64 `json:"net"`
	ROI          float64 `json:"roi"`
	Margin       float64 `json:"margin"`
	BreakEven    float64 `json:"breakEven"`
	MaxPrice     float64 `json:"maxPrice"`
	VAT          float64 `json:"vat"`
	VATPending   bool    `json:"vatPending"`
	ProfitVAT    float64 `json:"profitWithVat"`
}

var DefaultFX = map[string]float64{"CZK": 25, "PLN": 4.3}

func (i Input) toEUR(x Num, cur string) float64 {
	fx := i.FX
	if fx == nil {
		fx = DefaultFX
	}
	r := fx[cur]
	if !(r > 0) {
		r = 1
	}
	return x.F() / r
}

func Run(i Input, sc Scenario) Result {
	rt := RouteFor(i.Src, i.Dst)
	if rt == nil {
		rt = &Route{}
	}
	p := i.toEUR(i.Price, i.PCur)
	t := i.Transport.Or(rt.Transport)
	ex := i.ExpReg.Or(rt.ExportReg)
	im := i.ImpReg.Or(rt.ImportReg)
	ins := i.Insp.Or(rt.Inspection)
	rp := i.Repairs.Or(AutoRepairs(i.Cond, i.Km, i.Year)) * (1 + sc.Rm/100)
	prep := i.Prep.F()
	oth := i.Other.F()
	r := i.toEUR(i.Resale, i.RCur) * (1 + sc.Rs/100)
	hold := i.Hold.F() * i.Days.OrZeroDefault(45) * (1 + sc.Dm/100)
	ct := rp * i.Cont.F() / 100
	reg := ex + im + ins
	inv := p + t + reg + rp + prep + oth + ct + hold
	sellC := i.Sell.F() + r*i.SellPct.F()/100
	pro := r - sellC
	net := pro - inv
	tgt := i.Target.F() / 100
	sp := i.SellPct.F() / 100
	adj := i.VAT.F()
	vok := i.VATOk == "Yes"
	vat := 0.0
	if vok {
		vat = adj
	}
	res := Result{
		Price: p, Transport: t, ExportReg: ex, ImportReg: im, Inspection: ins, Registration: reg,
		Repairs: rp, Prep: prep, Other: oth, Resale: r, Hold: hold, Contingency: ct, SellCosts: sellC,
		Investment: inv, TotalCost: inv + sellC, Proceeds: pro, Net: net,
		BreakEven:  (inv + i.Sell.F()) / (1 - sp),
		MaxPrice:   (r-sellC)/(1+tgt) - (inv - p),
		VAT:        vat,
		VATPending: !vok && adj != 0,
		ProfitVAT:  net + vat,
	}
	if inv != 0 {
		res.ROI = net / inv
	}
	if r != 0 {
		res.Margin = net / r
	}
	return res
}
