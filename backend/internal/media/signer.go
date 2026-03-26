package media

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha1"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"fmt"
	"strings"
	"time"
)

// Signer creates signed URLs for media assets.
// In production, this signs CloudFront URLs with an RSA key pair.
// URLs are generated per-request and MUST be short-lived (≤ 15 minutes).
// Callers must NEVER cache or persist signed URLs.
type Signer interface {
	// SignURL returns a signed URL for the given S3 object key.
	// The URL expires after the configured duration.
	// The returned URL is single-use-intent: generate a fresh one for every request.
	SignURL(objectKey string) (url string, expiresAt time.Time, err error)
}

// MaxURLExpiry is the hard maximum for signed URL expiry.
// Even if configured higher, URLs will be capped at this duration.
const MaxURLExpiry = 15 * time.Minute

// CloudFrontSigner signs URLs using CloudFront private key.
type CloudFrontSigner struct {
	domain     string
	keyPairID  string
	privateKey *rsa.PrivateKey
	expiry     time.Duration
}

// NewCloudFrontSigner creates a CloudFront URL signer.
// If keyPEM is empty, returns a DevSigner instead.
// Expiry is capped at MaxURLExpiry to ensure short-lived URLs.
func NewCloudFrontSigner(domain, keyPairID, keyPEM string, expiry time.Duration) (Signer, error) {
	// Enforce maximum expiry duration.
	if expiry <= 0 || expiry > MaxURLExpiry {
		expiry = MaxURLExpiry
	}

	if keyPEM == "" || domain == "" {
		// Dev mode: return unsigned URLs
		return &DevSigner{
			domain: domain,
			expiry: expiry,
		}, nil
	}

	block, _ := pem.Decode([]byte(keyPEM))
	if block == nil {
		return nil, fmt.Errorf("failed to decode PEM block")
	}

	key, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		// Try PKCS8
		parsed, err2 := x509.ParsePKCS8PrivateKey(block.Bytes)
		if err2 != nil {
			return nil, fmt.Errorf("parse private key: %w (pkcs8: %w)", err, err2)
		}
		var ok bool
		key, ok = parsed.(*rsa.PrivateKey)
		if !ok {
			return nil, fmt.Errorf("private key is not RSA")
		}
	}

	return &CloudFrontSigner{
		domain:     domain,
		keyPairID:  keyPairID,
		privateKey: key,
		expiry:     expiry,
	}, nil
}

// SignURL creates a CloudFront signed URL for the given object key.
func (s *CloudFrontSigner) SignURL(objectKey string) (string, time.Time, error) {
	expiresAt := time.Now().Add(s.expiry)
	epoch := expiresAt.Unix()

	resourceURL := fmt.Sprintf("https://%s/%s", s.domain, objectKey)

	// CloudFront canned policy
	policy := fmt.Sprintf(`{"Statement":[{"Resource":"%s","Condition":{"DateLessThan":{"AWS:EpochTime":%d}}}]}`, resourceURL, epoch)

	// Sign with SHA-1 (CloudFront requirement for canned policies)
	hash := sha1.Sum([]byte(policy))
	sig, err := rsa.SignPKCS1v15(rand.Reader, s.privateKey, crypto.SHA1, hash[:])
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign url: %w", err)
	}

	// URL-safe base64 encoding
	encoded := base64.StdEncoding.EncodeToString(sig)
	encoded = strings.ReplaceAll(encoded, "+", "-")
	encoded = strings.ReplaceAll(encoded, "=", "_")
	encoded = strings.ReplaceAll(encoded, "/", "~")

	signedURL := fmt.Sprintf("%s?Expires=%d&Signature=%s&Key-Pair-Id=%s",
		resourceURL, epoch, encoded, s.keyPairID)

	return signedURL, expiresAt, nil
}

// DevSigner is a development-mode signer that returns unsigned URLs.
type DevSigner struct {
	domain string
	expiry time.Duration
}

// SignURL returns an unsigned URL suitable for local development.
func (s *DevSigner) SignURL(objectKey string) (string, time.Time, error) {
	expiresAt := time.Now().Add(s.expiry)
	if s.domain != "" {
		url := fmt.Sprintf("https://%s/%s", s.domain, objectKey)
		return url, expiresAt, nil
	}
	// Fallback: return a placeholder URL for local dev without CloudFront
	url := fmt.Sprintf("http://localhost:4566/%s", objectKey) // LocalStack-style
	return url, expiresAt, nil
}
