package analysis

import (
	"math"
	"strings"

	"flippilot/internal/domain"
)

var riskRank = map[string]int{"Low": 0, "Medium": 1, "High": 2}

func ValidateRules(b domain.DealRules) []string {
	all := []float64{b.Capital, b.MinProfit, b.MinMargin, b.MinROI, b.MaxLoss, b.ReservePct, b.MinPositionPct, b.MaxPositionPct}
	for _, x := range all {
		if math.IsNaN(x) || math.IsInf(x, 0) {
			return []string{"Complete all budget and risk fields with valid numbers."}
		}
	}
	var e []string
	if !(b.Capital > 0) {
		e = append(e, "Available capital must be greater than zero.")
	}
	if b.MinProfit < 0 || b.MinMargin < 0 || b.MinROI < 0 || b.MaxLoss < 0 {
		e = append(e, "Profit, ROI, margin and downside limits cannot be negative.")
	}
	for _, p := range []float64{b.ReservePct, b.MinPositionPct, b.MaxPositionPct} {
		if p < 0 || p > 100 {
			e = append(e, "Reserve and position allocation percentages must be between 0% and 100%.")
			break
		}
	}
	if b.ReservePct >= 100 {
		e = append(e, "The cash reserve must be below 100% to leave capital for purchases.")
	}
	if b.MinPositionPct > b.MaxPositionPct {
		e = append(e, "Minimum per-car allocation cannot exceed the maximum.")
	}
	if b.MaxPositionPct == 0 {
		e = append(e, "Maximum per-car allocation must be above 0%.")
	}
	if _, ok := riskRank[b.MaxRisk]; !ok {
		e = append(e, "Maximum risk must be Low, Medium or High.")
	}
	return e
}

type Capital struct {
	Capital    float64 `json:"capital"`
	Reserve    float64 `json:"reserve"`
	Deployable float64 `json:"deployable"`
	Min        float64 `json:"min"`
	Max        float64 `json:"max"`
}

func CapitalFor(b domain.DealRules) Capital {
	reserve := b.Capital * b.ReservePct / 100
	dep := b.Capital - reserve
	return Capital{b.Capital, reserve, dep, dep * b.MinPositionPct / 100, dep * b.MaxPositionPct / 100}
}

func RejectReasons(r Result, b domain.DealRules) []string {
	c := CapitalFor(b)
	cost, profit := r.Expected.Cost, r.Expected.Net
	margin := 0.0
	if r.Expected.Resale != 0 {
		margin = 100 * profit / r.Expected.Resale
	}
	loss := math.Max(0, -r.Conservative.Net)
	reasons := []string{}
	if cost < c.Min-.005 {
		reasons = append(reasons, "Below minimum position size")
	}
	if cost > c.Max+.005 {
		reasons = append(reasons, "All-in cost exceeds allocation cap")
	}
	if profit < b.MinProfit {
		reasons = append(reasons, "Expected profit below target")
	}
	if margin < b.MinMargin {
		reasons = append(reasons, "Resale profit margin below target")
	}
	if r.Expected.ROI*100 < b.MinROI {
		reasons = append(reasons, "ROI below target")
	}
	if loss > b.MaxLoss {
		reasons = append(reasons, "Conservative-case loss above limit")
	}
	lvl, ok := riskRank[r.RiskLevel.Label]
	if !ok {
		lvl = 3
	}
	max, ok := riskRank[b.MaxRisk]
	if !ok {
		max = 2
	}
	if lvl > max {
		reasons = append(reasons, "Risk level above allowance")
	}
	return reasons
}

func containsFold(s, sub string) bool {
	return sub == "" || strings.Contains(strings.ToLower(s), strings.ToLower(sub))
}

func MatchesAlert(v domain.Vehicle, r Result, a domain.AlertRule) bool {
	if !containsFold(v.Make, a.Make) || !containsFold(v.Model, a.Model) {
		return false
	}
	if a.Country != "" && v.Country != a.Country {
		return false
	}
	if a.Ceiling != 0 && v.Price.F() > a.Ceiling {
		return false
	}
	if r.Expected.Net < a.MinProfit || r.Expected.ROI*100 < a.MinROI {
		return false
	}
	lvl, ok := riskRank[r.RiskLevel.Label]
	max, ok2 := riskRank[a.MaxRisk]
	if !ok2 {
		max = -1
	}
	return ok && lvl <= max
}
