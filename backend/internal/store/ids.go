package store

import (
	"strconv"
	"strings"
)

func itoa(n int64) string { return strconv.FormatInt(n, 10) }

func parseID(s, prefix string) (int64, bool) {
	n, err := strconv.ParseInt(strings.TrimPrefix(s, prefix), 10, 64)
	return n, err == nil && strings.HasPrefix(s, prefix)
}
