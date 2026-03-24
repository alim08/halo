# Secure Reveal Variant Generator (Lambda)

## Overview

This Lambda function generates blur variants of user profile photos for the Secure Reveal feature. It is triggered by S3 `PutObject` events when a user uploads an original photo via the `POST /v1/me/photos/upload-url` endpoint.

## S3 Object Key Conventions

### Input (Originals)
```
photos/{userID}/originals/{photoID}.{ext}
```
- `ext` is one of: `jpg`, `png`, `webp`
- The `photoID` matches the `user_photos.id` UUID in PostgreSQL

### Output (Variants)
```
photos/{userID}/variants/{photoID}_blur_heavy.webp
photos/{userID}/variants/{photoID}_blur_med.webp
photos/{userID}/variants/{photoID}_blur_light.webp
photos/{userID}/variants/{photoID}_clear.webp
```
- All variants are output as WebP for consistent quality/size
- The `clear` variant is a resized/optimized copy (no blur), not a raw copy

## Blur Levels

| Variant      | Connection Level | Blur Radius | Description              |
|:-------------|:----------------:|:-----------:|:-------------------------|
| blur_heavy   | 1                | ~30px       | Very blurry; silhouette  |
| blur_med     | 2                | ~15px       | Recognizable shape       |
| blur_light   | 3–4              | ~5px        | Mostly clear, soft edges |
| clear        | 5                | 0px         | Full clarity             |

## S3 Event Wiring

### Trigger Configuration
- **Event type**: `s3:ObjectCreated:Put`
- **Prefix filter**: `photos/` 
- **Suffix filter**: (none — all extensions handled)

### Required S3 Bucket Notification Configuration
```json
{
  "LambdaFunctionConfigurations": [
    {
      "Events": ["s3:ObjectCreated:Put"],
      "Filter": {
        "Key": {
          "FilterRules": [
            { "Name": "prefix", "Value": "photos/" },
            { "Name": "suffix", "Value": "" }
          ]
        }
      },
      "LambdaFunctionArn": "arn:aws:lambda:{region}:{account}:function:halo-secure-reveal-generator"
    }
  ]
}
```

### Lambda Permissions
The Lambda execution role needs:
- `s3:GetObject` on the source bucket (originals)
- `s3:PutObject` on the source bucket (variants)
- VPC access or public internet to reach the PostgreSQL database (for updating `processing_status`)

## Environment Variables

| Variable            | Required | Description                        |
|:--------------------|:--------:|:-----------------------------------|
| `HALO_DATABASE_URL` | Yes      | PostgreSQL connection string       |
| `HALO_S3_BUCKET`    | Yes      | S3 bucket name                     |
| `AWS_REGION`        | Yes      | AWS region (set by Lambda runtime) |

## Post-Processing

After generating all 4 variants, the Lambda:
1. Uploads each variant to S3 at the output key
2. Updates `user_photos` in PostgreSQL:
   ```sql
   UPDATE user_photos SET
     blur_heavy_key = 'photos/{userID}/variants/{photoID}_blur_heavy.webp',
     blur_med_key   = 'photos/{userID}/variants/{photoID}_blur_med.webp',
     blur_light_key = 'photos/{userID}/variants/{photoID}_blur_light.webp',
     clear_key      = 'photos/{userID}/variants/{photoID}_clear.webp',
     processing_status = 'ready',
     updated_at = NOW()
   WHERE id = '{photoID}';
   ```
3. If any step fails, sets `processing_status = 'failed'`

## Error Handling

- If the original image is corrupt or unsupported → mark as `failed`
- If S3 upload of a variant fails → retry up to 3 times, then mark as `failed`
- If DB update fails → log error (variants exist in S3; status can be recovered)

## Local Development

For local testing without AWS:
```bash
go run ./infra/lambda/secure-reveal/main.go
```

This prints configuration status but does not process any images. Use integration tests with LocalStack for full end-to-end testing.

## Building for Lambda

```bash
cd infra/lambda/secure-reveal
GOOS=linux GOARCH=amd64 go build -o bootstrap main.go
zip function.zip bootstrap
```
