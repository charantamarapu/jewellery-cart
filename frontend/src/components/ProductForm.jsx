import React, { useState, useEffect } from 'react';
import './ProductForm.css';
import { getImageUrl } from '../utils/imageProxy.js';

// Convert Google Drive share link to direct image URL and proxy it
const getProxiedImageUrl = (url) => {
    return getImageUrl(url);
};

const ProductForm = ({ onSubmit, initialData = null, isLoading = false, onCancel = null }) => {
    const [metalPrices, setMetalPrices] = useState({});
    const [expandedSection, setExpandedSection] = useState('basic'); // 'basic' or 'jewelry'
    const [imageLoadError, setImageLoadError] = useState(false);
    const [inventoryImageLoadError, setInventoryImageLoadError] = useState(false);

    const [formData, setFormData] = useState({
        // Basic product info
        name: '',
        description: '',
        image: '',
        price: '',
        stock: '',
        // Jewelry specifications
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
        inventoryImage: '',
        // Dimensions
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
        { value: 'gold', label: 'Gold', pricePerGram: 14043 },
        { value: 'silver', label: 'Silver', pricePerGram: 250 },
        { value: 'platinum', label: 'Platinum', pricePerGram: 6340 }
    ];

    const PURITY_OPTIONS = {
        gold: [
            { label: '22K', sublabel: '91.6%', value: 91.6 },
            { label: '20K', sublabel: '84.0%', value: 84.0 },
            { label: '18K', sublabel: '75.0%', value: 75.0 }
        ],
        silver: [
            { label: 'Sterling', sublabel: '92.5%', value: 92.5 }
        ],
        platinum: [
            { label: '95.0%', sublabel: 'Pure', value: 95.0 },
            { label: '90.0%', sublabel: 'Pure', value: 90.0 },
            { label: '85.0%', sublabel: 'Pure', value: 85.0 }
        ]
    };

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

    useEffect(() => {
        fetchMetalPrices();
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

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
            if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
                setFormData(prev => ({
                    ...prev,
                    [name]: value
                }));
            }
        } else {
            // Handle weight auto-calculations
            let updatedData = {
                ...formData,
                [name]: value
            };

            const netWeight = name === 'netWeight' ? parseFloat(value) : parseFloat(formData.netWeight);
            const grossWeight = name === 'grossWeight' ? parseFloat(value) : parseFloat(formData.grossWeight);
            const extraWeight = name === 'extraWeight' ? parseFloat(value) : parseFloat(formData.extraWeight);

            // Auto-calculate weights: Gross = Net + Extra
            if (name === 'grossWeight' && !isNaN(grossWeight) && grossWeight > 0) {
                // When gross weight is entered, clear dependent fields
                updatedData.netWeight = '';
                updatedData.extraWeight = '';
            } else if (name === 'netWeight' && !isNaN(netWeight) && !isNaN(grossWeight) && netWeight > 0 && grossWeight > 0) {
                // When net weight is entered after gross, auto-calculate extra
                if (netWeight <= grossWeight) {
                    updatedData.extraWeight = (grossWeight - netWeight).toFixed(2);
                } else {
                    // Net weight can't be > gross weight
                    setFormData(formData);
                    if (errors[name]) {
                        setErrors(prev => ({
                            ...prev,
                            [name]: ''
                        }));
                    }
                    return;
                }
            } else if (name === 'extraWeight' && !isNaN(extraWeight) && !isNaN(grossWeight) && grossWeight > 0) {
                // When extra weight is entered after gross, auto-calculate net
                if (extraWeight >= 0 && extraWeight < grossWeight) {
                    updatedData.netWeight = (grossWeight - extraWeight).toFixed(2);
                } else if (extraWeight >= grossWeight) {
                    // Extra weight can't be >= gross weight
                    setFormData(formData);
                    if (errors[name]) {
                        setErrors(prev => ({
                            ...prev,
                            [name]: ''
                        }));
                    }
                    return;
                }
            }

            setFormData(updatedData);
        }

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

            if (!purity || !netWeight || !wastagePercent || !metalPrice) {
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

        // Basic validation
        if (!formData.name) newErrors.name = 'Product name is required';
        if (!formData.description) newErrors.description = 'Description is required';
        if (formData.stock === '' || formData.stock === undefined || isNaN(formData.stock)) newErrors.stock = 'Stock quantity is required';
        if (formData.stock < 0) newErrors.stock = 'Stock cannot be negative';

        // Jewelry specification validation
        if (!formData.metal) newErrors.metal = 'Metal is required';
        if (!formData.grossWeight) newErrors.grossWeight = 'Gross weight is mandatory - enter this first';
        if (formData.grossWeight && isNaN(parseFloat(formData.grossWeight))) newErrors.grossWeight = 'Gross weight must be a number';
        
        if (!formData.netWeight && !formData.extraWeight) newErrors.netWeight = 'Enter either Net Weight or Extra Weight';
        if (formData.netWeight && isNaN(parseFloat(formData.netWeight))) newErrors.netWeight = 'Net weight must be a number';

        if (!formData.hallmarked && !formData.purity) {
            newErrors.purity = 'Purity is required if not hallmarked';
        }
        if (formData.hallmarked && !formData.purity) {
            newErrors.purity = 'Please select a standard purity';
        }

        if (formData.netWeight && formData.grossWeight) {
            const netW = parseFloat(formData.netWeight);
            const grossW = parseFloat(formData.grossWeight);
            if (netW > grossW) {
                newErrors.netWeight = 'Net weight cannot exceed gross weight';
                newErrors.grossWeight = 'Gross weight must be at least equal to net weight';
            }
        }

        if (!formData.type) newErrors.type = 'Type is required';
        if (!formData.ornament) newErrors.ornament = 'Ornament is required';
        if (formData.ornament === 'custom' && !formData.customOrnament) newErrors.customOrnament = 'Please specify custom ornament';

        if (!formData.wastagePercent) newErrors.wastagePercent = 'Wastage percent is required';
        if (formData.type === 'Normal' && (formData.wastagePercent < 4 || formData.wastagePercent > 15)) {
            newErrors.wastagePercent = 'Wastage percent must be between 4-15% for Normal type';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        let imageData = null;
        let imageUrl = null;

        // Store original image URL (not proxied) - will be proxied when displayed
        if (formData.image) {
            imageUrl = formData.image;
        }

        const submitData = {
            // Basic product info
            name: formData.name,
            description: formData.description,
            image: imageData,
            imageUrl: imageUrl,
            price: calculations.totalPrice,
            stock: parseInt(formData.stock) || 0,
            // Jewelry inventory specs
            metal: formData.metal,
            hallmarked: formData.hallmarked,
            purity: parseFloat(formData.purity),
            netWeight: parseFloat(formData.netWeight),
            extraDescription: formData.extraDescription || null,
            extraWeight: formData.extraWeight ? parseFloat(formData.extraWeight) : 0,
            extraValue: formData.extraValue ? parseFloat(formData.extraValue) : 0,
            grossWeight: parseFloat(formData.grossWeight),
            type: formData.type,
            ornament: formData.ornament,
            customOrnament: formData.customOrnament || null,
            wastagePercent: parseFloat(formData.wastagePercent),
            makingChargePerGram: formData.makingChargePerGram ? parseFloat(formData.makingChargePerGram) : 0,
            totalMakingCharge: calculations.totalMakingCharge,
            totalPrice: calculations.totalPrice,
            inventoryImage: formData.inventoryImage || null
        };

        onSubmit(submitData);
    };

    return (
        <form onSubmit={handleSubmit} className="product-form">
            {/* BASIC PRODUCT INFORMATION */}
            <div className="form-section">
                <button
                    type="button"
                    className="section-header"
                    onClick={() => setExpandedSection(expandedSection === 'basic' ? null : 'basic')}
                >
                    <span className="section-title">📦 Basic Product Information</span>
                    <span className="section-toggle">{expandedSection === 'basic' ? '▼' : '▶'}</span>
                </button>

                {expandedSection === 'basic' && (
                    <div className="section-content">
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="name">Product Name <span className="required">*</span></label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g., Gold Ring with Diamonds"
                                    className={errors.name ? 'error' : ''}
                                />
                                {errors.name && <span className="error-message">{errors.name}</span>}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="description">Description <span className="required">*</span></label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Detailed product description"
                                    rows="4"
                                    className={errors.description ? 'error' : ''}
                                />
                                {errors.description && <span className="error-message">{errors.description}</span>}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Product Image URL <span className="required">*</span></label>
                                <input
                                    type="text"
                                    name="image"
                                    value={formData.image}
                                    onChange={(e) => {
                                        handleChange(e);
                                        setImageLoadError(false);
                                    }}
                                    placeholder="https://example.com/image.jpg or paste Google Drive share link"
                                />
                                <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                                    💡 Supports: Direct image URLs or Google Drive share links
                                </small>
                                {formData.image && (
                                    <div className="image-preview">
                                        {!imageLoadError ? (
                                            <img
                                                src={getProxiedImageUrl(formData.image)}
                                                alt="Preview"
                                                onLoad={(e) => {
                                                    console.log('✅ Image loaded successfully');
                                                    setImageLoadError(false);
                                                }}
                                                onError={(e) => {
                                                    const proxiedUrl = getProxiedImageUrl(formData.image);
                                                    console.error('❌ Image load failed:', proxiedUrl);
                                                    console.error('Status:', e.target.status);
                                                    setImageLoadError(true);
                                                }}
                                            />
                                        ) : (
                                            <div style={{
                                                padding: '20px',
                                                textAlign: 'center',
                                                backgroundColor: '#ffebee',
                                                borderRadius: '4px',
                                                color: '#d32f2f',
                                                fontSize: '14px'
                                            }}>
                                                <p><strong>❌ Failed to load image</strong></p>
                                                <small style={{ display: 'block', marginBottom: '10px' }}>Troubleshooting checklist:</small>
                                                <ul style={{ 
                                                    textAlign: 'left', 
                                                    display: 'inline-block', 
                                                    margin: '10px 0',
                                                    paddingLeft: '20px'
                                                }}>
                                                    <li>✓ Google Drive link is shared with "Anyone with link"</li>
                                                    <li>✓ The file is an image (jpg, png, gif, etc.)</li>
                                                    <li>✓ The link is valid and points to an existing file</li>
                                                    <li>✓ Check browser console for detailed error</li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="stock">Stock Quantity <span className="required">*</span></label>
                                <input
                                    type="number"
                                    id="stock"
                                    name="stock"
                                    value={formData.stock}
                                    onChange={handleChange}
                                    placeholder="Enter stock quantity"
                                    step="1"
                                    min="0"
                                    className={errors.stock ? 'error' : ''}
                                />
                                {errors.stock && <span className="error-message">{errors.stock}</span>}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* JEWELRY SPECIFICATIONS */}
            <div className="form-section">
                <button
                    type="button"
                    className="section-header"
                    onClick={() => setExpandedSection(expandedSection === 'jewelry' ? null : 'jewelry')}
                >
                    <span className="section-title">💎 Jewelry Specifications</span>
                    <span className="section-toggle">{expandedSection === 'jewelry' ? '▼' : '▶'}</span>
                </button>

                {expandedSection === 'jewelry' && (
                    <div className="section-content">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Metal <span className="required">*</span></label>
                                <div className="metal-toggle-group">
                                    {METAL_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            className={`metal-toggle ${formData.metal === opt.value ? 'active' : ''}`}
                                            onClick={() => handleMetalChange({ target: { value: opt.value } })}
                                        >
                                            <span className="metal-name">{opt.label}</span>
                                            <span className="metal-price">₹{opt.pricePerGram}/g</span>
                                        </button>
                                    ))}
                                </div>
                                {errors.metal && <span className="error-message">{errors.metal}</span>}
                                {formData.metalPrice > 0 && (
                                    <p className="metal-price-display">✓ Selected: ₹{formData.metalPrice}/gram</p>
                                )}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="inventoryImage">Certificate/Spec Image URL</label>
                                <input
                                    type="text"
                                    id="inventoryImage"
                                    name="inventoryImage"
                                    value={formData.inventoryImage}
                                    onChange={handleChange}
                                    placeholder="https://... or paste Google Drive share link (Optional)"
                                />
                                <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                                    💡 Supports: Direct image URLs or Google Drive share links
                                </small>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="hallmarked">Hallmarked <span className="required">*</span></label>
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

                        {formData.hallmarked && (
                            <div className="form-row">
                                <div className="form-group full-width">
                                    <label>Purity <span className="required">*</span></label>
                                    {formData.metal && PURITY_OPTIONS[formData.metal] ? (
                                        <div className="purity-slider-group">
                                            {PURITY_OPTIONS[formData.metal].map(opt => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    className={`purity-slider ${formData.purity === opt.value ? 'active' : ''}`}
                                                    onClick={() => setFormData({ ...formData, purity: opt.value })}
                                                >
                                                    <span className="purity-label">{opt.label}</span>
                                                    <span className="purity-sublabel">{opt.sublabel}</span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="note-text">⚠️ Please select a metal first</p>
                                    )}
                                    {errors.purity && <span className="error-message">{errors.purity}</span>}
                                </div>
                            </div>
                        )}

                        {!formData.hallmarked && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="purity">Purity <span className="required">*</span></label>
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
                                    {errors.purity && <span className="error-message">{errors.purity}</span>}
                                </div>
                            </div>
                        )}

                        <div className="form-row weight-section">
                            <div className="form-group">
                                <div className="label-with-hint">
                                    <label htmlFor="grossWeight">Gross Weight (grams) <span className="required">*</span></label>
                                    <span className="range-hint">(Enter this first)</span>
                                </div>
                                <input
                                    type="number"
                                    id="grossWeight"
                                    name="grossWeight"
                                    value={formData.grossWeight}
                                    onChange={handleChange}
                                    placeholder="Enter gross weight (mandatory)"
                                    step="0.01"
                                    min="0"
                                    className={errors.grossWeight ? 'error' : ''}
                                />
                                {errors.grossWeight && <span className="error-message">{errors.grossWeight}</span>}
                            </div>
                        </div>

                        <div className="form-row weight-section">
                            <div className="form-group">
                                <div className="label-with-hint">
                                    <label htmlFor="netWeight">Net Weight (grams)</label>
                                    {formData.grossWeight && formData.extraWeight && (
                                        <span className="auto-calc-hint">🔄 Auto-calculated</span>
                                    )}
                                </div>
                                <input
                                    type="number"
                                    id="netWeight"
                                    name="netWeight"
                                    value={formData.netWeight}
                                    onChange={handleChange}
                                    placeholder="Enter OR leave blank to auto-calculate"
                                    step="0.01"
                                    min="0"
                                    className={errors.netWeight ? 'error' : ''}
                                    disabled={!formData.grossWeight}
                                />
                                {!formData.grossWeight && <span className="note-text">⚠️ Enter gross weight first</span>}
                                {errors.netWeight && <span className="error-message">{errors.netWeight}</span>}
                            </div>

                            <div className="form-group">
                                <div className="label-with-hint">
                                    <label htmlFor="extraWeight">Weight of Extra (grams)</label>
                                    {formData.netWeight && formData.grossWeight && (
                                        <span className="auto-calc-hint">🔄 Auto-calculated</span>
                                    )}
                                </div>
                                <input
                                    type="number"
                                    id="extraWeight"
                                    name="extraWeight"
                                    value={formData.extraWeight}
                                    onChange={handleChange}
                                    placeholder="Enter OR leave blank to auto-calculate"
                                    step="0.01"
                                    min="0"
                                    disabled={!formData.grossWeight}
                                />
                                {!formData.grossWeight && <span className="note-text">⚠️ Enter gross weight first</span>}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="extraDescription">Extra (Description)</label>
                                <input
                                    type="text"
                                    id="extraDescription"
                                    name="extraDescription"
                                    value={formData.extraDescription}
                                    onChange={handleChange}
                                    placeholder="e.g., 2 Diamonds, 5 Pearls, etc."
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="extraValue">Value of Extra (₹)</label>
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
                                <label htmlFor="type">Type <span className="required">*</span></label>
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

                            <div className="form-group">
                                <label htmlFor="ornament">Ornament <span className="required">*</span></label>
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
                        </div>

                        {formData.ornament === 'custom' && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="customOrnament">Custom Ornament Type <span className="required">*</span></label>
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
                            </div>
                        )}

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="wastagePercent">Wastage Percent (%) <span className="required">*</span>
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

                            <div className="form-group">
                                <label htmlFor="makingChargePerGram">Making Charge/gram (₹)</label>
                                <input
                                    type="number"
                                    id="makingChargePerGram"
                                    name="makingChargePerGram"
                                    value={formData.makingChargePerGram}
                                    onChange={handleChange}
                                    placeholder="Enter making charge per gram (optional)"
                                    step="0.01"
                                    min="0"
                                    className={errors.makingChargePerGram ? 'error' : ''}
                                />
                                {errors.makingChargePerGram && <span className="error-message">{errors.makingChargePerGram}</span>}
                            </div>
                        </div>

                        {/* Dimensions Section */}
                        <div className="dimensions-section">
                            <h4>Dimensions (Optional)</h4>
                            <div className="dimension-unit-toggle">
                                <label>Unit: </label>
                                <div className="slider-container">
                                    <input
                                        type="checkbox"
                                        id="dimensionUnit"
                                        name="dimensionUnit"
                                        checked={formData.dimensionUnit === 'inch'}
                                        onChange={(e) => setFormData({ ...formData, dimensionUnit: e.target.checked ? 'inch' : 'cm' })}
                                        className="slider-input"
                                    />
                                    <label htmlFor="dimensionUnit" className="slider">
                                    </label>
                                    <span className="slider-label">{formData.dimensionUnit === 'cm' ? 'cm' : 'in'}</span>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="length">Length ({formData.dimensionUnit})</label>
                                    <input
                                        type="number"
                                        id="length"
                                        name="length"
                                        value={formData.length}
                                        onChange={handleChange}
                                        placeholder="e.g., 5.5"
                                        step="0.01"
                                        min="0"
                                        className={errors.length ? 'error' : ''}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="width">Width ({formData.dimensionUnit})</label>
                                    <input
                                        type="number"
                                        id="width"
                                        name="width"
                                        value={formData.width}
                                        onChange={handleChange}
                                        placeholder="e.g., 3.2"
                                        step="0.01"
                                        min="0"
                                        className={errors.width ? 'error' : ''}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="height">Height ({formData.dimensionUnit})</label>
                                    <input
                                        type="number"
                                        id="height"
                                        name="height"
                                        value={formData.height}
                                        onChange={handleChange}
                                        placeholder="e.g., 8.0"
                                        step="0.01"
                                        min="0"
                                        className={errors.height ? 'error' : ''}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Calculation Summary */}
                        <div className="calculations-summary">
                            <h4>Price Calculation</h4>
                            <div className="calc-row">
                                <span>Metal Value:</span>
                                <strong>₹{calculations.metalValue.toFixed(2)}</strong>
                            </div>
                            <div className="calc-row">
                                <span>Wastage ({formData.wastagePercent}%):</span>
                                <strong>₹{calculations.wastageAmount.toFixed(2)}</strong>
                            </div>
                            <div className="calc-row">
                                <span>Making Charge:</span>
                                <strong>₹{calculations.totalMakingCharge.toFixed(2)}</strong>
                            </div>
                            {formData.extraValue > 0 && (
                                <div className="calc-row">
                                    <span>Extra Value:</span>
                                    <strong>₹{parseFloat(formData.extraValue).toFixed(2)}</strong>
                                </div>
                            )}
                            <div className="calc-row total">
                                <span>Calculated Total Price:</span>
                                <strong>₹{calculations.totalPrice.toFixed(2)}</strong>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Form Actions */}
            <div className="form-actions">
                <button type="submit" className="submit-btn" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Product'}
                </button>
                {onCancel && (
                    <button type="button" className="cancel-btn" onClick={onCancel} disabled={isLoading}>
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
};

export default ProductForm;
