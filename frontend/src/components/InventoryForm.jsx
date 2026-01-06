import React, { useState, useEffect } from 'react';
import './InventoryForm.css';

// Convert Google Drive share link to direct image URL
const convertGoogleDriveUrl = (url) => {
    if (!url) return url;
    
    // If it's already a direct Google Drive view URL, return as-is
    if (url.includes('drive.google.com/uc?export=view')) {
        return url;
    }
    
    // Match various Google Drive share link patterns
    // Pattern 1: /d/FILE_ID/
    const match1 = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match1 && match1[1]) {
        return `https://drive.google.com/uc?export=view&id=${match1[1]}`;
    }
    
    // Pattern 2: id=FILE_ID in query string
    const match2 = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (match2 && match2[1]) {
        return `https://drive.google.com/uc?export=view&id=${match2[1]}`;
    }
    
    // If no Google Drive pattern found, return original URL
    return url;
};

const InventoryForm = ({ onSubmit, initialData = null, isLoading = false }) => {
    const [metalPrices, setMetalPrices] = useState({});
    const [imageLoadError, setImageLoadError] = useState(false);
    const [formData, setFormData] = useState({
        metal: '',
        metalPrice: 0,
        hallmarked: false,
        purity: '',
        netWeight: '',
        extraDescription: '',
        extraWeight: '',
        extraValue: '',
        grossWeight: '',
        type: 'Normal',
        ornament: '',
        customOrnament: '',
        wastagePercent: 10,
        makingChargePerGram: '',
        length: '',
        width: '',
        height: '',
        dimensionUnit: 'cm'
    });

    const [calculations, setCalculations] = useState({
        metalValue: 0,
        wastageAmount: 0,
        totalMakingCharge: 0,
        totalPrice: 0
    });

    const [errors, setErrors] = useState({});

    const METAL_OPTIONS = [
        { value: 'gold_22k', label: '22K Gold', pricePerGram: 6500 },
        { value: 'gold_18k', label: '18K Gold', pricePerGram: 5900 },
        { value: 'white_gold_18k', label: '18K White Gold', pricePerGram: 6200 },
        { value: 'silver', label: 'Silver', pricePerGram: 820 },
        { value: 'platinum', label: 'Platinum', pricePerGram: 32000 }
    ];

    const STANDARD_PURITIES = [
        { label: '999', value: 999 },
        { label: '995', value: 995 },
        { label: '958', value: 958 },
        { label: '950', value: 950 },
        { label: '925', value: 925 }
    ];

    const ORNAMENT_OPTIONS = [
        { value: 'earring', label: 'Earring' },
        { value: 'ring', label: 'Finger Ring' },
        { value: 'necklace', label: 'Necklace' },
        { value: 'bracelet', label: 'Bracelet' },
        { value: 'anklet', label: 'Anklet' },
        { value: 'pendant', label: 'Pendant' },
        { value: 'chain', label: 'Chain' },
        { value: 'bangle', label: 'Bangle' },
        { value: 'custom', label: 'Custom' }
    ];

    // Fetch metal prices on mount
    useEffect(() => {
        fetchMetalPrices();
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    // Recalculate whenever relevant fields change
    useEffect(() => {
        calculateTotalPrice();
    }, [
        formData.metal,
        formData.metalPrice,
        formData.hallmarked,
        formData.purity,
        formData.netWeight,
        formData.extraValue,
        formData.wastagePercent,
        formData.makingChargePerGram
    ]);

    const fetchMetalPrices = async () => {
        try {
            const response = await fetch('/api/inventory/metals/prices');
            const data = await response.json();
            if (data.success) {
                setMetalPrices(data.prices);
            }
        } catch (err) {
            console.error('Error fetching metal prices:', err);
        }
    };

    const handleMetalChange = (e) => {
        const selectedMetal = e.target.value;
        const metalOption = METAL_OPTIONS.find(opt => opt.value === selectedMetal);
        
        setFormData(prev => ({
            ...prev,
            metal: selectedMetal,
            metalPrice: metalOption?.pricePerGram || 0
        }));
    };

    const handleChange = (e) => {
        const { name, value, type: inputType } = e.target;

        if (inputType === 'checkbox') {
            setFormData(prev => ({
                ...prev,
                [name]: e.target.checked
            }));
        } else if (name === 'purity') {
            // Allow only numbers with up to 2 decimal places
            if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
                setFormData(prev => ({
                    ...prev,
                    [name]: value
                }));
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }

        // Clear error for this field if it exists
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const calculateTotalPrice = async () => {
        try {
            const purity = formData.purity ? parseFloat(formData.purity) : 0;
            const netWeight = formData.netWeight ? parseFloat(formData.netWeight) : 0;
            const extraValue = formData.extraValue ? parseFloat(formData.extraValue) : 0;
            const wastagePercent = formData.wastagePercent ? parseFloat(formData.wastagePercent) : 0;
            const makingChargePerGram = formData.makingChargePerGram ? parseFloat(formData.makingChargePerGram) : 0;
            const metalPrice = formData.metalPrice ? parseFloat(formData.metalPrice) : 0;

            if (!purity || !netWeight || !wastagePercent || !makingChargePerGram || !metalPrice) {
                setCalculations({
                    metalValue: 0,
                    wastageAmount: 0,
                    totalMakingCharge: 0,
                    totalPrice: 0
                });
                return;
            }

            const response = await fetch('/api/inventory/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    metalPrice,
                    hallmarked: formData.hallmarked,
                    purity,
                    netWeight,
                    extraValue,
                    wastagePercent,
                    makingChargePerGram
                })
            });

            const data = await response.json();
            if (data.success) {
                setCalculations({
                    metalValue: data.metalValue,
                    wastageAmount: data.wastageAmount,
                    totalMakingCharge: data.totalMakingCharge,
                    totalPrice: data.totalPrice
                });
            }
        } catch (err) {
            console.error('Error calculating price:', err);
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.metal) newErrors.metal = 'Metal is required';
        if (!formData.netWeight) newErrors.netWeight = 'Net weight is required';
        if (formData.netWeight && isNaN(parseFloat(formData.netWeight))) newErrors.netWeight = 'Net weight must be a number';
        
        if (!formData.hallmarked && !formData.purity) {
            newErrors.purity = 'Purity is required if not hallmarked';
        }
        if (formData.hallmarked && !formData.purity) {
            newErrors.purity = 'Please select a standard purity';
        }
        
        if (!formData.grossWeight) newErrors.grossWeight = 'Gross weight is required';
        if (formData.grossWeight && isNaN(parseFloat(formData.grossWeight))) newErrors.grossWeight = 'Gross weight must be a number';
        
        if (!formData.type) newErrors.type = 'Type is required';
        if (!formData.ornament) newErrors.ornament = 'Ornament is required';
        if (formData.ornament === 'custom' && !formData.customOrnament) newErrors.customOrnament = 'Please specify custom ornament';
        
        if (!formData.wastagePercent) newErrors.wastagePercent = 'Wastage percent is required';
        if (formData.type === 'Normal' && (formData.wastagePercent < 4 || formData.wastagePercent > 15)) {
            newErrors.wastagePercent = 'Wastage percent must be between 4-15% for Normal type';
        }
        
        if (!formData.makingChargePerGram) newErrors.makingChargePerGram = 'Making charge per gram is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const submitData = {
            ...formData,
            metalPrice: parseFloat(formData.metalPrice),
            purity: parseFloat(formData.purity),
            netWeight: parseFloat(formData.netWeight),
            extraWeight: formData.extraWeight ? parseFloat(formData.extraWeight) : 0,
            extraValue: formData.extraValue ? parseFloat(formData.extraValue) : 0,
            grossWeight: parseFloat(formData.grossWeight),
            wastagePercent: parseFloat(formData.wastagePercent),
            makingChargePerGram: parseFloat(formData.makingChargePerGram),
            totalMakingCharge: calculations.totalMakingCharge,
            totalPrice: calculations.totalPrice
        };

        onSubmit(submitData);
    };

    return (
        <form onSubmit={handleSubmit} className="inventory-form">
            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="metal">
                        1. Select Metal <span className="required">*</span>
                    </label>
                    <select
                        id="metal"
                        name="metal"
                        value={formData.metal}
                        onChange={handleMetalChange}
                        className={errors.metal ? 'error' : ''}
                    >
                        <option value="">Select a metal</option>
                        {METAL_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label} (₹{opt.pricePerGram}/gram)
                            </option>
                        ))}
                    </select>
                    {errors.metal && <span className="error-message">{errors.metal}</span>}
                    {formData.metalPrice > 0 && (
                        <p className="metal-price-display">Live Price: ₹{formData.metalPrice}/gram</p>
                    )}
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="hallmarked">
                        2. Hallmarked <span className="required">*</span>
                    </label>
                    <div className="slider-container">
                        <input
                            type="checkbox"
                            id="hallmarked"
                            name="hallmarked"
                            checked={formData.hallmarked}
                            onChange={handleChange}
                            className="slider-input"
                        />
                        <label htmlFor="hallmarked" className="slider">
                        </label>
                        <span className="slider-label">{formData.hallmarked ? 'Yes' : 'No'}</span>
                    </div>
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="purity">
                        3. Purity <span className="required">*</span>
                    </label>
                    {formData.hallmarked ? (
                        <>
                            <select
                                id="purity"
                                name="purity"
                                value={formData.purity}
                                onChange={handleChange}
                                className={errors.purity ? 'error' : ''}
                            >
                                <option value="">Select standard purity</option>
                                {STANDARD_PURITIES.map(p => (
                                    <option key={p.value} value={p.value}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                        </>
                    ) : (
                        <input
                            type="number"
                            id="purity"
                            name="purity"
                            value={formData.purity}
                            onChange={handleChange}
                            placeholder="Manual purity (0-999.99)"
                            step="0.01"
                            min="0"
                            max="999.99"
                            className={errors.purity ? 'error' : ''}
                        />
                    )}
                    {errors.purity && <span className="error-message">{errors.purity}</span>}
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="netWeight">
                        4. Net Weight (grams) <span className="required">*</span>
                    </label>
                    <input
                        type="number"
                        id="netWeight"
                        name="netWeight"
                        value={formData.netWeight}
                        onChange={handleChange}
                        placeholder="Enter net weight"
                        step="0.01"
                        min="0"
                        className={errors.netWeight ? 'error' : ''}
                    />
                    {errors.netWeight && <span className="error-message">{errors.netWeight}</span>}
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="extraDescription">
                        5. Extra (Description)
                    </label>
                    <input
                        type="text"
                        id="extraDescription"
                        name="extraDescription"
                        value={formData.extraDescription}
                        onChange={handleChange}
                        placeholder="e.g., 2 Diamonds, 5 Pearls, etc."
                    />
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="extraWeight">
                        Weight of Extra (grams)
                    </label>
                    <input
                        type="number"
                        id="extraWeight"
                        name="extraWeight"
                        value={formData.extraWeight}
                        onChange={handleChange}
                        placeholder="Enter extra weight"
                        step="0.01"
                        min="0"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="extraValue">
                        6. Value of Extra (₹)
                    </label>
                    <input
                        type="number"
                        id="extraValue"
                        name="extraValue"
                        value={formData.extraValue}
                        onChange={handleChange}
                        placeholder="Enter value of stones/pearls"
                        step="0.01"
                        min="0"
                    />
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="grossWeight">
                        7. Gross Weight (grams) <span className="required">*</span>
                    </label>
                    <input
                        type="number"
                        id="grossWeight"
                        name="grossWeight"
                        value={formData.grossWeight}
                        onChange={handleChange}
                        placeholder="Enter gross weight"
                        step="0.01"
                        min="0"
                        className={errors.grossWeight ? 'error' : ''}
                    />
                    {errors.grossWeight && <span className="error-message">{errors.grossWeight}</span>}
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="type">
                        8. Type <span className="required">*</span>
                    </label>
                    <select
                        id="type"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className={errors.type ? 'error' : ''}
                    >
                        <option value="Normal">Normal</option>
                        <option value="Antique">Antique</option>
                        <option value="HyperArtistic">Hyper Artistic</option>
                    </select>
                    {errors.type && <span className="error-message">{errors.type}</span>}
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="ornament">
                        9. Ornament <span className="required">*</span>
                    </label>
                    <select
                        id="ornament"
                        name="ornament"
                        value={formData.ornament}
                        onChange={handleChange}
                        className={errors.ornament ? 'error' : ''}
                    >
                        <option value="">Select ornament type</option>
                        {ORNAMENT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    {errors.ornament && <span className="error-message">{errors.ornament}</span>}
                </div>

                {formData.ornament === 'custom' && (
                    <div className="form-group">
                        <label htmlFor="customOrnament">
                            Custom Ornament Type <span className="required">*</span>
                        </label>
                        <input
                            type="text"
                            id="customOrnament"
                            name="customOrnament"
                            value={formData.customOrnament}
                            onChange={handleChange}
                            placeholder="Specify ornament"
                            className={errors.customOrnament ? 'error' : ''}
                        />
                        {errors.customOrnament && <span className="error-message">{errors.customOrnament}</span>}
                    </div>
                )}
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="wastagePercent">
                        10. Wastage Percent (%) <span className="required">*</span>
                        {formData.type === 'Normal' && <span className="range-hint">(4-15%)</span>}
                    </label>
                    <input
                        type="number"
                        id="wastagePercent"
                        name="wastagePercent"
                        value={formData.wastagePercent}
                        onChange={handleChange}
                        placeholder="Enter wastage percent"
                        step="0.1"
                        min="0"
                        max="100"
                        className={errors.wastagePercent ? 'error' : ''}
                    />
                    {errors.wastagePercent && <span className="error-message">{errors.wastagePercent}</span>}
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="makingChargePerGram">
                        11. Making Charges per Gram (₹) <span className="required">*</span>
                    </label>
                    <input
                        type="number"
                        id="makingChargePerGram"
                        name="makingChargePerGram"
                        value={formData.makingChargePerGram}
                        onChange={handleChange}
                        placeholder="Enter making charge per gram"
                        step="0.01"
                        min="0"
                        className={errors.makingChargePerGram ? 'error' : ''}
                    />
                    {errors.makingChargePerGram && <span className="error-message">{errors.makingChargePerGram}</span>}
                </div>
            </div>

            {/* Dimensions Section */}
            <div className="form-section">
                <h3>Dimensions</h3>
                <div className="unit-toggle">
                    <label>Unit: </label>
                    <div className="slider-container">
                        <input
                            type="checkbox"
                            id="inventoryDimensionUnit"
                            name="inventoryDimensionUnit"
                            checked={formData.dimensionUnit === 'inch'}
                            onChange={(e) => setFormData({ ...formData, dimensionUnit: e.target.checked ? 'inch' : 'cm' })}
                            className="slider-input"
                        />
                        <label htmlFor="inventoryDimensionUnit" className="slider">
                        </label>
                        <span className="slider-label">{formData.dimensionUnit === 'cm' ? 'cm' : 'in'}</span>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Length ({formData.dimensionUnit})</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="e.g., 5.5"
                            value={formData.length}
                            onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                            className={errors.length ? 'error' : ''}
                        />
                    </div>
                    <div className="form-group">
                        <label>Width ({formData.dimensionUnit})</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="e.g., 3.2"
                            value={formData.width}
                            onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                            className={errors.width ? 'error' : ''}
                        />
                    </div>
                    <div className="form-group">
                        <label>Height ({formData.dimensionUnit})</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="e.g., 8.0"
                            value={formData.height}
                            onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                            className={errors.height ? 'error' : ''}
                        />
                    </div>
                </div>
            </div>

            {/* Calculation Summary */}
            <div className="calculations-summary">
                <h3>Calculation Summary</h3>
                <div className="calc-row">
                    <span>Metal Value:</span>
                    <strong>₹{calculations.metalValue.toFixed(2)}</strong>
                </div>
                <div className="calc-row">
                    <span>Wastage Amount ({formData.wastagePercent}%):</span>
                    <strong>₹{calculations.wastageAmount.toFixed(2)}</strong>
                </div>
                <div className="calc-row">
                    <span>Total Making Charge:</span>
                    <strong>₹{calculations.totalMakingCharge.toFixed(2)}</strong>
                </div>
                {formData.extraValue > 0 && (
                    <div className="calc-row">
                        <span>Extra Value:</span>
                        <strong>₹{parseFloat(formData.extraValue).toFixed(2)}</strong>
                    </div>
                )}
                <div className="calc-row total">
                    <span>Total Price:</span>
                    <strong>₹{calculations.totalPrice.toFixed(2)}</strong>
                </div>
            </div>

            <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? 'Adding Inventory...' : 'Add to Inventory'}
            </button>
        </form>
    );
};

export default InventoryForm;
