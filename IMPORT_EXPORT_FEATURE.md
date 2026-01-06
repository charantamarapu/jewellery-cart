# Product Import/Export Feature Documentation

## Overview
The Product Import/Export feature allows sellers, admins, and super admins to easily manage their jewelry products using Excel files. Users can export their entire product list with all details and reimport updated information.

## Features

### 1. **Export Products**
- Export all products (for admins/super admins) or own products (for sellers) as an Excel file
- Includes all product and jewelry inventory details:
  - **Basic Info**: ID, Name, Description, Price, Stock
  - **Category**: Category ID and Name
  - **Jewelry Specifications**: 
    - Metal type, Metal price
    - Hallmarked status, Purity
    - Net weight, Gross weight
    - Extra weight, Extra description, Extra value
    - Type (Normal/Antique/HyperArtistic)
    - Ornament type, Custom ornament
    - Wastage percentage, Making charge per gram
    - Inventory total price
  - **Seller Info** (admin/super admin only): Seller email, Seller name
  - **Timestamps**: Created date, Updated date

### 2. **Import & Update Products**
- Upload an Excel file to bulk update existing products or create new ones
- Automatic validation of required fields
- Error reporting with detailed failure reasons
- Support for formats: `.xlsx`, `.xls`, `.csv`

### 3. **Access Control**
- **Sellers**: Can only export/import their own products
- **Admins**: Can export/import all products
- **Super Admins**: Full access to export/import all products

## How to Use

### For Sellers

#### Exporting Your Products:
1. Go to **Seller Dashboard**
2. Scroll down to the **Import/Export Products** section
3. Click the **📥 Export Products** button
4. A file named `products_export_YYYY-MM-DD.xlsx` will be downloaded

#### Updating Products via Import:
1. Open the exported Excel file in Excel, Google Sheets, or LibreOffice
2. Edit the following columns as needed:
   - `name` - Product name
   - `description` - Product description
   - `price` - Product price
   - `stock` - Available quantity
   - `metal` - Metal type (gold_22k, gold_18k, white_gold_18k, silver, platinum)
   - `metalPrice` - Price per gram of metal
   - `hallmarked` - Yes/No
   - `purity` - Purity value (0-999.99)
   - `netWeight` - Net weight in grams
   - `grossWeight` - Gross weight in grams
   - `extraDescription` - Description of stones/extras
   - `extraWeight` - Weight of extras
   - `extraValue` - Value of stones/extras
   - `type` - Normal/Antique/HyperArtistic
   - `ornament` - Type of ornament
   - `customOrnament` - Custom ornament name (if ornament='custom')
   - `wastagePercent` - Wastage percentage (4-15% for Normal type)
   - `makingChargePerGram` - Making charge in rupees per gram

3. Save the file
4. Return to Seller Dashboard
5. Click **📤 Import Products** button
6. Select your updated Excel file
7. View the import results showing:
   - Number of products updated
   - Number of products created (admin only)
   - Number of failed imports with error reasons

### For Admins

Same process as sellers, but you can:
- Export ALL products from the system (including those from other sellers)
- Create new products via import by providing the `sellerId` field
- Manage products from all sellers

### For Super Admins

Same as admins with full system-wide access.

## Excel File Format Example

| id | name | description | price | stock | metal | metalPrice | hallmarked | purity | netWeight | grossWeight | type | ornament | customOrnament | wastagePercent | makingChargePerGram |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Gold Ring | Beautiful gold ring | 25000 | 5 | gold_22k | 6500 | Yes | 916 | 8.5 | 9.2 | Normal | ring |  | 10 | 500 |
| 2 | Diamond Pendant | Pendant with diamonds | 45000 | 3 | gold_18k | 5900 | Yes | 750 | 15.0 | 18.5 | Normal | pendant |  | 12 | 600 |

## API Endpoints

### Export Endpoint
```
GET /api/products/export/all
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Product Name",
      "description": "...",
      "price": 25000,
      "stock": 5,
      "metal": "gold_22k",
      "metalPrice": 6500,
      "hallmarked": "Yes",
      "purity": "916",
      ...
    }
  ],
  "count": 10
}
```

### Import Endpoint
```
POST /api/products/import/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "products": [
    {
      "id": 1,
      "name": "Updated Name",
      "price": 26000,
      ...
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Import completed: 8 updated, 2 created, 0 failed",
  "results": {
    "updated": [
      { "id": 1, "name": "Product 1" },
      { "id": 2, "name": "Product 2" }
    ],
    "created": [
      { "id": 3, "name": "New Product" }
    ],
    "failed": []
  }
}
```

## Error Handling

The import process validates each product and reports errors individually:

**Common Errors:**
- `Missing required fields (id, name, price)` - Ensure all required fields are present
- `Product not found. Sellers cannot create new products via import.` - Sellers can only update existing products
- `Unauthorized: You can only update your own products` - You're trying to update another seller's product
- `Field must be numeric` - Price, weights, or numeric fields contain non-numeric values

## Limitations

1. **Sellers** can only:
   - Export their own products
   - Update their own products
   - Cannot create new products via import

2. **Admins & Super Admins** can:
   - Export all products
   - Update any product
   - Create new products via import (must provide valid product data)

3. **File Size**: Excel files should contain reasonable number of products (tested with 1000+ products)

4. **Required Fields for Update**:
   - `id` - Must exist in the system
   - `name` - Product name
   - `price` - Numeric value

5. **New Product Creation** (Admin only):
   - Must provide `id`, `name`, `price`
   - Optional: `categoryId`, `sellerId`, `imageUrl`, `stock`

## Best Practices

1. **Always keep backups** of your exported files
2. **Validate data** before importing (especially numeric fields)
3. **Test with small batches** before importing large files
4. **Check import results** to ensure all products were processed correctly
5. **Update only necessary fields** to avoid overwriting important data
6. **Use correct spellings** for metal types and ornament names

## Supported Metal Types
- `gold_22k` - 22K Gold
- `gold_18k` - 18K Gold
- `white_gold_18k` - 18K White Gold
- `silver` - Silver
- `platinum` - Platinum

## Supported Ornament Types
- `earring` - Earring
- `ring` - Finger Ring
- `necklace` - Necklace
- `bracelet` - Bracelet
- `anklet` - Anklet
- `pendant` - Pendant
- `chain` - Chain
- `bangle` - Bangle
- `custom` - Custom (specify in `customOrnament` field)

## Supported Product Types
- `Normal` - Standard product
- `Antique` - Antique jewelry
- `HyperArtistic` - Hyper artistic design

## Troubleshooting

### Import file doesn't upload
- Ensure file format is `.xlsx`, `.xls`, or `.csv`
- Check file size (shouldn't be unusually large)
- Clear browser cache and try again

### Products don't update
- Check if you own the products (sellers only)
- Verify product IDs exist in the system
- Ensure numeric fields contain valid numbers

### All products fail to import
- Verify file structure matches the exported format
- Check that required columns (id, name, price) are present
- Ensure no special characters in product IDs

### Performance issues with large files
- Split large imports into smaller batches
- Close unnecessary browser tabs
- Consider importing during off-peak hours
