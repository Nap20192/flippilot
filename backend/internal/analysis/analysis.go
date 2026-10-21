package analysis

import (
	"fmt"
	"math"
	"regexp"
	"sort"
	"strings"

	"flippilot/internal/domain"
	"flippilot/internal/engine"
)

type Level string

const (
	Green Level = "g"
	Amber Level = "a"
	Red   Level = "r"
	Blue  Level = "b"
)

type Flag struct {
	Level Level  `json:"level"`
	Text  string `json:"text"`
}

type Labeled struct {
	Label string `json:"label"`
	Level Level  `json:"level"`
}

type Case struct {
	Resale  float64 `json:"resale"`
	Repairs float64 `json:"repairs"`
	Hold    float64 `json:"hold"`
	Fees    float64 `json:"fees"`
	Cost    float64 `json:"cost"`
	Net     float64 `json:"net"`
	ROI     float64 `json:"roi"`
}

type Comp struct {
	domain.Comparable
	Similarity float64 `json:"similarity"`
	Adjusted   float64 `json:"adjusted"`
}

type Result struct {
	Insufficient bool `json:"insufficient"`

	ResaleFromComps bool    `json:"resaleFromComps"`
	CompsMedian     float64 `json:"compsMedian"`
	Comps           []Comp  `json:"comps"`

	Resale       float64 `json:"resale"`
	Transport    float64 `json:"transport"`
	Registration float64 `json:"registration"`
	Days         float64 `json:"days"`
	MaxPrice     float64 `json:"maxPrice"`

	Expected     Case `json:"expected"`
	Conservative Case `json:"conservative"`
	Optimistic   Case `json:"optimistic"`

	Risk       []Flag  `json:"risk"`
	RiskPoints float64 `json:"riskPoints"`
	RiskLevel  Labeled `json:"riskLevel"`
	Score      int     `json:"score"`
	Verdict    Labeled `json:"verdict"`

	Missing        []string `json:"missing"`
	Confidence     float64  `json:"confidence"`
	ConfidenceLvl  Labeled  `json:"confidenceLevel"`
	Recommendation Labeled  `json:"recommendation"`
}

var warningTerms = regexp.MustCompile(`(?i)unfall|accident|damage|schaden|bastler|defekt|noise|rust|no service|export`)

const thinMargin = "Thin margin: small price moves erase the profit"

func clamp(x, a, b float64) float64 { return math.Max(a, math.Min(b, x)) }

func jsRound(x float64) float64 { return math.Floor(x + .5) }

func pct(x float64) string { return fmt.Sprintf("%.1f%%", x*100) }

func formatKm(km float64) string {
	s := fmt.Sprintf("%.0f", km)
	var b strings.Builder
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteByte(',')
		}
		b.WriteRune(c)
	}
	return b.String()
}

func firstWord(s string) string { return strings.ToLower(strings.SplitN(s, " ", 2)[0]) }

var displacement = regexp.MustCompile(`\d\.\d`)

func Comparables(v domain.Vehicle, pool []domain.Comparable) []Comp {
	y, k := v.Year.F(), v.Km.F()
	var out []Comp
	for _, c := range pool {
		if c.Make != v.Make || firstWord(c.Model) != firstWord(v.Model) {
			continue
		}
		dy := math.Abs(c.Year - y)
		dk := 1.0
		if k != 0 {
			dk = math.Abs(c.Km-k) / k
		}
		s := 35.0
		if displacement.FindString(c.Model) == displacement.FindString(v.Model) {
			s += 15
		}
		switch {
		case dy <= 1:
			s += 25
		case dy <= 2:
			s += 15
		case dy <= 4:
			s += 5
		}
		switch {
		case dk < .2:
			s += 15
		case dk < .4:
			s += 8
		}
		if c.Engine == v.Engine {
			s += 10
		}
		if s < 55 {
			continue
		}
		out = append(out, Comp{Comparable: c, Similarity: s, Adjusted: c.Price + (c.Km-k)*.04 + (y-c.Year)*700})
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Similarity > out[j].Similarity })
	if len(out) > 5 {
		out = out[:5]
	}
	return out
}

func riskLevel(pts float64) Labeled {
	switch {
	case pts < 8:
		return Labeled{"Low", Green}
	case pts < 16:
		return Labeled{"Medium", Amber}
	}
	return Labeled{"High", Red}
}

func Verdict(s int) Labeled {
	switch {
	case s >= 85:
		return Labeled{"Excellent potential", Green}
	case s >= 70:
		return Labeled{"Good potential", Green}
	case s >= 50:
		return Labeled{"Average", Blue}
	case s >= 30:
		return Labeled{"High caution", Amber}
	}
	return Labeled{"Poor opportunity", Red}
}

func toCase(o engine.Result) Case {
	return Case{
		Resale: o.Resale, Repairs: o.Repairs, Hold: o.Hold,
		Fees: o.TotalCost - o.Price - o.Transport - o.Registration - o.Repairs - o.Hold,
		Cost: o.TotalCost, Net: o.Net, ROI: o.ROI,
	}
}

