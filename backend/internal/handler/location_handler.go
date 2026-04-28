package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"halo/backend/internal/handler/httputil"
)

// LocationHandler handles location search and reverse geocoding.
type LocationHandler struct {
	httpClient *http.Client
}

// NewLocationHandler creates a new location handler.
func NewLocationHandler() *LocationHandler {
	return &LocationHandler{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// SearchRequest is the request body for location search.
type SearchRequest struct {
	Query string `json:"query"`
}

// LocationSuggestion is a single location result.
type LocationSuggestion struct {
	ID      string `json:"id"`
	Display string `json:"display"`
	Lat     string `json:"lat"`
	Lon     string `json:"lon"`
}

// NominatimResult is the raw response from Nominatim API.
type NominatimResult struct {
	Lat         string           `json:"lat"`
	Lon         string           `json:"lon"`
	DisplayName string           `json:"display_name"`
	Address     NominatimAddress `json:"address"`
}

type NominatimAddress struct {
	City         string `json:"city"`
	Town         string `json:"town"`
	Village      string `json:"village"`
	Hamlet       string `json:"hamlet"`
	Municipality string `json:"municipality"`
	County       string `json:"county"`
	State        string `json:"state"`
	Country      string `json:"country"`
	Postcode     string `json:"postcode"`
}

// ReverseGeocodeResult is the result of reverse geocoding.
type ReverseGeocodeResult struct {
	Display string `json:"display"`
}

// SearchLocations searches for locations by query (city, state, or ZIP code).
func (h *LocationHandler) SearchLocations(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	if query == "" {
		httputil.BadRequest(w, "Query parameter 'q' is required")
		return
	}

	if len(query) < 2 {
		httputil.EncodeJSON(w, http.StatusOK, []LocationSuggestion{})
		return
	}

	nominatimURL := fmt.Sprintf(
		"https://nominatim.openstreetmap.org/search?q=%s&format=json&addressdetails=1&limit=12&countrycodes=us",
		url.QueryEscape(query),
	)

	req, err := http.NewRequest("GET", nominatimURL, nil)
	if err != nil {
		httputil.InternalError(w)
		return
	}

	req.Header.Set("User-Agent", "Halo-Dating-App/1.0")

	resp, err := h.httpClient.Do(req)
	if err != nil {
		httputil.InternalError(w)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		httputil.InternalError(w)
		return
	}

	var results []NominatimResult
	if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
		httputil.InternalError(w)
		return
	}

	suggestions := make([]LocationSuggestion, 0, 8)
	seen := make(map[string]bool)

	for _, item := range results {
		display := preferredDisplay(item)
		if display == "" {
			continue
		}

		// For typed city/state searches, require the visible place name
		// to actually contain the user's query.
		if !isZipQuery(query) && !matchesQuery(display, query) {
			continue
		}

		if seen[display] {
			continue
		}
		seen[display] = true

		suggestions = append(suggestions, LocationSuggestion{
			ID:      fmt.Sprintf("%s-%s", item.Lat, item.Lon),
			Display: display,
			Lat:     item.Lat,
			Lon:     item.Lon,
		})

		if len(suggestions) >= 8 {
			break
		}
	}

	httputil.EncodeJSON(w, http.StatusOK, suggestions)
}

// helper functions
func preferredDisplay(item NominatimResult) string {
	if addr := formatLocationDisplay(item.Address); addr != "" {
		return addr
	}
	return fallbackDisplayName(item.DisplayName)
}

func formatLocationDisplay(addr NominatimAddress) string {
	location := ""
	switch {
	case addr.City != "":
		location = addr.City
	case addr.Town != "":
		location = addr.Town
	case addr.Village != "":
		location = addr.Village
	case addr.Hamlet != "":
		location = addr.Hamlet
	case addr.Municipality != "":
		location = addr.Municipality
	}

	if location != "" && addr.State != "" {
		return fmt.Sprintf("%s, %s", location, addr.State)
	}
	if location != "" {
		return location
	}
	return ""
}

func fallbackDisplayName(displayName string) string {
	displayName = strings.TrimSpace(displayName)
	if displayName == "" {
		return ""
	}

	parts := strings.Split(displayName, ",")
	if len(parts) >= 2 {
		return strings.TrimSpace(parts[0]) + ", " + strings.TrimSpace(parts[1])
	}
	return displayName
}

func isZipQuery(query string) bool {
	query = strings.TrimSpace(query)
	if len(query) < 3 {
		return false
	}
	for _, ch := range query {
		if ch < '0' || ch > '9' {
			return false
		}
	}
	return true
}

func matchesQuery(display, query string) bool {
	display = strings.ToLower(strings.TrimSpace(display))
	query = strings.ToLower(strings.TrimSpace(query))

	// Only compare against the place-name portion before the comma.
	place := display
	if idx := strings.Index(place, ","); idx != -1 {
		place = place[:idx]
	}

	return strings.Contains(place, query)
}

// ReverseGeocode converts coordinates back to a location name.
func (h *LocationHandler) ReverseGeocode(w http.ResponseWriter, r *http.Request) {
	lat := r.URL.Query().Get("lat")
	lon := r.URL.Query().Get("lon")

	if lat == "" || lon == "" {
		httputil.BadRequest(w, "lat and lon parameters are required")
		return
	}

	nominatimURL := fmt.Sprintf(
		"https://nominatim.openstreetmap.org/reverse?format=json&lat=%s&lon=%s",
		url.QueryEscape(lat),
		url.QueryEscape(lon),
	)

	req, err := http.NewRequest("GET", nominatimURL, nil)
	if err != nil {
		httputil.InternalError(w)
		return
	}

	req.Header.Set("User-Agent", "Halo-Dating-App/1.0")

	resp, err := h.httpClient.Do(req)
	if err != nil {
		httputil.InternalError(w)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		httputil.InternalError(w)
		return
	}

	var result NominatimResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		httputil.InternalError(w)
		return
	}

	display := formatLocationDisplay(result.Address)
	if display == "" {
		display = result.Address.Country
	}

	httputil.EncodeJSON(w, http.StatusOK, ReverseGeocodeResult{Display: display})
}

func isPlaceLikeResult(addr NominatimAddress) bool {
	return addr.City != "" ||
		addr.Town != "" ||
		addr.Village != "" ||
		addr.Hamlet != "" ||
		addr.Municipality != ""
}

func isZipLikeQuery(query string, addr NominatimAddress) bool {
	query = strings.TrimSpace(query)
	if query == "" {
		return false
	}

	for _, ch := range query {
		if ch < '0' || ch > '9' {
			return false
		}
	}

	return addr.Postcode != ""
}
