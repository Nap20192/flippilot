package demo

import (
	_ "embed"
	"encoding/json"
	"fmt"

	"flippilot/internal/domain"
	"flippilot/internal/engine"
)

//go:embed data.json
var raw []byte

var (
	listings    []domain.Vehicle
	comparables []domain.Comparable
)

func init() {
	var d struct {
		D   [][]any `json:"D"`
		CZC [][]any `json:"CZC"`
	}
	if err := json.Unmarshal(raw, &d); err != nil {
		panic(err)
	}
	for i, a := range d.D {
		listings = append(listings, domain.Vehicle{
			ID: fmt.Sprintf("d%d", i), Make: a[0].(string), Model: a[1].(string),
			Year: engine.N(a[2].(float64)), Km: engine.N(a[3].(float64)),
			Engine: a[4].(string), Trans: a[5].(string), Cond: a[6].(string), Country: a[7].(string),
			Dst: "CZ", Price: engine.N(a[8].(float64)), Resale: engine.N(a[9].(float64)),
			Desc: a[10].(string), Days: engine.N(45), Accident: "Unknown", Service: "Unknown", Demo: true,
		})
	}
	for _, c := range d.CZC {
		comparables = append(comparables, domain.Comparable{
			Make: c[0].(string), Model: c[1].(string), Year: c[2].(float64), Km: c[3].(float64),
			Engine: c[4].(string), Price: c[5].(float64), Source: c[6].(string),
		})
	}
}

func Listings() []domain.Vehicle { return append([]domain.Vehicle(nil), listings...) }

func Listing(id string) (domain.Vehicle, bool) {
	for _, v := range listings {
		if v.ID == id {
			return v, true
		}
	}
	return domain.Vehicle{}, false
}

func Comparables() []domain.Comparable { return comparables }
