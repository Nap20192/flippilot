package analysis

import (
	"strconv"
	"strings"

	"flippilot/internal/domain"
	"flippilot/internal/engine"
)

type RepairItem struct {
	Key        string  `json:"key"`
	Name       string  `json:"name"`
	Category   string  `json:"category"`
	Low        float64 `json:"low"`
	High       float64 `json:"high"`
	Severity   string  `json:"severity"`
	Check      string  `json:"check"`
	Confidence string  `json:"confidence"`
	Included   bool    `json:"included"`
}

type RepairPlan struct {
	Items    []RepairItem `json:"items"`
	Low      float64      `json:"low"`
	High     float64      `json:"high"`
	Expected float64      `json:"expected"`
}

type repairRule struct {
	name, cat        string
	when             func(v domain.Vehicle, age, km float64) bool
	lo, hi           float64
	sev, check, conf string
}

func descHas(v domain.Vehicle, words ...string) bool {
	d := strings.ToLower(v.Desc)
	for _, w := range words {
		if strings.Contains(d, w) {
			return true
		}
	}
	return false
}

const (
	catPrevent   = "Preventative maintenance"
	catWeakness  = "Model-specific weakness"
	catSuspected = "Suspected defect"
	catConfirmed = "Confirmed defect"
)

var repairRules = []repairRule{
	{"Timing belt or chain and water pump", catPrevent, func(v domain.Vehicle, a, k float64) bool { return k >= 100000 }, 600, 1200, "High", "Ask for the last service invoice. If there is none, budget the work.", "Medium"},
	{"Brake discs and pads", catPrevent, func(v domain.Vehicle, a, k float64) bool { return k > 80000 }, 250, 600, "Medium", "Measure pad and disc thickness.", "Medium"},
	{"Fluids, filters and oil service", catPrevent, func(v domain.Vehicle, a, k float64) bool { return orUnknown(v.Service) != "Full" }, 150, 350, "Low", "No full service history, so assume a service is due.", "Medium"},
	{"Tyres", catPrevent, func(v domain.Vehicle, a, k float64) bool { return k > 60000 }, 300, 800, "Low", "Check tread depth and tyre age.", "Low"},
	{"Clutch", catPrevent, func(v domain.Vehicle, a, k float64) bool { return v.Trans == "Manual" && k > 150000 }, 700, 1500, "Medium", "Check for slipping and a high bite point.", "Medium"},
	{"Automatic gearbox service", catPrevent, func(v domain.Vehicle, a, k float64) bool { return v.Trans == "Automatic" && k > 100000 }, 300, 700, "Medium", "Ask for gearbox service records.", "Medium"},
	{"DPF and EGR system", catWeakness, func(v domain.Vehicle, a, k float64) bool { return v.Engine == "Diesel" && a >= 4 }, 400, 2000, "High", "Common inspection area on diesels. Check warning lights and regeneration history. Not a confirmed fault.", "Low"},
	{"Turbocharger", catWeakness, func(v domain.Vehicle, a, k float64) bool { return v.Engine == "Diesel" && k > 150000 }, 900, 2500, "High", "Listen for whine and check for oil leaks and smoke. Not a confirmed fault.", "Low"},
	{"Automatic transmission wear", catWeakness, func(v domain.Vehicle, a, k float64) bool { return v.Trans == "Automatic" && k > 120000 }, 800, 2500, "High", "Test shifting at low speed and check for judder. Not a confirmed fault.", "Low"},
	{"Suspension and steering wear", catWeakness, func(v domain.Vehicle, a, k float64) bool { return k > 120000 }, 400, 1200, "Medium", "Drive over a rough road and check bushings and shocks.", "Medium"},
	{"Hybrid battery health", catWeakness, func(v domain.Vehicle, a, k float64) bool { return v.Engine == "Hybrid" }, 0, 2500, "Medium", "Request a battery health report. Not a confirmed fault.", "Low"},
	{"Noise mentioned in listing", catSuspected, func(v domain.Vehicle, a, k float64) bool { return descHas(v, "noise", "knock", "klopf", "gerausch") }, 500, 3500, "High", "Cold-start the engine and get a diagnostic read-out.", "Low"},
	{"Rust or corrosion", catSuspected, func(v domain.Vehicle, a, k float64) bool { return descHas(v, "rust", "rost") }, 300, 1500, "Medium", "Inspect sills, wheel arches and underbody.", "Low"},
	{"Accident repair quality", catSuspected, func(v domain.Vehicle, a, k float64) bool {
		return descHas(v, "unfall", "accident", "schaden", "damage") || v.Accident == "Reported"
	}, 400, 2500, "High", "Measure paint thickness and inspect the structure.", "Low"},
	{"Defect mentioned in listing", catSuspected, func(v domain.Vehicle, a, k float64) bool { return descHas(v, "defekt", "bastler", "defect") }, 500, 3000, "High", "Ask the seller exactly what is defective.", "Low"},
}

func PlanRepairs(v domain.Vehicle, confirmed []domain.Defect) RepairPlan {
	age, km := engine.CurrentYear-v.Year.F(), v.Km.F()
	p := RepairPlan{Items: []RepairItem{}}
	for i, r := range repairRules {
		if !r.when(v, age, km) {
			continue
		}
		p.Items = append(p.Items, RepairItem{
			Key: "c" + strconv.Itoa(i), Name: r.name, Category: r.cat, Low: r.lo, High: r.hi,
			Severity: r.sev, Check: r.check, Confidence: r.conf, Included: r.cat != catWeakness,
		})
	}
	for i, d := range confirmed {
		p.Items = append(p.Items, RepairItem{
			Key: "x" + strconv.Itoa(i), Name: d.Description, Category: catConfirmed, Low: d.Cost, High: d.Cost,
			Severity: "High", Check: "Entered by you.", Confidence: "High", Included: true,
		})
	}
	for _, it := range p.Items {
		if it.Included {
			p.Low += it.Low
			p.High += it.High
		}
	}
	p.Expected = (p.Low + p.High) / 2
	return p
}
