package engine

import (
	"bytes"
	"encoding/json"
	"math"
	"strconv"
	"strings"
)

type Num struct {
	V     float64
	Valid bool
}

func N(v float64) Num { return Num{V: v, Valid: true} }

func (n Num) Or(d float64) float64 {
	if n.Valid {
		return n.V
	}
	return d
}

func (n Num) F() float64 {
	if !n.Valid || math.IsNaN(n.V) {
		return 0
	}
	return n.V
}

func (n Num) OrZeroDefault(d float64) float64 {
	if v := n.F(); v != 0 {
		return v
	}
	return d
}

func (n Num) Finite() bool { return n.Valid && !math.IsNaN(n.V) && !math.IsInf(n.V, 0) }

func (n Num) MarshalJSON() ([]byte, error) {
	if !n.Valid || math.IsNaN(n.V) || math.IsInf(n.V, 0) {
		return []byte("null"), nil
	}
	return json.Marshal(n.V)
}

func (n *Num) UnmarshalJSON(b []byte) error {
	b = bytes.TrimSpace(b)
	if string(b) == "null" {
		*n = Num{}
		return nil
	}
	if len(b) > 0 && b[0] == '"' {
		var s string
		if err := json.Unmarshal(b, &s); err != nil {
			return err
		}
		s = strings.TrimSpace(s)
		if s == "" {
			*n = Num{}
			return nil
		}
		v, err := strconv.ParseFloat(s, 64)
		if err != nil {
			v = math.NaN()
		}
		*n = Num{V: v, Valid: true}
		return nil
	}
	var v float64
	if err := json.Unmarshal(b, &v); err != nil {
		return err
	}
	*n = Num{V: v, Valid: true}
	return nil
}
