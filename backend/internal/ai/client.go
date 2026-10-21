package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"flippilot/internal/domain"
)

var ErrNotConfigured = errors.New("ai service is not connected")

type Flag struct {
	Level string `json:"level"`
	Text  string `json:"text"`
}

type SuspectedDefect struct {
	Name       string  `json:"name"`
	Low        float64 `json:"low"`
	High       float64 `json:"high"`
	Confidence string  `json:"confidence"`
	Evidence   string  `json:"evidence"`
}

type ListingAnalysis struct {
	Summary          string            `json:"summary"`
	Flags            []Flag            `json:"flags"`
	SuspectedDefects []SuspectedDefect `json:"suspectedDefects"`
	Model            string            `json:"model,omitempty"`
}

type Client struct {
	baseURL string
	http    *http.Client
}

func New(baseURL string) *Client {
	return &Client{baseURL: strings.TrimRight(baseURL, "/"), http: &http.Client{Timeout: 30 * time.Second}}
}

func (c *Client) Enabled() bool { return c != nil && c.baseURL != "" }

func (c *Client) AnalyzeListing(ctx context.Context, v domain.Vehicle) (ListingAnalysis, error) {
	var out ListingAnalysis
	if !c.Enabled() {
		return out, ErrNotConfigured
	}
	body, err := json.Marshal(map[string]any{"vehicle": v})
	if err != nil {
		return out, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/v1/listing-analysis", bytes.NewReader(body))
	if err != nil {
		return out, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return out, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return out, fmt.Errorf("ai service: %s: %s", resp.Status, strings.TrimSpace(string(msg)))
	}
	err = json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&out)
	return out, err
}

func (c *Client) Health(ctx context.Context) error {
	if !c.Enabled() {
		return ErrNotConfigured
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/healthz", nil)
	if err != nil {
		return err
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("ai service: %s", resp.Status)
	}
	return nil
}