func Analyze(v domain.Vehicle, s domain.Settings, pool []domain.Comparable) Result {
	var r Result
	r.Comps = Comparables(v, pool)
	if len(r.Comps) >= 3 {
		adj := make([]float64, len(r.Comps))
		for i, c := range r.Comps {
			adj[i] = c.Adjusted
		}
		sort.Float64s(adj)
		r.CompsMedian = adj[len(adj)>>1]
	}
	blank := !(v.Resale.F() > 0)
	r.ResaleFromComps = blank && r.CompsMedian > 0
	r.Insufficient = blank && !r.ResaleFromComps
	if r.ResaleFromComps {
		v.Resale = engine.N(jsRound(r.CompsMedian))
	}

	price, km := v.Price.F(), v.Km.F()
	age := engine.CurrentYear - v.Year.F()
	est := !(v.Resale.F() > 0)
	resale := v.Resale.F()
	if est {
		resale = price * 1.14
	}
	dst := v.Dst
	if dst == "" {
		dst = "CZ"
	}

	in := engine.Input{
		Src: v.Country, Dst: dst, Price: v.Price, PCur: "EUR", Resale: engine.N(resale), RCur: "EUR",
		Days: v.Days, Transport: v.Transport, Repairs: v.Repairs,
		Sell: engine.N(s.Fees), SellPct: engine.N(2), Hold: engine.N(s.Day), Target: engine.N(s.Target),
		Year: v.Year, Km: v.Km, Cond: v.Cond, FX: s.FX(),
	}
	x := engine.Run(in, engine.Expected)
	r.Expected = toCase(x)
	r.Conservative = toCase(engine.Run(in, engine.Conservative))
	r.Optimistic = toCase(engine.Run(in, engine.Optimistic))
	r.Resale, r.Transport, r.Registration, r.MaxPrice = x.Resale, x.Transport, x.Registration, x.MaxPrice
	r.Days = v.Days.OrZeroDefault(45)

	var pts float64
	add := func(p float64, l Level, t string) { pts += p; r.Risk = append(r.Risk, Flag{l, t}) }
	if km > 200000 {
		add(6, Red, "Very high mileage ("+formatKm(km)+" km): drivetrain wear risk")
	} else if km > 150000 {
		add(3, Amber, "High mileage: budget extra for wear parts")
	}
	if age > 12 {
		add(5, Red, fmt.Sprintf("Vehicle is %.0f years old", age))
	} else if age > 8 {
		add(2, Amber, fmt.Sprintf("Vehicle is %.0f years old", age))
	}
	if v.Cond == "Poor" {
		add(6, Red, "Poor condition: repair estimate is uncertain")
	} else if v.Cond == "Fair" {
		add(3, Amber, "Fair condition: inspect before buying")
	}
	base, ok := engine.ConditionRepairBase[v.Cond]
	if !ok {
		base = 350
	}
	rep := v.Repairs.Or(base + km/1000*3.5 + age*45)
	if price != 0 && rep/price > .15 {
		add(4, Amber, "Repairs are "+pct(rep/price)+" of the purchase price")
	}
	if warningTerms.MatchString(v.Desc) {
		add(6, Red, "Description contains a warning term (damage, noise, export or missing service)")
	}
	if est {
		add(3, Amber, "Resale price is a model estimate: verify against Czech listings")
	}
	if r.Expected.ROI < .08 {
		add(3, Amber, thinMargin)
	}

	acc, sv := orUnknown(v.Accident), orUnknown(v.Service)
	var ep float64
	if acc == "Reported" {
		ep += 6
		r.Risk = append([]Flag{{Red, "Accident reported for this vehicle"}}, r.Risk...)
	}
	if sv == "None" {
		ep += 4
		r.Risk = append(r.Risk, Flag{Amber, "No service history"})
	} else if sv == "Partial" {
		ep += 2
		r.Risk = append(r.Risk, Flag{Amber, "Partial service history"})
	}
	pts += ep
	if len(r.Risk) == 0 {
		r.Risk = []Flag{{Green, "No major risk flags found"}}
	}
	r.RiskPoints = pts
	r.RiskLevel = riskLevel(pts)
	r.Score = int(jsRound(clamp(r.Expected.ROI/.25, 0, 1)*50 + clamp((r.Conservative.ROI+.1)/.15, 0, 1)*25 + 25 - math.Min(25, pts)))
	r.Verdict = Verdict(r.Score)

	r.Missing = []string{}
	if blank {
		r.Missing = append(r.Missing, "resale price")
	}
	if v.Desc == "" {
		r.Missing = append(r.Missing, "description")
	}
	if acc == "Unknown" {
		r.Missing = append(r.Missing, "accident history")
	}
	if sv == "Unknown" {
		r.Missing = append(r.Missing, "service history")
	}
	if v.VIN == "" {
		r.Missing = append(r.Missing, "VIN")
	}
	conf := 30.0
	if blank {
		conf = 0
		if r.ResaleFromComps {
			conf = 20
		}
	}
	conf += float64(min(len(r.Comps), 5)) * 5
	if v.Desc != "" {
		conf += 10
	}
	if v.Repairs.Valid {
		conf += 5
	}
	if acc != "Unknown" {
		conf += 10
	}
	if sv != "Unknown" {
		conf += 10
	}
	if v.VIN != "" {
		conf += 5
	}
	if km > 0 && v.Year.F() > 0 {
		conf += 5
	}
	r.Confidence = conf
	switch {
	case conf >= 70:
		r.ConfidenceLvl = Labeled{"High", Green}
	case conf >= 40:
		r.ConfidenceLvl = Labeled{"Medium", Amber}
	default:
		r.ConfidenceLvl = Labeled{"Low", Red}
	}

	switch {
	case r.Insufficient:
		r.Recommendation = Labeled{"Investigate further", Amber}
	case r.Score < 35 || r.Expected.Net <= 0:
		r.Recommendation = Labeled{"Avoid", Red}
	case conf < 40 || r.Score < 70 || r.RiskLevel.Label == "High":
		r.Recommendation = Labeled{"Investigate further", Amber}
	default:
		r.Recommendation = Labeled{"Consider buying", Green}
	}
	return r
}

func orUnknown(s string) string {
	if s == "" {
		return "Unknown"
	}
	return s
}
