package analysis

import (
	"encoding/json"
	"math"
	"os"
	"strings"
	"testing"

	"flippilot/internal/demo"
	"flippilot/internal/domain"
)

type golden struct {
	V     domain.Vehicle `json:"v"`
	Score int            `json:"score"`
	Pts   float64        `json:"pts"`
	Lvl   string         `json:"lvl"`
	Net   float64        `json:"net"`
	ROI   float64        `json:"roi"`
	Cons  float64        `json:"cons"`
	Opt   float64        `json:"opt"`
	MaxP  float64        `json:"maxP"`
	Conf  float64        `json:"conf"`
	Rec   string         `json:"rec"`
	Ins   bool           `json:"ins"`
	Med   float64        `json:"med"`
	NComp int            `json:"ncomp"`
	Risk  []string       `json:"risk"`
}

func near(a, b float64) bool { return math.Abs(a-b) < 1e-6 }

func TestMatchesFrontend(t *testing.T) {
	b, err := os.ReadFile("testdata/golden.json")
	if err != nil {
		t.Fatal(err)
	}
	var cases []golden
	if err := json.Unmarshal(b, &cases); err != nil {
		t.Fatal(err)
	}
	if len(cases) < 19 {
		t.Fatalf("golden file has %d cases, want 19", len(cases))
	}
	s := domain.DefaultSettings()
	for _, g := range cases {
		r := Analyze(g.V, s, demo.Comparables())
		var risk []string
		for _, f := range r.Risk {
			risk = append(risk, f.Text)
		}
		id := g.V.ID + " " + g.V.Make + " " + g.V.Model
		switch {
		case r.Score != g.Score:
			t.Errorf("%s: score %d, want %d", id, r.Score, g.Score)
		case !near(r.RiskPoints, g.Pts) || r.RiskLevel.Label != g.Lvl:
			t.Errorf("%s: risk %v %s, want %v %s", id, r.RiskPoints, r.RiskLevel.Label, g.Pts, g.Lvl)
		case !near(r.Expected.Net, g.Net) || !near(r.Expected.ROI, g.ROI):
			t.Errorf("%s: net %v roi %v, want %v %v", id, r.Expected.Net, r.Expected.ROI, g.Net, g.ROI)
		case !near(r.Conservative.Net, g.Cons) || !near(r.Optimistic.Net, g.Opt) || !near(r.MaxPrice, g.MaxP):
			t.Errorf("%s: cons %v opt %v maxP %v, want %v %v %v", id, r.Conservative.Net, r.Optimistic.Net, r.MaxPrice, g.Cons, g.Opt, g.MaxP)
		case !near(r.Confidence, g.Conf) || r.Recommendation.Label != g.Rec || r.Insufficient != g.Ins:
			t.Errorf("%s: conf %v rec %s ins %v, want %v %s %v", id, r.Confidence, r.Recommendation.Label, r.Insufficient, g.Conf, g.Rec, g.Ins)
		case !near(r.CompsMedian, g.Med) || len(r.Comps) != g.NComp:
			t.Errorf("%s: median %v comps %d, want %v %d", id, r.CompsMedian, len(r.Comps), g.Med, g.NComp)
		case strings.Join(risk, "|") != strings.Join(g.Risk, "|"):
			t.Errorf("%s: risk flags\n got %q\nwant %q", id, risk, g.Risk)
		}
	}
}

func TestRejectReasonsAndRules(t *testing.T) {
	if errs := ValidateRules(domain.DefaultDealRules()); len(errs) != 0 {
		t.Fatal(errs)
	}
	bad := domain.DefaultDealRules()
	bad.MinPositionPct, bad.MaxPositionPct = 90, 10
	if len(ValidateRules(bad)) == 0 {
		t.Fatal("min > max accepted")
	}
	c := CapitalFor(domain.DefaultDealRules())
	if !near(c.Deployable, 25500) || !near(c.Min, 2550) || !near(c.Max, 20400) {
		t.Fatalf("%+v", c)
	}
	v, _ := demo.Listing("d9")
	r := Analyze(v, domain.DefaultSettings(), demo.Comparables())
	if len(RejectReasons(r, domain.DefaultDealRules())) == 0 {
		t.Fatal("high-risk Passat passed the default strategy")
	}
}

func TestRepairPlan(t *testing.T) {
	v, _ := demo.Listing("d9")
	p := PlanRepairs(v, []domain.Defect{{Description: "Broken mirror", Cost: 120}})
	var names []string
	for _, it := range p.Items {
		names = append(names, it.Name)
	}
	all := strings.Join(names, "|")
	for _, want := range []string{"Timing belt", "Noise mentioned", "Turbocharger", "Broken mirror"} {
		if !strings.Contains(all, want) {
			t.Errorf("missing %q in %s", want, all)
		}
	}
	if !(p.Low <= p.Expected && p.Expected <= p.High) {
		t.Fatalf("%+v", p)
	}
}
