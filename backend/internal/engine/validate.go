package engine

import "math"

type Mode string

const (
	ModeCalc     Mode = "calc"
	ModeAnalyzer Mode = "analyzer"
)

func Validate(i Input, mode Mode) []string {
	var e []string
	neg := func(x Num) bool { return x.Valid && x.V < 0 }

	if !(i.Price.Valid && i.Price.V > 0) {
		e = append(e, "Purchase price must be greater than 0.")
	}
	if mode == ModeCalc && !(i.Resale.Valid && i.Resale.V > 0) {
		e = append(e, "Expected resale price must be greater than 0.")
	}
	if mode != ModeCalc && i.Resale.Valid && !(i.Resale.V > 0) {
		e = append(e, "Resale price must be greater than 0, or left blank.")
	}
	y := i.Year.V
	if !(i.Year.Valid && y == math.Trunc(y) && y >= 1990 && y <= 2027) {
		e = append(e, "Vehicle year must be a whole year between 1990 and 2027.")
	}
	if !(i.Km.Valid && i.Km.V >= 0 && i.Km.V <= 1_000_000) {
		e = append(e, "Mileage must be between 0 and 1,000,000 km.")
	}
	for _, f := range CostLabels {
		x := i.num(f.Key)
		if x.Valid && (!x.Finite() || neg(x)) {
			e = append(e, f.Label+" must be a nonnegative number.")
		}
	}
	if i.Cont.Valid && (!i.Cont.Finite() || i.Cont.V < 0 || i.Cont.V > 100) {
		e = append(e, "Contingency must be between 0 and 100%.")
	}
	if mode == ModeCalc {
		fields := []struct {
			n     Num
			label string
			max   bool
		}{
			{i.VAT, "VAT amount", false},
			{i.Target, "Target ROI", false},
			{i.SellPct, "Selling percentage", false},
			{i.RsC, "Conservative resale decrease", true},
			{i.RpC, "Conservative repairs increase", false},
			{i.DyC, "Conservative holding increase", false},
			{i.RsO, "Optimistic resale increase", false},
			{i.RpO, "Optimistic repairs decrease", true},
			{i.DyO, "Optimistic holding decrease", true},
		}
		for _, f := range fields {
			if f.n.Valid && (!f.n.Finite() || f.n.V < 0) {
				e = append(e, f.label+" must be 0 or greater.")
			}
		}
		for _, f := range fields {
			if f.max && f.n.Valid && f.n.V > 100 {
				e = append(e, f.label+" cannot exceed 100%.")
			}
		}
		if i.VATDirection != "" && i.VATDirection != "Recoverable" && i.VATDirection != "Payable" {
			e = append(e, "Select a valid VAT treatment.")
		}
	}
	if i.Days.Valid && !(i.Days.V >= 1 && i.Days.V <= 730) {
		e = append(e, "Holding period must be between 1 and 730 days.")
	}
	src := i.Src
	if src == "" {
		src = i.Country
	}
	dst := i.Dst
	if dst == "" {
		dst = "CZ"
	}
	if RouteFor(src, dst) == nil {
		e = append(e, "Source and destination must be different supported countries.")
	}
	return e
}
