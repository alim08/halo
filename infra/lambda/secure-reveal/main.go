package main

// Secure Reveal Variant Generator
//
// This Lambda function is triggered by S3 PutObject events when a user
// uploads an original photo. It generates four blur variants:
//
//   - blur_heavy (Level 1): Heavy Gaussian blur, ~30px radius
//   - blur_med   (Level 2): Medium blur, ~15px radius
//   - blur_light (Level 3-4): Light blur, ~5px radius
//   - clear      (Level 5): No blur, original quality (resized/optimized)
//
// Output format:
//   Input:  photos/{userID}/originals/{photoID}.{ext}
//   Output: photos/{userID}/variants/{photoID}_{variant}.webp
//
// After generating all variants, the function updates the user_photos
// record via a direct DB call or an API callback to set the variant keys
// and mark processing_status = 'ready'.
//
// Environment variables:
//   - HALO_DATABASE_URL: PostgreSQL connection string
//   - HALO_S3_BUCKET: S3 bucket for reading originals and writing variants
//   - AWS_REGION: AWS region

import (
	"context"
	"fmt"
	"log"
	"os"
	"path"
	"strings"
)

// S3Event represents an S3 notification event (simplified).
type S3Event struct {
	Records []S3EventRecord `json:"Records"`
}

// S3EventRecord is a single record in an S3 event.
type S3EventRecord struct {
	S3 S3Entity `json:"s3"`
}

// S3Entity holds the S3 event details.
type S3Entity struct {
	Bucket S3Bucket `json:"bucket"`
	Object S3Object `json:"object"`
}

// S3Bucket is the bucket info in an S3 event.
type S3Bucket struct {
	Name string `json:"name"`
}

// S3Object is the object info in an S3 event.
type S3Object struct {
	Key string `json:"key"`
}

// Variants to generate.
var variants = []string{"blur_heavy", "blur_med", "blur_light", "clear"}

// Handler is the Lambda entry point.
// In production, this would be registered with the AWS Lambda Go SDK:
//   lambda.Start(Handler)
func Handler(ctx context.Context, event S3Event) error {
	for _, record := range event.Records {
		objectKey := record.S3.Object.Key
		bucket := record.S3.Bucket.Name

		log.Printf("Processing: bucket=%s key=%s", bucket, objectKey)

		// Parse the object key to extract userID and photoID.
		// Expected format: photos/{userID}/originals/{photoID}.{ext}
		userID, photoID, err := parseObjectKey(objectKey)
		if err != nil {
			log.Printf("Skipping non-photo key %s: %v", objectKey, err)
			continue
		}

		// TODO: In production, implement:
		// 1. Download the original from S3
		// 2. Decode the image
		// 3. For each variant, apply the appropriate blur level
		// 4. Encode as WebP and upload to S3
		// 5. Update the database record with variant keys

		log.Printf("Would generate variants for user=%s photo=%s", userID, photoID)
		for _, variant := range variants {
			outputKey := fmt.Sprintf("photos/%s/variants/%s_%s.webp", userID, photoID, variant)
			log.Printf("  -> %s", outputKey)
		}

		// Placeholder: update DB record
		_ = updatePhotoRecord(ctx, photoID, userID)
	}

	return nil
}

// parseObjectKey extracts userID and photoID from the S3 object key.
func parseObjectKey(key string) (userID, photoID string, err error) {
	// Expected: photos/{userID}/originals/{photoID}.{ext}
	parts := strings.Split(key, "/")
	if len(parts) != 4 || parts[0] != "photos" || parts[2] != "originals" {
		return "", "", fmt.Errorf("unexpected key format: %s", key)
	}

	userID = parts[1]
	filename := parts[3]
	photoID = strings.TrimSuffix(filename, path.Ext(filename))

	return userID, photoID, nil
}

// updatePhotoRecord is a placeholder for updating the DB after variant generation.
func updatePhotoRecord(ctx context.Context, photoID, userID string) error {
	// In production:
	// 1. Connect to PostgreSQL using HALO_DATABASE_URL
	// 2. UPDATE user_photos SET
	//      blur_heavy_key = 'photos/{userID}/variants/{photoID}_blur_heavy.webp',
	//      blur_med_key = 'photos/{userID}/variants/{photoID}_blur_med.webp',
	//      blur_light_key = 'photos/{userID}/variants/{photoID}_blur_light.webp',
	//      clear_key = 'photos/{userID}/variants/{photoID}_clear.webp',
	//      processing_status = 'ready'
	//    WHERE id = {photoID}
	_ = ctx
	log.Printf("TODO: Update photo record for photo=%s user=%s", photoID, userID)
	return nil
}

func main() {
	// In production, use:
	//   lambda.Start(Handler)
	//
	// For local testing:
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Printf("Secure Reveal Variant Generator (skeleton)")
	log.Printf("HALO_S3_BUCKET=%s", os.Getenv("HALO_S3_BUCKET"))
	log.Printf("HALO_DATABASE_URL is %s", func() string {
		if os.Getenv("HALO_DATABASE_URL") != "" {
			return "set"
		}
		return "not set"
	}())
}
