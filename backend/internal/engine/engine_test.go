package engine

import (
	"math"
	"strings"
	"testing"
)

func base() Input {
	return Input{
		Price: N(10000), PCur: "EUR", Resale: N(12000), RCur: "EUR", Src: "DE", Dst: "CZ",
		Transport: N(500), ExpReg: N(100), ImpReg: N(300), Insp: N(100), Repairs: N(500),
		Prep: N(0), Other: N(0), Sell: N(0), SellPct: N(0), Hold: N(0), Days: N(45), Cont: N(0),
		Target: N(10), Year: N(2021), Km: N(60000), Cond: "Good",
		FX: map[string]float64{"CZK": 25, "PLN": 4.3},
	}
}

func approx(a, b, eps float64) bool { return math.Abs(a-b) <= eps }

func blankRoute(i Input) Input {
	i.Transport, i.ExpReg, i.ImpReg, i.Insp = Num{}, Num{}, Num{}, Num{}
	return i
}

func contains(errs []string, s string) bool {
	for _, e := range errs {
		if strings.Contains(e, s) {
			return true
		}
	}
	return false
}

func TestNetProfitROIMargin(t *testing.T) {
	x := Run(base(), Expected)
	if !approx(x.Investment, 11500, .01) || !approx(x.Net, 500, .01) ||
		!approx(x.ROI, 500.0/11500, 1e-9) || !approx(x.Margin, 500.0/12000, 1e-9) {
		t.Fatalf("got %+v", x)
	}
}

func TestBreakEvenGivesZeroProfit(t *testing.T) {
	i := base()
	i.Sell, i.SellPct = N(200), N(2)
	be := Run(i, Expected).BreakEven
	i.Resale = N(be)
	if net := Run(i, Expected).Net; !approx(net, 0, .001) {
		t.Fatalf("net at break-even = %v", net)
	}
}

func TestMaxPriceHitsTargetROI(t *testing.T) {
	i := base()
	i.SellPct = N(2)
	i.Price = N(Run(i, Expected).MaxPrice)
	if roi := Run(i, Expected).ROI; !approx(roi, .1, 1e-6) {
		t.Fatalf("roi at max price = %v", roi)
	}
}

func TestScenariosOrdered(t *testing.T) {
	a, b, c := Run(base(), Conservative), Run(base(), Expected), Run(base(), Optimistic)
	if !(a.Net < b.Net && b.Net < c.Net) || !approx(a.Resale, 11280, .01) ||
		!approx(a.Repairs, 700, .01) || !approx(c.Repairs, 400, .01) {
		t.Fatalf("a=%+v b=%+v c=%+v", a, b, c)
	}
}

func TestCurrencyConversion(t *testing.T) {
	i := base()
	i.Price, i.PCur = N(250000), "CZK"
	if p := Run(i, Expected).Price; !approx(p, 10000, .01) {
		t.Fatalf("p=%v", p)
	}
	i.FX = map[string]float64{"CZK": 20, "PLN": 4.3}
	if p := Run(i, Expected).Price; !approx(p, 12500, .01) {
		t.Fatalf("p=%v", p)
	}
}

func TestUnverifiedVATNeverChangesProfit(t *testing.T) {
	i := base()
	i.VAT, i.VATOk = N(1000), "No"
	a := Run(i, Expected)
	i.VATOk = "Yes"
	b := Run(i, Expected)
	if !approx(a.Net, 500, .01) || a.VAT != 0 || !a.VATPending || !approx(b.Net, 500, .01) || !approx(b.ProfitVAT, 1500, .01) {
		t.Fatalf("a=%+v b=%+v", a, b)
	}
}

func TestRouteChangesCosts(t *testing.T) {
	i := blankRoute(base())
	a := Run(i, Expected)
	nl := i
	nl.Src = "NL"
	b := Run(nl, Expected)
	pl := i
	pl.Dst = "PL"
	c := Run(pl, Expected)
	if a.Transport != 450 || b.Transport != 750 || a.Registration == c.Registration || RouteFor("DE", "DE") != nil {
		t.Fatalf("a=%v b=%v regA=%v regC=%v", a.Transport, b.Transport, a.Registration, c.Registration)
	}
}

