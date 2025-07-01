# Google Drive Uploader Action

[![GitHub Super-Linter](https://github.com/actions/typescript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/typescript-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

A GitHub Action to upload files or folders to Google Drive.

## Features

- Upload single files or entire folders to Google Drive
- Preserve folder structure when uploading directories
- Optional file overwriting
- Custom naming for uploaded files/folders
- Service account authentication
- Outputs file/folder IDs for further processing

## Prerequisites

1. A Google Cloud Project with the Google Drive API enabled
2. A Service Account with appropriate permissions
3. The Service Account key in JSON format

### Setting up Google Cloud

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click on it and press "Enable"
4. Create a Service Account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in the service account details
   - Grant the service account appropriate roles (e.g., "Editor")
5. Create a key for the Service Account:
   - Click on the created service account
   - Go to the "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose JSON format
   - Download the key file
6. Share your Google Drive folder with the service account:
   - Open Google Drive
   - Right-click on the folder where you want to upload files
   - Click "Share"
   - Add the service account email (found in the JSON key file)
   - Grant "Editor" permissions

## Usage

### Basic Example

```yaml
name: Upload to Google Drive

on:
  push:
    branches: [main]

jobs:
  upload:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Upload file to Google Drive
        uses: your-username/google-drive-uploader-action@v1
        with:
          credentials: ${{ secrets.GOOGLE_DRIVE_CREDENTIALS }}
          parent-folder-id: ${{ secrets.GOOGLE_DRIVE_FOLDER_ID }}
          path: ./report.pdf
```

### Upload a Folder

```yaml
- name: Upload folder to Google Drive
  uses: your-username/google-drive-uploader-action@v1
  with:
    credentials: ${{ secrets.GOOGLE_DRIVE_CREDENTIALS }}
    parent-folder-id: ${{ secrets.GOOGLE_DRIVE_FOLDER_ID }}
    path: ./dist
    name: production-build
```

### With Overwrite

```yaml
- name: Upload and overwrite existing file
  uses: your-username/google-drive-uploader-action@v1
  with:
    credentials: ${{ secrets.GOOGLE_DRIVE_CREDENTIALS }}
    parent-folder-id: ${{ secrets.GOOGLE_DRIVE_FOLDER_ID }}
    path: ./backup.zip
    overwrite: 'true'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `credentials` | Base64 encoded Google Service Account credentials JSON | Yes | - |
| `parent-folder-id` | Google Drive folder ID where files will be uploaded | Yes | - |
| `path` | Path to file or folder to upload | Yes | - |
| `name` | Optional name for the uploaded file/folder | No | Original name |
| `overwrite` | Whether to overwrite existing files with the same name | No | `false` |

## Outputs

| Output | Description |
|--------|-------------|
| `file-id` | Google Drive file ID of the uploaded file (for single file uploads) |
| `folder-id` | Google Drive folder ID of the uploaded folder (for folder uploads) |
| `uploaded-files` | JSON array of uploaded files with their IDs and paths |

## Setting up Secrets

1. Encode your Service Account JSON key to base64:
   ```bash
   base64 -i path/to/your-service-account-key.json
   ```
   
2. Add the following secrets to your repository:
   - `GOOGLE_DRIVE_CREDENTIALS`: The base64 encoded service account key
   - `GOOGLE_DRIVE_FOLDER_ID`: The ID of your Google Drive folder
   
   To get the folder ID:
   - Open the folder in Google Drive
   - The URL will look like: `https://drive.google.com/drive/folders/YOUR_FOLDER_ID`
   - Copy the `YOUR_FOLDER_ID` part

## Advanced Usage

### Processing Upload Results

```yaml
- name: Upload files
  id: upload
  uses: your-username/google-drive-uploader-action@v1
  with:
    credentials: ${{ secrets.GOOGLE_DRIVE_CREDENTIALS }}
    parent-folder-id: ${{ secrets.GOOGLE_DRIVE_FOLDER_ID }}
    path: ./output
    
- name: Process results
  run: |
    echo "Uploaded files:"
    echo '${{ steps.upload.outputs.uploaded-files }}' | jq '.'
```

### Conditional Upload

```yaml
- name: Build project
  run: npm run build
  
- name: Upload build artifacts if successful
  if: success()
  uses: your-username/google-drive-uploader-action@v1
  with:
    credentials: ${{ secrets.GOOGLE_DRIVE_CREDENTIALS }}
    parent-folder-id: ${{ secrets.GOOGLE_DRIVE_FOLDER_ID }}
    path: ./dist
    name: build-${{ github.sha }}
```

## Development

### Initial Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the action
npm run bundle
```

### Testing Locally

You can test the action locally using the `@github/local-action` utility:

```bash
npx @github/local-action . src/main.ts .env
```

Create a `.env` file with your test inputs:

```env
INPUT_CREDENTIALS=your-base64-encoded-credentials
INPUT_PARENT-FOLDER-ID=your-folder-id
INPUT_PATH=./test-file.txt
INPUT_NAME=test-upload.txt
INPUT_OVERWRITE=false
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.