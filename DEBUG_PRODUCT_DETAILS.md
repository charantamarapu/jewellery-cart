# Debugging Product Details Vanishing Issue

## Quick Verification Checklist

### 1. Check Backend Logs on Startup
Look for this message after restarting the backend:
```
📊 Data verification: X products, Y inventory items found in database
```

- **If X > 0 and Y > 0**: ✅ Data is persisting correctly
- **If X > 0 but Y = 0**: ⚠️ Products exist but inventory details are missing
- **If X = 0**: ❌ Products table is empty (data loss occurred)

### 2. Verify Database File
The database is stored at: `backend/database.db`

To check if data exists:
```powershell
# Check file exists and has size > 0
ls D:\jewellery-cart\backend\database.db | Format-List
```

The file should be several MB in size if it contains data.

### 3. Test the Complete Flow

**Step 1: Create a Test Product**
1. Login as admin or seller
2. Go to Admin Dashboard / Seller Dashboard
3. Create a new product with complete inventory details:
   - Product name: "Test Product"
   - Add metal specifications (gold, weight, etc.)
   - Save the product

**Step 2: Verify Immediate Display**
1. Go to product list
2. Click on the product
3. Verify you see the inventory details (metal type, weight, price)

**Step 3: Restart Backend**
1. Stop backend: `Ctrl+C`
2. Wait for database to close properly
3. Restart: `npm run dev` in backend folder
4. Check console for the data verification message

**Step 4: Verify After Restart**
1. Refresh the product page
2. Verify inventory details are still visible
3. Check if the calculated price matches what it was before restart

### 4. Database Query Commands
If you need to manually check the database (requires sqlite3 CLI):

```bash
# Check product count
sqlite3 database.db "SELECT COUNT(*) FROM products;"

# Check inventory count
sqlite3 database.db "SELECT COUNT(*) FROM jewelry_inventory;"

# List products with inventory
sqlite3 database.db "SELECT p.id, p.name, i.metal, i.netWeight FROM products p LEFT JOIN jewelry_inventory i ON p.id = i.productId LIMIT 5;"
```

## Common Issues and Solutions

### Issue: Inventory shows NULL after restart

**Cause**: `productId` in inventory table is NULL

**Solution**: 
1. Verify the ADD INVENTORY request includes `productId`
2. Check that product is created BEFORE inventory is added
3. Look at AdminDashboard.jsx around line 127 - ensure productId is passed

```javascript
// This should include productId:
{
    productId: result.productId,  // ← Make sure this is included
    metal: productData.metal,
    // ... other fields
}
```

### Issue: Products exist but details don't load

**Cause**: Inventory endpoint query might be failing

**Solution**:
1. Check browser DevTools → Network tab
2. Look for `/api/inventory/product/{id}` requests
3. Verify response is `{success: true, item: {...}}` or `{success: true, item: null}`
4. If null, check that `jewelry_inventory.productId` matches the product ID

### Issue: Console shows "Dynamic pricing migration warning"

**Cause**: Some data inconsistency during migration

**Solution**:
1. This is now less critical due to the validation we added
2. Check the backend logs for more details
3. If data is still visible, the migration succeeded
4. If data is missing, you may need to restore from backup

## Monitoring After the Fix

The system now provides better logging. Watch for:

✅ **Good signs**:
- `📊 Data verification: X products, Y inventory items found in database`
- No warnings during migration startup
- Product details visible after restart

⚠️ **Warning signs**:
- `Data verification: 0 products` (data loss)
- Migration errors that mention `no such column`
- Inventory items have NULL `productId`

## Data Recovery

If data was lost before this fix was applied:

1. **From backup**: Restore your `database.db` from backup (if available)
2. **From JSON**: If you have a `db.json` file with old data, it will be migrated on next startup
3. **Manual re-entry**: Add the products and inventory again

The migration system can't recover already-lost data, but it will now prevent future losses.

## Testing the Migration Safety

To test that migrations are now safe:

1. Create 10 test products with inventory details
2. Stop backend
3. Restart backend multiple times
4. Verify all products and inventory persist each time

---

**Last Updated**: After product details persistence fix
**Status**: ✅ Enhanced validation and error handling active
