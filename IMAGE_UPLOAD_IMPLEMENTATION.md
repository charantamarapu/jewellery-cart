# Image Upload Implementation Summary

## Overview
Implemented dual-mode image upload functionality allowing users to either provide a URL or upload a local file. Images uploaded as files are stored as binary data (BLOB) in the database.

## Backend Changes

### 1. Database Schema (`backend/db.js`)
- Modified `products` table to include:
  - `image BLOB` - stores binary image data
  - `imageType TEXT` - stores MIME type (e.g., 'image/jpeg')
  - `imageUrl TEXT` - stores URL if user provides one
- Added migrations for new columns

### 2. Upload Route (`backend/routes/upload.js`) - NEW FILE
- Created upload endpoint: `POST /api/upload/image`
- Uses `multer` middleware for file handling
- Validates file size (5MB max) and type (images only)
- Returns base64-encoded image data

### 3. Products Route (`backend/routes/products.js`)
- Updated `POST /api/products` to accept:
  - `image` (base64 string) - binary data
  - `imageType` (string) - MIME type
  - `imageUrl` (string) - URL
- Converts base64 to Buffer before storing in database
- Updated all GET endpoints to convert Buffer back to base64 for client
- Modified response handling to include both `image` and `imageUrl`

### 4. Server Configuration (`backend/server.js`)
- Added `uploadRoutes` import and registration
- Increased JSON limit to 10MB to handle base64 images

### 5. Dependencies
- Added `multer` package for file upload handling

## Frontend Changes

### 1. ProductForm Component (`frontend/src/components/ProductForm.jsx`)
- Added state fields:
  - `imageMode` - tracks 'url' or 'file' selection
  - `imageFile` - stores selected file object
  - `imagePreview` - stores preview data URL
- Added `handleImageFileChange()` function:
  - Validates file size (5MB max)
  - Validates file type (images only)
  - Generates preview using FileReader
- Updated `handleSubmit()`:
  - Uploads file to `/api/upload/image` if file mode
  - Receives base64 data from server
  - Includes `image`, `imageType`, and `imageUrl` in submit data
- Updated UI with tabbed interface:
  - URL tab with text input
  - Upload File tab with file picker
  - Image preview for both modes

### 2. ProductForm Styles (`frontend/src/components/ProductForm.css`)
- Added styles for:
  - `.image-upload-container` - main container
  - `.upload-tabs` - tab buttons container
  - `.tab-btn` - individual tab styling with active state
  - `.file-upload-area` - file drop zone
  - `.file-upload-label` - clickable upload area
  - `.image-preview` - preview container with responsive image

### 3. Image Utility (`frontend/src/utils/imageUtils.js`) - NEW FILE
- Created `getProductImageSrc()` helper function
- Handles three scenarios:
  1. Binary data: converts to data URL
  2. URL: returns as-is
  3. Fallback: placeholder image

## Usage

### Adding a Product with Image URL:
1. Select "URL" tab
2. Enter image URL
3. Preview appears automatically
4. Submit form

### Adding a Product with File Upload:
1. Select "Upload File" tab
2. Click to browse or drag & drop
3. File is validated (size, type)
4. Preview appears
5. On submit, file is uploaded to server
6. Server returns base64 data
7. Base64 is stored in database

## Data Flow

### URL Mode:
```
User enters URL → Stored in imageUrl field → Retrieved as-is
```

### File Mode:
```
User selects file → 
Uploaded to /api/upload/image → 
Server converts to base64 → 
Stored as BLOB in database → 
Retrieved and converted back to base64 → 
Frontend converts to data URL for display
```

## Benefits
1. **Flexibility**: Users can choose URL or file upload
2. **No External Dependencies**: Images stored in database
3. **Validation**: File size and type checked on both client and server
4. **Preview**: Immediate visual feedback
5. **Backward Compatible**: Existing URL-based images still work

## Technical Notes
- Maximum file size: 5MB
- Supported formats: All image/* MIME types
- Storage: Binary data in SQLite BLOB field
- Transfer: Base64 encoding for JSON compatibility
- Display: Data URLs generated on frontend
