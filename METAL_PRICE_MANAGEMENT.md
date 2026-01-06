# Metal Price Management Feature

## Overview
Superadmins can now manage metal prices (Gold, Silver, Platinum) directly from the Super Admin Portal. These prices are used in dynamic price calculations for all jewelry products.

## Features

### 1. Database Storage
- Metal prices are now stored in a dedicated `metal_prices` table
- Each metal has: name, price per gram, last updated timestamp, and who updated it
- Default prices are seeded on first run:
  - Gold: ₹14,043/gram
  - Silver: ₹250/gram
  - Platinum: ₹6,340/gram

### 2. Backend API Endpoints

#### Get Metal Prices (Superadmin Only)
```
GET /api/admin/metal-prices
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "prices": [
    {
      "id": 1,
      "metal": "gold",
      "pricePerGram": 14043,
      "updatedAt": "2026-01-06T11:23:00Z",
      "updatedBy": 1
    },
    ...
  ]
}
```

#### Update Metal Price (Superadmin Only)
```
PUT /api/admin/metal-prices/:metal
Authorization: Bearer <token>
Content-Type: application/json

{
  "pricePerGram": 15000
}
```

Response:
```json
{
  "success": true,
  "message": "Metal price updated successfully",
  "price": {
    "id": 1,
    "metal": "gold",
    "pricePerGram": 15000,
    "updatedAt": "2026-01-06T11:25:00Z",
    "updatedBy": 1
  }
}
```

#### Get Current Prices (Public)
```
GET /api/inventory/metals/prices
```

Response:
```json
{
  "success": true,
  "prices": {
    "gold": 14043,
    "silver": 250,
    "platinum": 6340
  }
}
```

### 3. Super Admin Portal UI

The Metal Prices section appears in the Super Admin Portal with:
- **View**: Display current prices for all metals
- **Edit**: Inline editing with validation
- **Save/Cancel**: Confirm or discard changes
- **Last Updated**: Shows when each price was last modified
- **Real-time Updates**: Changes reflect immediately in the UI

#### How to Update Prices:
1. Log in as Super Admin
2. Navigate to Super Admin Portal
3. Find the "Metal Prices (per gram)" section
4. Click "Edit" next to the metal you want to update
5. Enter the new price
6. Click "✓ Save" to confirm or "✗ Cancel" to discard

### 4. Audit Logging
All price changes are logged in the `audit_logs` table with:
- Admin ID who made the change
- Action: `UPDATE_METAL_PRICE`
- Details: Previous and new price values
- Timestamp

### 5. Impact on Product Pricing

When a metal price is updated:
- All products using that metal will automatically reflect the new price
- Price calculations are done dynamically using the formula:
  ```
  metalValue = (purity / 100) * netWeight * metalPrice * hallmarkSurcharge
  totalPrice = metalValue + wastageAmount + makingCharge + extraValue
  ```
- No need to manually update individual products

## Database Schema

### metal_prices Table
```sql
CREATE TABLE metal_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metal TEXT UNIQUE NOT NULL,
    pricePerGram REAL NOT NULL,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedBy INTEGER,
    FOREIGN KEY (updatedBy) REFERENCES users(id)
);
```

## Security
- Only users with `superadmin` role can view and update metal prices
- All changes are authenticated and logged
- Invalid prices (≤ 0) are rejected
- Metal names are validated against existing records

## Files Modified

### Backend
1. `backend/db.js` - Added metal_prices table and seeding
2. `backend/routes/admin.js` - Added GET and PUT endpoints
3. `backend/routes/inventory.js` - Updated to fetch from database

### Frontend
1. `frontend/src/pages/SuperAdminPortal.jsx` - Added UI and logic
2. `frontend/src/pages/SuperAdminPortal.css` - Styles (if needed)

## Testing

To test the feature:
1. Log in as superadmin (admin@abc.com / Admin@2026)
2. Navigate to `/superadmin`
3. Scroll to "Metal Prices (per gram)" section
4. Try updating a price
5. Verify the change is saved
6. Check that product prices reflect the new metal price

## Future Enhancements
- Add more metals (e.g., Rose Gold, White Gold)
- Import prices from external APIs
- Price history tracking
- Scheduled price updates
- Bulk price updates
- Price change notifications to sellers
