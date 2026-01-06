import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import './ProductImportExport.css';

const ProductImportExport = ({ onImportSuccess }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importMessage, setImportMessage] = useState({ type: '', text: '' });

    const handleExportProducts = async () => {
        setIsExporting(true);
        try {
            const response = await fetch('/api/products/export/all', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to export products');
            }

            const data = await response.json();
            if (!data.success || !data.data) {
                throw new Error('Invalid export data');
            }

            // Create workbook from products data
            const ws = XLSX.utils.json_to_sheet(data.data);
            
            // Set column widths for better readability
            const columnWidths = {
                'A': 8,   // id
                'B': 25,  // name
                'C': 30,  // description
                'D': 10,  // price
                'E': 8,   // stock
                'F': 12,  // categoryId
                'G': 18,  // categoryName
                'H': 12,  // metal
                'I': 12,  // metalPrice
                'J': 12,  // hallmarked
                'K': 10,  // purity
                'L': 12,  // netWeight
                'M': 20,  // extraDescription
                'N': 12,  // extraWeight
                'O': 12,  // extraValue
                'P': 12,  // grossWeight
                'Q': 12,  // type
                'R': 15,  // ornament
                'S': 18,  // customOrnament
                'T': 16,  // wastagePercent
                'U': 20,  // makingChargePerGram
                'V': 18,  // inventoryTotalPrice
                'W': 18,  // sellerEmail
                'X': 15   // sellerName
            };
            
            ws['!cols'] = Object.values(columnWidths).map(width => ({ wch: width }));

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Products');

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `products_export_${timestamp}.xlsx`;

            // Write the file
            XLSX.writeFile(wb, filename);

            setImportMessage({
                type: 'success',
                text: `Successfully exported ${data.count} products!`
            });
        } catch (err) {
            console.error('Export error:', err);
            setImportMessage({
                type: 'error',
                text: `Export failed: ${err.message}`
            });
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportProducts = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setImportMessage({ type: '', text: '' });

        try {
            // Read the Excel file
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const products = XLSX.utils.sheet_to_json(sheet);

                    if (products.length === 0) {
                        setImportMessage({
                            type: 'error',
                            text: 'No products found in the Excel file'
                        });
                        setIsImporting(false);
                        return;
                    }

                    // Send to backend
                    const response = await fetch('/api/products/import/update', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({ products })
                    });

                    const result = await response.json();

                    if (!response.ok || !result.success) {
                        throw new Error(result.message || 'Import failed');
                    }

                    setImportMessage({
                        type: 'success',
                        text: result.message
                    });

                    // Call success callback
                    if (onImportSuccess) {
                        onImportSuccess();
                    }

                    // Clear the file input
                    event.target.value = '';
                } catch (err) {
                    console.error('Import processing error:', err);
                    setImportMessage({
                        type: 'error',
                        text: `Import failed: ${err.message}`
                    });
                }
                setIsImporting(false);
            };

            reader.readAsBinaryString(file);
        } catch (err) {
            console.error('File read error:', err);
            setImportMessage({
                type: 'error',
                text: `File reading failed: ${err.message}`
            });
            setIsImporting(false);
        }
    };

    return (
        <div className="product-import-export">
            <div className="import-export-container">
                <h3>Import/Export Products</h3>
                
                <div className="import-export-buttons">
                    <button
                        className="btn btn-export"
                        onClick={handleExportProducts}
                        disabled={isExporting}
                        title="Export all your products as Excel file"
                    >
                        {isExporting ? 'Exporting...' : '📥 Export Products'}
                    </button>

                    <label className="btn btn-import" title="Import products from Excel file">
                        {isImporting ? 'Importing...' : '📤 Import Products'}
                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleImportProducts}
                            disabled={isImporting}
                            style={{ display: 'none' }}
                        />
                    </label>
                </div>

                {importMessage.text && (
                    <div className={`import-message ${importMessage.type}`}>
                        {importMessage.text}
                        {importMessage.type === 'success' && ' ✓'}
                        {importMessage.type === 'error' && ' ✗'}
                    </div>
                )}

                <div className="import-export-info">
                    <h4>Instructions:</h4>
                    <ul>
                        <li><strong>Export:</strong> Click "Export Products" to download all your products as an Excel file</li>
                        <li><strong>Update:</strong> Edit the Excel file with new prices, stock, descriptions, etc.</li>
                        <li><strong>Import:</strong> Click "Import Products" and select the updated Excel file to apply changes</li>
                        <li><strong>Supported formats:</strong> .xlsx, .xls, .csv</li>
                        <li><strong>Note:</strong> Sellers can only modify their own products. Admins can manage all products.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ProductImportExport;