func TestExplicitZeroOverridesDefault(t *testing.T) {
	i := base()
	i.Transport = N(0)
	if Run(i, Expected).Transport != 0 {
		t.Fatal("explicit zero ignored")
	}
	i.Transport = Num{}
	if Run(i, Expected).Transport != 450 {
		t.Fatal("blank did not use route default")
	}
}

func TestHoldingCost(t *testing.T) {
	i := base()
	i.Hold, i.Days = N(8), N(45)
	if h := Run(i, Expected).Hold; !approx(h, 360, .01) {
		t.Fatalf("hold=%v", h)
	}
}

func TestContingency(t *testing.T) {
	i := base()
	i.Cont = N(10)
	if c := Run(i, Expected).Contingency; !approx(c, 50, .01) {
		t.Fatalf("ct=%v", c)
	}
}

func TestValidationRejectsInvalidInput(t *testing.T) {
	cases := map[string]func(*Input){
		"negative repairs": func(i *Input) { i.Repairs = N(-1) },
		"year 1850":        func(i *Input) { i.Year = N(1850) },
		"negative km":      func(i *Input) { i.Km = N(-5) },
		"km 2e6":           func(i *Input) { i.Km = N(2e6) },
		"blank price":      func(i *Input) { i.Price = Num{} },
		"blank resale":     func(i *Input) { i.Resale = Num{} },
		"same country":     func(i *Input) { i.Dst = "DE" },
	}
	for name, mut := range cases {
		i := base()
		mut(&i)
		if errs := Validate(i, ModeCalc); len(errs) != 1 {
			t.Errorf("%s: want 1 error, got %v", name, errs)
		}
	}
}

func TestValidationAcceptsValidVehicle(t *testing.T) {
	if errs := Validate(base(), ModeCalc); len(errs) != 0 {
		t.Fatal(errs)
	}
}

func TestNegativeVATAndTargetRejected(t *testing.T) {
	i := base()
	i.VAT = N(-500)
	if !contains(Validate(i, ModeCalc), "VAT amount") {
		t.Error("negative VAT accepted")
	}
	i = base()
	i.Target = N(-5)
	if !contains(Validate(i, ModeCalc), "Target ROI") {
		t.Error("negative target accepted")
	}
}

func TestNegativeScenarioMagnitudeRejected(t *testing.T) {
	i := base()
	i.RsC = N(-6)
	if !contains(Validate(i, ModeCalc), "Conservative resale") {
		t.Error("negative rsC accepted")
	}
	i = base()
	i.RpO = N(-20)
	if !contains(Validate(i, ModeCalc), "Optimistic repairs") {
		t.Error("negative rpO accepted")
	}
}

func TestScenarioLimitedTo100(t *testing.T) {
	i := base()
	i.RsC = N(120)
	if !contains(Validate(i, ModeCalc), "100%") {
		t.Error("rsC 120 accepted")
	}
	i = base()
	i.DyO = N(105)
	if !contains(Validate(i, ModeCalc), "100%") {
		t.Error("dyO 105 accepted")
	}
}

func TestAllCostFieldsRejectNegative(t *testing.T) {
	for _, f := range CostLabels {
		i := base()
		neg := N(-1)
		switch f.Key {
		case "transport":
			i.Transport = neg
		case "expreg":
			i.ExpReg = neg
		case "impreg":
			i.ImpReg = neg
		case "insp":
			i.Insp = neg
		case "repairs":
			i.Repairs = neg
		case "prep":
			i.Prep = neg
		case "sell":
			i.Sell = neg
		case "hold":
			i.Hold = neg
		case "other":
			i.Other = neg
		}
		if len(Validate(i, ModeCalc)) == 0 {
			t.Errorf("%s: negative accepted", f.Key)
		}
	}
}

func TestNumJSON(t *testing.T) {
	var i Input
	if err := jsonUnmarshal(`{"price":"","resale":"12000","transport":0,"repairs":null,"km":"abc"}`, &i); err != nil {
		t.Fatal(err)
	}
	if i.Price.Valid || !i.Resale.Valid || i.Resale.V != 12000 || !i.Transport.Valid || i.Repairs.Valid || !math.IsNaN(i.Km.V) {
		t.Fatalf("%+v", i)
	}
}
