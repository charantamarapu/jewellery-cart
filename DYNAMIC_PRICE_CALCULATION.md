# Dynamic Price Calculation System

## Overview
Product prices are now calculated dynamically at the time of viewing based on jewelry inventory details. The price is no longer stored in the database, ensuring prices are always accurate based on current metal costs and specifications.

## Price Calculation Formula

```
metalValue = (purity / 100) * netWeight * metalPrice * hallmarkSurcharge
hallmarkSurcharge = hallmarked ? 1.05 : 1.0  // 5% surcharge for hallmarked items

wastageAmount = metalValue * (wastagePercent / 100)

totalMakingCharge = netWeight * makingChargePerGram

totalPrice = metalValue + wastageAmount + totalMakingCharge + extraValue
```

### Components:
1. **metalValue**: Base value of the metal used
   - Purity: Percentage scale (e.g., 91.6 for 22K gold = 91.6%)
   - netWeight: Weight of the metal in grams
   - metalPrice: Price per gram of the metal
   - Hallmark surcharge: 5% additional for hallmarked items

2. **wastageAmount**: Cost for metal lost during making
   - Calculated as a percentage of metal value
   - For Normal type: 4-15%
   - For Antique: No limit
   - For HyperArtistic: No limit

3. **totalMakingCharge**: Labor cost for crafting
   - Per gram cost multiplied by net weight

4. **extraValue**: Cost of stones, pearls, or other extras
   - Added as a flat amount

## Database Changes

### Products Table
- The `price` column is no longer required for storing calculated prices
- `price` can be NULL or ignored since it's calculated dynamically
- All other fields remain the same

### Jewelry_Inventory Table
- No changes to structure
- `totalPrice` column is still present but no longer updated automatically
- All calculation components are stored: purity, netWeight, metalPrice, wastagePercent, makingChargePerGram, extraValue

## API Endpoints

### GET /api/products
- Returns products with dynamically calculated prices
- Price filtering (minPrice, maxPrice) is applied on calculated prices
- Joins with jewelry_inventory to get calculation data

### GET /api/products/:id
- Returns single product with dynamically calculated price
- Includes all inventory details needed for calculation

### GET /api/products/seller/my-products
- Returns seller's products with dynamically calculated prices
- Admin sees all products, sellers see only their own

### GET /api/products/export/all
- Exports products with dynamically calculated prices
- Each product includes all inventory details for reimport

### POST /api/inventory/add
- No longer requires totalPrice or totalMakingCharge parameters
- These are calculated on-the-fly when fetching products

### PUT /api/inventory/:id
- No longer requires totalPrice or totalMakingCharge parameters
- Updates only the calculation components

## Benefits

1. **Accuracy**: Prices always reflect current inventory specifications
2. **Simplicity**: No need to manually update prices when inventory changes
3. **Consistency**: All product views show the same calculated price
4. **Real-time**: If metal prices or specifications change, prices update immediately
5. **Auditability**: Price calculation logic is centralized and visible

## Implementation Details

### Helper Function: calculatePriceFromInventory()
Located in `/backend/routes/products.js`

```javascript
const calculatePriceFromInventory = (inventory) => {
    if (!inventory) return 0;
    
    const purity = parseFloat(inventory.purity) || 0;
    const netWeight = parseFloat(inventory.netWeight) || 0;
    const metalPrice = parseFloat(inventory.metalPrice) || 0;
    const hallmarked = inventory.hallmarked ? 1 : 0;
    const wastagePercent = parseFloat(inventory.wastagePercent) || 0;
    const makingChargePerGram = parseFloat(inventory.makingChargePerGram) || 0;
    const extraValue = parseFloat(inventory.extraValue) || 0;

    const hallmarkSurcharge = hallmarked ? 1.05 : 1;
    const metalValue = (purity / 100) * netWeight * metalPrice * hallmarkSurcharge;
    const wastageAmount = metalValue * (wastagePercent / 100);
    const totalMakingCharge = netWeight * makingChargePerGram;
    const totalPrice = metalValue + wastageAmount + totalMakingCharge + extraValue;
    
    return Math.round(totalPrice * 100) / 100;
};
```

### Integration Points:
- **Product Fetch**: Applied when returning products from `/api/products`
- **Single Product**: Applied when returning single product from `/api/products/:id`
- **Seller Products**: Applied when returning seller's products
- **Export**: Applied when exporting products to Excel

## Migration Notes

1. **Existing Products**: 
   - Prices are not recalculated retroactively
   - Old `price` values in database are ignored
   - Products must have corresponding inventory records to show calculated prices
   - Products without inventory records will show price as 0

2. **Import/Export**:
   - Export includes calculated prices for reference
   - Import can accept price column but it's ignored
   - Only inventory details are used for creating/updating products

## Frontend Considerations

- Frontend displays are now safe with null checks: `(product.price || 0).toFixed(2)`
- Price calculations happen server-side, frontend only displays
- No changes needed to frontend logic, it just receives calculated prices

## Testing Checklist

- [ ] Create product with inventory details
- [ ] Verify price is calculated correctly
- [ ] Change inventory (purity, weight, metal price)
- [ ] Verify product price updates without manual intervention
- [ ] Test price filtering on product list
- [ ] Export products and verify prices match
- [ ] Import updated products and verify calculations
- [ ] Check products without inventory show 0 price (safe)
