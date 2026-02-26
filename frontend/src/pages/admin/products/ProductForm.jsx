import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_CONFIG } from '../../../constants';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import notify from '../../../utils/notify';
import authFetch from '../../../utils/authFetch.js';
import { resolveImageUrl } from '../../../utils/imageUrl';
import { useSiteSettings } from '../../../context/useSiteSettings';
import { formatCurrency } from '../../../utils/currency';

const schema = yup.object({
    title: yup.string().trim().required('Title is required'),
    description: yup.string().default(''),
    basePrice: yup.string().default(''),
    baseDiscount: yup.number().transform((v, orig) => (orig === '' ? 0 : v)).min(0).max(100).default(0),
    categoryId: yup.string().required('Category is required').default(''),
    brandId: yup.string().required('Brand is required').default(''),
    condition: yup.string().default('new'),
    status: yup.string().default('active'),
    isFeatured: yup.boolean().default(false),
});

const cartesian = (arrays) => {
    if (arrays.length === 0) return [[]];
    const [first, ...rest] = arrays;
    const restCombos = cartesian(rest);
    return first.flatMap(item => restCombos.map(combo => [item, ...combo]));
};

const getOptionsKey = (options = []) => {
    const parts = options
        .map((option) => {
            const typeId = String(option?.typeId || option?.type?._id || option?.type?.id || '').trim();
            const optionId = String(option?.optionId || option?._id || option?.id || '').trim();
            if (!typeId || !optionId) return null;
            return `${typeId}:${optionId}`;
        })
        .filter(Boolean)
        .sort();

    return parts.length ? parts.join('|') : '';
};

const getComboKey = (combo = []) => {
    const parts = combo
        .map((entry) => {
            const typeId = String(entry?.type?._id || '').trim();
            const optionId = String(entry?.option?._id || '').trim();
            if (!typeId || !optionId) return null;
            return `${typeId}:${optionId}`;
        })
        .filter(Boolean)
        .sort();

    return parts.length ? parts.join('|') : '';
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const resolveVariantSelections = (variants = [], types = [], optionsByType = {}) => {
    const typeById = new Map(types.map((type) => [String(type._id), type]));
    const typeByName = new Map(types.map((type) => [normalizeText(type.name), type]));
    const typeByDisplayName = new Map(types.map((type) => [normalizeText(type.displayName), type]));

    const normalizedVariants = variants.map((variant) => {
        const nextOptions = (Array.isArray(variant?.options) ? variant.options : []).map((option) => {
            const rawTypeId = String(option?.typeId || option?.type?._id || option?.type?.id || '').trim();
            let type = typeById.get(rawTypeId);

            if (!type) {
                const typeName = normalizeText(option?.typeName);
                const typeDisplayName = normalizeText(option?.typeDisplayName);
                type = typeByName.get(typeName) || typeByDisplayName.get(typeDisplayName) || null;
            }

            if (!type) return option;

            const typeId = String(type._id);
            const availableOptions = Array.isArray(optionsByType[typeId]) ? optionsByType[typeId] : [];
            const rawOptionId = String(option?.optionId || option?._id || option?.id || '').trim();

            let matchedOption = availableOptions.find((entry) => String(entry?._id) === rawOptionId);
            if (!matchedOption) {
                const value = normalizeText(option?.value);
                const displayValue = normalizeText(option?.displayValue);
                matchedOption = availableOptions.find((entry) => (
                    normalizeText(entry?.value) === value
                    || normalizeText(entry?.displayValue) === displayValue
                ));
            }

            if (!matchedOption) return option;

            return {
                ...option,
                typeId: typeId,
                typeName: type.name,
                typeDisplayName: type.displayName,
                optionId: String(matchedOption._id),
                value: matchedOption.value,
                displayValue: matchedOption.displayValue,
                hexColor: matchedOption.hexColor || null,
            };
        });

        return {
            ...variant,
            options: nextOptions,
        };
    });

    const selectedByType = normalizedVariants.reduce((acc, variant) => {
        const options = Array.isArray(variant?.options) ? variant.options : [];
        options.forEach((option) => {
            const typeId = String(option?.typeId || '').trim();
            const optionId = String(option?.optionId || '').trim();
            if (!typeId || !optionId) return;
            if (!acc[typeId]) acc[typeId] = new Set();
            acc[typeId].add(optionId);
        });
        return acc;
    }, {});

    return { normalizedVariants, selectedByType };
};

const RANDOM_VARIANT_IMAGE_FILES = [
    '404-error-cyberpunk-5120x2880-18226.jpg',
    'alucard-guns-5120x2880-22588.png',
    'attack-on-titan-shingeki-no-kyojin-mikasa-ackerman-anime-3840x2160-2073.jpg',
    'be-yourself-be-you-inspirational-quotes-dark-background-5120x2880-1486.jpg',
    'bee-happy-clear-sky-sky-blue-clouds-bee-2560x2560-1407.jpg',
    'captain-america-6200x3429-21470.png',
    'challenge-yourself-make-your-dream-become-reality-work-3840x2160-1933.png',
    'cute-panda-love-heart-colorful-hearts-white-background-4000x2366-6575.jpg',
    'cyberpunk-2077-john-wick-keanu-reeves-3500x5000-1005.jpg',
    'dope-sukuna-pink-5120x2880-16935.png',
    'goku-ultra-instinct-5120x2880-22575.png',
    'guts-neon-iconic-5120x2880-21415.png',
    'i-love-coding-dark-3840x2160-16016.png',
    'miles-morales-spider-man-dark-black-background-artwork-5k-8k-8000x4518-1902.png',
    'pubg-survive-loot-repeat-black-background-pubg-helmet-3840x2160-1174.png',
    'roronoa-zoro-neon-5120x2880-19829.png',
    'sasuke-uchiha-neon-5120x2880-22582.png',
    'satoru-gojo-neon-5120x2880-22583.png',
    'spooky-devil-amoled-3840x2160-16276.png',
    'ultra-instinct-goku-5120x2880-19856.jpg',
];

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const pickRandomVariantImageNames = (count) => {
    const shuffled = [...RANDOM_VARIANT_IMAGE_FILES].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

const buildVariantFromCombo = (combo = []) => ({
    _tempId: `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    sku: combo.map(c => c.option.value.toUpperCase()).join('-'),
    displayName: combo.map(c => c.option.displayValue).join(' / '),
    price: '',
    discount: 0,
    stock: 0,
    status: 'active',
    options: combo.map(c => ({
        typeId: c.type._id,
        typeName: c.type.name,
        typeDisplayName: c.type.displayName,
        optionId: c.option._id,
        value: c.option.value,
        displayValue: c.option.displayValue,
        hexColor: c.option.hexColor || null,
    })),
    images: [],
});

const ProductForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { settings } = useSiteSettings();
    const currencyCode = String(settings?.currencyCode || 'USD').toUpperCase();
    const isEdit = Boolean(id);

    const { register, handleSubmit: rhfHandleSubmit, reset, setError, watch, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            title: '',
            description: '',
            basePrice: '',
            baseDiscount: 0,
            categoryId: '',
            brandId: '',
            condition: 'new',
            status: 'active',
            isFeatured: false,
        },
        mode: 'onBlur',
    });

    const watchBasePrice = watch('basePrice');
    const watchStatus = watch('status');
    const watchIsFeatured = watch('isFeatured');

    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    const [imagesError, setImagesError] = useState('');

    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // ── Variant state
    const [hasVariants, setHasVariants] = useState(false);
    const [availableVariantTypes, setAvailableVariantTypes] = useState([]);
    const [variantOptions, setVariantOptions] = useState({});
    const [selectedOptionIds, setSelectedOptionIds] = useState({});
    const [generatedVariants, setGeneratedVariants] = useState([]);
    const [variantImages, setVariantImages] = useState({});
    const [isFillingVariantData, setIsFillingVariantData] = useState(false);

    useEffect(() => {
        loadSelectOptions();
        loadVariantTypes();
        if (isEdit) {
            loadProduct();
        }
    }, [id]);

    useEffect(() => {
        if (!isEdit || !hasVariants || generatedVariants.length === 0 || availableVariantTypes.length === 0) {
            return;
        }

        const allOptionListsLoaded = availableVariantTypes.every((type) => Array.isArray(variantOptions[type._id]));
        if (!allOptionListsLoaded) {
            return;
        }

        const { normalizedVariants, selectedByType } = resolveVariantSelections(
            generatedVariants,
            availableVariantTypes,
            variantOptions,
        );

        const currentSignature = JSON.stringify(generatedVariants.map((variant) => getOptionsKey(variant?.options || [])));
        const nextSignature = JSON.stringify(normalizedVariants.map((variant) => getOptionsKey(variant?.options || [])));

        if (currentSignature !== nextSignature) {
            setGeneratedVariants(normalizedVariants);
        }

        setSelectedOptionIds(selectedByType);
    }, [isEdit, hasVariants, generatedVariants, availableVariantTypes, variantOptions]);

    const getImageUrl = (img) => {
        const path = typeof img === 'string' ? img : img?.path;
        return resolveImageUrl(path);
    };

    const loadSelectOptions = async () => {
        try {
            const [categoriesRes, brandsRes] = await Promise.all([
                fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}`),
                fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BRANDS}?limit=200&status=active`),
            ]);

            const categoriesData = await categoriesRes.json();
            const brandsData = await brandsRes.json();

            const categoriesList = Array.isArray(categoriesData?.data) ? categoriesData.data : categoriesData?.data?.categories || categoriesData?.data?.items || [];
            const brandsList = Array.isArray(brandsData?.data) ? brandsData.data : brandsData?.data?.items || brandsData?.data?.brands || [];

            const categoriesWithHierarchy = categoriesList.map((cat) => {
                let displayName = cat.title;
                if (cat.parentId) {
                    const parent = categoriesList.find((p) => p._id === cat.parentId);
                    if (parent) {
                        displayName = `${parent.title} > ${cat.title}`;
                    }
                }
                return { ...cat, displayName };
            });

            setCategories(categoriesWithHierarchy);
            setBrands(brandsList);
        } catch (error) {
            console.error('Error loading options:', error);
            notify.error('Failed to load categories and brands');
        }
    };

    const loadVariantTypes = async () => {
        try {
            const res = await authFetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_TYPES}/active`);
            const data = await res.json();
            if (data.success) {
                const types = Array.isArray(data.data) ? data.data : [];
                setAvailableVariantTypes(types);
                types.forEach(t => {
                    authFetch(
                        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VARIANT_OPTIONS}?variantTypeId=${t._id}&status=active&limit=100`
                    )
                        .then(r => r.json())
                        .then(d => {
                            if (d.success) {
                                setVariantOptions(prev => ({ ...prev, [t._id]: Array.isArray(d.data?.items) ? d.data.items : [] }));
                            }
                        })
                        .catch(() => {});
                });
            }
        } catch (err) {
            console.error('Error loading variant types:', err);
        }
    };

    const loadProduct = async () => {
        try {
            setIsLoading(true);
            // Use admin endpoint so draft/inactive products can be edited
            const response = await authFetch(
                `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}/admin/${id}`
            );
            const data = await response.json();

            if (data.success) {
                const product = data.data;
reset({
                    title: product.title || '',
                    description: product.description || '',
                    basePrice: product.basePrice || '',
                    baseDiscount: product.baseDiscount || 0,
                    categoryId: product.category?.id || '',
                    brandId: product.brand?.id || '',
                    condition: product.condition || 'new',
                    status: product.status || 'active',
                    isFeatured: product.isFeatured || false,
                });

                if (product.images && Array.isArray(product.images)) {
                    setExistingImages(product.images);
                }

                if (product.hasVariants && product.variants?.length) {
                    setHasVariants(true);
                    const variants = product.variants.map((variant) => ({
                        ...variant,
                        _tempId: variant._id || String(Math.random()),
                        images: Array.isArray(variant.images) ? variant.images : [],
                    }));
                    const { normalizedVariants, selectedByType } = resolveVariantSelections(
                        variants,
                        availableVariantTypes,
                        variantOptions,
                    );
                    setGeneratedVariants(normalizedVariants);
                    setSelectedOptionIds(selectedByType);
                } else {
                    setHasVariants(false);
                    setGeneratedVariants([]);
                    setSelectedOptionIds({});
                }
            }
        } catch (error) {
            console.error('Error loading product:', error);
            notify.error('Failed to load product');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Variant handlers
    const handleHasVariantsToggle = (enabled) => {
        setHasVariants(enabled);
        if (!enabled) { setGeneratedVariants([]); setVariantImages({}); setSelectedOptionIds({}); }
    };

    const handleOptionToggle = (typeId, optionId) => {
        setSelectedOptionIds(prev => {
            const current = new Set(prev[typeId] || []);
            current.has(optionId) ? current.delete(optionId) : current.add(optionId);
            return { ...prev, [typeId]: current };
        });
    };

    const loadRandomImagesForVariants = async (variants) => {
        if (!Array.isArray(variants) || variants.length === 0) return;

        setIsFillingVariantData(true);
        try {
            const nextImages = {};

            await Promise.all(
                variants.map(async (variant, variantIndex) => {
                    if (Array.isArray(variant.images) && variant.images.length > 0) {
                        return;
                    }

                    const randomImageNames = pickRandomVariantImageNames(randomInt(1, 3));
                    const files = [];
                    const previews = [];

                    await Promise.allSettled(
                        randomImageNames.map(async (imageName) => {
                            const response = await fetch(`${API_CONFIG.BASE_URL}/images/${encodeURIComponent(imageName)}`);
                            if (!response.ok) return;

                            const blob = await response.blob();
                            const file = new File([blob], imageName, {
                                type: blob.type || 'image/webp',
                            });

                            files.push(file);
                            previews.push(URL.createObjectURL(blob));
                        })
                    );

                    if (files.length > 0) {
                        nextImages[variantIndex] = { files, previews };
                    }
                })
            );

            setVariantImages(nextImages);
            notify.success(`Generated ${variants.length} variant(s) with random values and images`);
        } catch (error) {
            notify.error('Unable to auto-load random variant images');
        } finally {
            setIsFillingVariantData(false);
        }
    };

    const fillRandomVariantData = async () => {
        if (!generatedVariants.length) return;

        const randomizedVariants = generatedVariants.map((variant) => ({
            ...variant,
            price: String(randomInt(50, 1000)),
            discount: randomInt(0, 50),
            stock: randomInt(0, 100),
        }));

        setGeneratedVariants(randomizedVariants);
        setVariantImages({});
        await loadRandomImagesForVariants(randomizedVariants);
    };

    const generateCombinations = async () => {
        const activeTypes = availableVariantTypes.filter(t => selectedOptionIds[t._id]?.size > 0);
        if (!activeTypes.length) { notify.error('Select at least one option from a variant type'); return; }
        const typeOptionSets = activeTypes.map(type =>
            (variantOptions[type._id] || [])
                .filter(o => selectedOptionIds[type._id].has(o._id))
                .map(o => ({ type, option: o }))
        );
        const combos = cartesian(typeOptionSets);

        const comboByKey = new Map();
        combos.forEach((combo) => {
            const key = getComboKey(combo);
            if (key && !comboByKey.has(key)) {
                comboByKey.set(key, combo);
            }
        });

        const existingByKey = new Map();
        generatedVariants.forEach((variant) => {
            const key = getOptionsKey(variant.options || []);
            if (key && !existingByKey.has(key)) {
                existingByKey.set(key, variant);
            }
        });

        const nextVariants = Array.from(comboByKey.entries()).map(([key, combo]) => {
            const existingVariant = existingByKey.get(key);
            if (existingVariant) {
                const hasPrice = existingVariant.price && String(existingVariant.price).trim() !== '';
                const hasStock = existingVariant.stock !== null && existingVariant.stock !== undefined && String(existingVariant.stock).trim() !== '';

                return {
                    ...existingVariant,
                    price: hasPrice ? existingVariant.price : String(randomInt(50, 1000)),
                    discount: existingVariant.discount !== null && existingVariant.discount !== undefined ? existingVariant.discount : randomInt(0, 50),
                    stock: hasStock ? existingVariant.stock : randomInt(0, 100),
                    options: existingVariant.options?.length ? existingVariant.options : buildVariantFromCombo(combo).options,
                    _tempId: existingVariant._tempId || existingVariant._id || `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                };
            }

            return {
                ...buildVariantFromCombo(combo),
                price: String(randomInt(50, 1000)),
                discount: randomInt(0, 50),
                stock: randomInt(0, 100),
            };
        });

        setGeneratedVariants(nextVariants);
        setVariantImages({});
        await loadRandomImagesForVariants(nextVariants);
    };

    const updateVariantField = (index, field, value) => {
        setGeneratedVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
    };

    const removeVariant = (index) => {
        setGeneratedVariants(prev => prev.filter((_, i) => i !== index));
        setVariantImages(prev => {
            const next = {};
            Object.entries(prev).forEach(([k, v]) => {
                const ki = parseInt(k);
                if (ki !== index) next[ki > index ? ki - 1 : ki] = v;
            });
            return next;
        });
    };

    const addEmptyVariant = () => {
        setGeneratedVariants(prev => [...prev, {
            _tempId: `tmp_${Date.now()}`,
            sku: '', displayName: '', price: '', discount: 0, stock: 0,
            status: 'active', options: [], images: [],
        }]);
    };

    const handleVariantImageChange = (e, vi) => {
        const files = Array.from(e.target.files);
        // Reset input so the same file can be re-selected
        e.target.value = '';
        const valid = files.filter(f => {
            if (!f.type.startsWith('image/')) { notify.error(`${f.name} not an image`); return false; }
            return true;
        });
        if (!valid.length) return;
        // Read all previews first, then do a single state update to avoid async stale-prev issues
        Promise.all(
            valid.map(file => new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve({ file, preview: reader.result });
                reader.readAsDataURL(file);
            }))
        ).then(results => {
            setVariantImages(prev => {
                const cur = prev[vi] || { files: [], previews: [] };
                return {
                    ...prev,
                    [vi]: {
                        files: [...cur.files, ...results.map(r => r.file)],
                        previews: [...cur.previews, ...results.map(r => r.preview)],
                    },
                };
            });
        });
    };

    const removeVariantImage = (vi, ii, isExisting) => {
        if (isExisting) {
            setGeneratedVariants(prev =>
                prev.map((v, i) => i === vi ? { ...v, images: Array.isArray(v.images) ? v.images.filter((_, idx) => idx !== ii) : [] } : v)
            );
        } else {
            setVariantImages(prev => {
                const cur = prev[vi] || { files: [], previews: [] };
                return {
                    ...prev,
                    [vi]: { files: cur.files.filter((_, idx) => idx !== ii), previews: cur.previews.filter((_, idx) => idx !== ii) },
                };
            });
        }
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const totalImages = images.length + existingImages.length + files.length;
        if (totalImages > 10) {
            notify.error('Maximum 10 images allowed for products');
            return;
        }

        const validFiles = files.filter((file) => {
            if (!file.type.startsWith('image/')) {
                notify.error(`${file.name} is not an image`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        setImages((prev) => [...prev, ...validFiles]);
        setImagesError('');

        validFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews((prev) => [...prev, { url: reader.result, name: file.name }]);
            };
            reader.readAsDataURL(file);
        });

        notify.success(`${validFiles.length} image(s) added`);
        e.target.value = '';
    };

    const removeImage = (index) => {
        setImages((prev) => prev.filter((_, i) => i !== index));
        setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const removeExistingImage = (index) => {
        setExistingImages((prev) => prev.filter((_, i) => i !== index));
    };

    const onSubmit = async (data) => {
        let hasErrors = false;

        if (!hasVariants) {
            if (!String(data.basePrice).trim()) {
                setError('basePrice', { message: 'Base price is required' });
                hasErrors = true;
            } else if (Number(data.basePrice) <= 0) {
                setError('basePrice', { message: 'Base price must be greater than 0' });
                hasErrors = true;
            }
            if (!isEdit && images.length + existingImages.length === 0) {
                setImagesError('At least one image is required');
                hasErrors = true;
            }
        } else {
            let variantError = '';
            if (!generatedVariants.length) {
                variantError = 'Add at least one variant';
            } else if (generatedVariants.some(v => !v.sku?.trim())) {
                variantError = 'All variants need a SKU';
            } else if (generatedVariants.some(v => !v.price || parseFloat(v.price) <= 0)) {
                variantError = 'All variants need a valid price (greater than 0)';
            } else {
                const seenOptionKeys = new Set();
                const seenSkus = new Set();
                for (const variant of generatedVariants) {
                    const sku = String(variant?.sku || '').trim().toUpperCase();
                    if (sku) {
                        if (seenSkus.has(sku)) {
                            variantError = 'Duplicate SKU found. Each variant SKU must be unique';
                            break;
                        }
                        seenSkus.add(sku);
                    }
                    const optionKey = getOptionsKey(variant?.options || []);
                    if (optionKey) {
                        if (seenOptionKeys.has(optionKey)) {
                            variantError = 'Duplicate variant combination found. Keep only one row per option combination';
                            break;
                        }
                        seenOptionKeys.add(optionKey);
                    }
                }
            }
            if (variantError) {
                setError('variants', { message: variantError });
                hasErrors = true;
            }
        }

        if (hasErrors) {
            notify.error('Please fix form validation errors');
            return;
        }

        setIsSaving(true);

        try {
            const formDataToSend = new FormData();

            Object.keys(data).forEach((key) => {
                formDataToSend.append(key, data[key]);
            });

            formDataToSend.append('hasVariants', hasVariants);

            images.forEach((image) => {
                formDataToSend.append('images', image);
            });

            if (isEdit) {
                formDataToSend.append('existingImages', JSON.stringify(existingImages));
            }

            if (hasVariants) {
                const variantsPayload = generatedVariants.map(v => ({
                    ...(v._id ? { _id: v._id } : {}),
                    sku: v.sku,
                    displayName: v.displayName,
                    price: parseFloat(v.price) || 0,
                    discount: parseFloat(v.discount) || 0,
                    stock: parseInt(v.stock) || 0,
                    status: v.status,
                    options: v.options || [],
                    images: Array.isArray(v.images) ? v.images : [],
                }));
                formDataToSend.append('variants', JSON.stringify(variantsPayload));
                Object.entries(variantImages).forEach(([idx, d]) => {
                    (d.files || []).forEach(file => formDataToSend.append(`variantImages_${idx}`, file));
                });
            }

            const url = isEdit
                ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}`
                : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}`;

            const response = await authFetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                body: formDataToSend,
            });

            const resData = await response.json();

            if (resData.success || response.ok) {
                notify.success(`Product ${isEdit ? 'updated' : 'created'} successfully!`);
                navigate('/admin/products');
            } else {
                if (Array.isArray(resData?.errors) && resData.errors.length > 0) {
                    resData.errors.forEach(({ field, message }) => setError(field, { message }));
                    notify.error(resData.message || 'Please fix form validation errors');
                    return;
                }
                notify.error(resData.message || 'Failed to save product');
            }
        } catch (error) {
            console.error('Error saving product:', error);
            notify.error('Failed to save product. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[420px] items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-slate-700" />
                    <p className="text-lg font-semibold text-slate-800">Loading product workspace...</p>
                    <p className="mt-1 text-sm text-slate-500">Preparing product details and media</p>
                </div>
            </div>
        );
    }

    const baseProductImageCount = existingImages.length + imagePreviews.length;
    const existingVariantImageCount = generatedVariants.reduce(
        (sum, variant) => sum + (Array.isArray(variant?.images) ? variant.images.length : 0),
        0,
    );
    const newVariantImageCount = Object.values(variantImages).reduce(
        (sum, item) => sum + (Array.isArray(item?.files) ? item.files.length : 0),
        0,
    );
    const totalImages = hasVariants
        ? existingVariantImageCount + newVariantImageCount
        : baseProductImageCount;

    const variantPrices = generatedVariants
        .map((variant) => Number.parseFloat(variant?.price))
        .filter((price) => Number.isFinite(price) && price > 0);
    const minVariantPrice = variantPrices.length ? Math.min(...variantPrices) : null;
    const maxVariantPrice = variantPrices.length ? Math.max(...variantPrices) : null;

    const priceDisplay = hasVariants
        ? (variantPrices.length
            ? (minVariantPrice === maxVariantPrice
                ? formatCurrency(minVariantPrice, settings)
                : `${formatCurrency(minVariantPrice, settings)} - ${formatCurrency(maxVariantPrice, settings)}`)
            : 'Not Set')
        : (watchBasePrice ? formatCurrency(watchBasePrice, settings) : 'Not Set');

    const productStatus = watchStatus || 'draft';

    return (
        <div className="relative w-full space-y-8 px-4">
            <div className="pointer-events-none absolute right-8 top-16 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-20 left-8 h-44 w-44 rounded-full bg-sky-300/20 blur-3xl" />

            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.35)] sm:p-8">
                <div className="absolute -right-10 -top-20 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
                <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-sky-300/20 blur-3xl" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Product Studio</p>
                        <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{isEdit ? 'Edit Product' : 'Create Product'}</h1>
                        <p className="mt-2 text-slate-200/90">
                            {isEdit ? 'Update product details, pricing, classification, and images' : 'Create a polished catalog product with consistent metadata and visuals'}
                        </p>
                    </div>
                    <span
                        className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold ${
                            productStatus === 'active'
                                ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                                : productStatus === 'inactive'
                                  ? 'border-amber-200 bg-amber-100 text-amber-800'
                                  : 'border-slate-300 bg-slate-100 text-slate-700'
                        }`}
                    >
                        {productStatus}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Workflow</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{isEdit ? 'Editing Product' : 'Creating Product'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Images</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{totalImages} Selected</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Price</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{priceDisplay}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Featured</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{watchIsFeatured ? 'Yes' : 'No'}</p>
                </div>
            </div>

            <form onSubmit={rhfHandleSubmit(onSubmit)} noValidate className="space-y-6">
                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
                    <div className="order-1 space-y-6 lg:order-1">
                        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)] sm:p-7">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-slate-900">Basic Information</h2>
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-200 bg-gradient-to-br from-cyan-100 to-sky-100 text-cyan-700">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
                                    </svg>
                                </span>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Product Title *</label>
                                <input
                                    type="text"
                                    {...register('title')}
                                    className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200 ${errors.title ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                                    placeholder="Enter product title"
                                />
                                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title?.message}</p>}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
                                <textarea
                                    {...register('description')}
                                    rows="5"
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                                    placeholder="Enter product description"
                                />
                            </div>

                            {!hasVariants && (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">Base Price *</label>
                                        <input
                                            type="number"
                                            {...register('basePrice')}
                                            step="0.01"
                                            min="0"
                                            className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200 ${errors.basePrice ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                                            placeholder="0.00"
                                        />
                                        {errors.basePrice && <p className="mt-1 text-sm text-red-600">{errors.basePrice?.message}</p>}
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">Discount (%)</label>
                                        <input
                                            type="number"
                                            {...register('baseDiscount')}
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {!hasVariants && (
                        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)] sm:p-7">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-slate-900">Classification</h2>
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-indigo-200 bg-gradient-to-br from-indigo-100 to-sky-100 text-indigo-700">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                                    </svg>
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Category</label>
                                    <select
                                        {...register('categoryId')}
                                        className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200 ${errors.categoryId ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map((cat) => (
                                            <option key={cat._id} value={cat._id}>
                                                {cat.displayName || cat.title}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.categoryId && <p className="mt-1 text-sm text-red-600">{errors.categoryId?.message}</p>}
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Brand</label>
                                    <select
                                        {...register('brandId')}
                                        className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200 ${errors.brandId ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                                    >
                                        <option value="">Select Brand</option>
                                        {brands.map((brand) => (
                                            <option key={brand._id} value={brand._id}>
                                                {brand.title}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.brandId && <p className="mt-1 text-sm text-red-600">{errors.brandId?.message}</p>}
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Condition</label>
                                    <select
                                        {...register('condition')}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                                    >
                                        <option value="new">New</option>
                                        <option value="hot">Hot</option>
                                        <option value="default">Default</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Status</label>
                                    <select
                                        {...register('status')}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="draft">Draft</option>
                                    </select>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <label className="flex cursor-pointer items-center gap-3">
                                    <input
                                        type="checkbox"
                                        {...register('isFeatured')}
                                        className="h-5 w-5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                    />
                                    <span className="text-sm font-semibold text-slate-700">Mark as Featured Product</span>
                                </label>
                            </div>
                        </div>
                        )}
                    </div>

                    <div className="order-2 space-y-6 lg:order-2">
                        {hasVariants && (
                        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)] sm:p-7">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-slate-900">Classification</h2>
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-indigo-200 bg-gradient-to-br from-indigo-100 to-sky-100 text-indigo-700">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                                    </svg>
                                </span>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Category</label>
                                    <select {...register('categoryId')}
                                        className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200 ${errors.categoryId ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}>
                                        <option value="">Select Category</option>
                                        {categories.map((cat) => (
                                            <option key={cat._id} value={cat._id}>{cat.displayName || cat.title}</option>
                                        ))}
                                    </select>
                                    {errors.categoryId && <p className="mt-1 text-sm text-red-600">{errors.categoryId?.message}</p>}
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Brand</label>
                                    <select {...register('brandId')}
                                        className={`w-full rounded-xl border px-4 py-3 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200 ${errors.brandId ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}>
                                        <option value="">Select Brand</option>
                                        {brands.map((brand) => (
                                            <option key={brand._id} value={brand._id}>{brand.title}</option>
                                        ))}
                                    </select>
                                    {errors.brandId && <p className="mt-1 text-sm text-red-600">{errors.brandId?.message}</p>}
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Condition</label>
                                    <select {...register('condition')}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200">
                                        <option value="new">New</option>
                                        <option value="hot">Hot</option>
                                        <option value="default">Default</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Status</label>
                                    <select {...register('status')}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200">
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="draft">Draft</option>
                                    </select>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <label className="flex cursor-pointer items-center gap-3">
                                    <input type="checkbox" {...register('isFeatured')}
                                        className="h-5 w-5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" />
                                    <span className="text-sm font-semibold text-slate-700">Mark as Featured Product</span>
                                </label>
                            </div>
                        </div>
                        )}

                        {!hasVariants && (
                        <div className="media-card">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-xl font-black text-slate-900">Product Images</h2>
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-200 bg-gradient-to-br from-cyan-100 to-blue-100 text-cyan-700">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                                    </svg>
                                </span>
                            </div>
                            <p className="mb-5 text-sm text-slate-500">Upload up to 10 product images (JPG, PNG, GIF, WEBP), max 5MB each.</p>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Product Images</label>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    onChange={handleImageChange}
                                    className={`media-file-input ${imagesError ? 'border-red-500 focus:ring-red-200' : ''}`}
                                />
                                {imagesError && <p className="mt-2 text-sm text-red-600">{imagesError}</p>}
                            </div>

                            {existingImages.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="mb-3 text-sm font-semibold text-slate-700">Current Images</h3>
                                    <div className="media-grid">
                                        {existingImages.map((img, index) => (
                                            <div key={index} className="group media-thumb">
                                                <img src={getImageUrl(img)} alt={`Product ${index + 1}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeExistingImage(index)}
                                                    className="media-remove-btn"
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {imagePreviews.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="mb-3 text-sm font-semibold text-slate-700">New Images</h3>
                                    <div className="media-grid">
                                        {imagePreviews.map((preview, index) => (
                                            <div key={index} className="group media-thumb">
                                                <img src={preview.url} alt={preview.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(index)}
                                                    className="media-remove-btn"
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        )}
                    </div>
                </div>

                {/* ── Product Variants Section ── */}
                <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)] sm:p-7">
                    <div className="mb-5 flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-900">Product Variants</h2>
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-indigo-200 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                        </span>
                    </div>

                    <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <input
                            type="checkbox"
                            id="hasVariants"
                            checked={hasVariants}
                            onChange={e => handleHasVariantsToggle(e.target.checked)}
                            className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <label htmlFor="hasVariants" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                            Enable Variants <span className="font-normal text-slate-400">(e.g., Colors, Sizes)</span>
                        </label>
                    </div>

                    {hasVariants && (
                        <div className="space-y-6">
                            {/* Type & Options Builder */}
                            <div>
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Select Variant Types &amp; Options</h3>
                                </div>
                                {availableVariantTypes.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-sm text-slate-400">
                                        No variant types found.{' '}
                                        <a href="/admin/variants/types" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Create variant types first</a>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        {availableVariantTypes.map(type => (
                                            <div key={type._id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                                <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                                                    <span className="text-sm font-semibold text-slate-800">{type.displayName}</span>
                                                </div>
                                                <div className="min-h-[48px] px-4 py-3">
                                                    {variantOptions[type._id] === undefined ? (
                                                        <p className="animate-pulse text-sm text-slate-400">Loading options...</p>
                                                    ) : (variantOptions[type._id] || []).length === 0 ? (
                                                        <p className="text-xs text-slate-400">
                                                            No options.{' '}
                                                            <a href="/admin/variants/options" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">Add options</a>
                                                        </p>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {(variantOptions[type._id] || []).map(opt => {
                                                                const isSelected = selectedOptionIds[type._id]?.has(opt._id);
                                                                return (
                                                                    <label key={opt._id}
                                                                        className={`flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all ${
                                                                            isSelected ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-400'
                                                                        }`}>
                                                                        <input type="checkbox" checked={!!isSelected} onChange={() => handleOptionToggle(type._id, opt._id)} className="hidden" />
                                                                        {opt.hexColor && (
                                                                            <span className="inline-block h-3 w-3 flex-shrink-0 rounded-full border border-white/50" style={{ background: opt.hexColor }} />
                                                                        )}
                                                                        {opt.displayValue}
                                                                        {isSelected && <span className="ml-0.5 text-[10px] leading-none text-white/80">×</span>}
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Generated Variants Table */}
                            <div>
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                                        Generated Variants
                                        {generatedVariants.length > 0 && (
                                            <span className="ml-2 text-xs font-normal normal-case text-slate-400">({generatedVariants.length})</span>
                                        )}
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {generatedVariants.length > 0 && (
                                            <button type="button" onClick={addEmptyVariant}
                                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                                                + Add Row
                                            </button>
                                        )}
                                        {generatedVariants.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={fillRandomVariantData}
                                                disabled={isFillingVariantData}
                                                className="rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                                                title="Randomize all variant values and auto-attach random images"
                                            >
                                                {isFillingVariantData ? 'Loading images...' : '🎲 Randomize Data'}
                                            </button>
                                        )}
                                        <button type="button" onClick={generateCombinations}
                                            className="rounded-lg bg-teal-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-teal-700 transition-colors">
                                            Generate Variants
                                        </button>
                                    </div>
                                </div>
                                {errors.variants && <p className="mb-3 text-sm text-red-600">{errors.variants?.message}</p>}

                                {generatedVariants.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-slate-400">
                                        Select types &amp; options above, then click <strong>Generate Variants</strong>
                                    </div>
                                ) : (
                                    <>
                                        <div className="hidden rounded-t-xl border border-b-0 border-slate-200 bg-slate-100 px-4 py-2 md:grid md:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_2fr_auto] md:gap-3">
                                            {['Variant Name', 'SKU *', `Price (${currencyCode}) *`, 'Discount (%)', 'Stock *', 'Images *', 'Action'].map(h => (
                                                <span key={h} className="text-xs font-semibold uppercase tracking-wide text-slate-600">{h}</span>
                                            ))}
                                        </div>
                                        <div className="divide-y divide-slate-200 overflow-hidden rounded-b-xl border border-slate-200">
                                            {generatedVariants.map((variant, vi) => (
                                                <div key={variant._tempId || vi} className="bg-white p-4 transition-colors hover:bg-slate-50/50 md:grid md:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_2fr_auto] md:gap-3">
                                                    {/* Variant Name */}
                                                    <div className="mb-2 flex flex-wrap items-center gap-1 md:mb-0">
                                                        {variant.options?.length > 0 ? (
                                                            variant.options.map((opt, oi) => (
                                                                <span key={oi} className="flex items-center gap-1 text-xs font-semibold text-indigo-700">
                                                                    {opt.hexColor && (
                                                                        <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full border border-slate-300" style={{ background: opt.hexColor }} />
                                                                    )}
                                                                    {opt.typeDisplayName}: {opt.displayValue}
                                                                    {oi < variant.options.length - 1 && <span className="mx-0.5 font-normal text-slate-300">/</span>}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <input type="text" value={variant.displayName}
                                                                onChange={e => updateVariantField(vi, 'displayName', e.target.value)}
                                                                placeholder="Variant name"
                                                                className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-400" />
                                                        )}
                                                    </div>
                                                    {/* SKU */}
                                                    <div className="mb-2 md:mb-0">
                                                        <label className="mb-1 block text-xs font-semibold text-slate-500 md:hidden">SKU *</label>
                                                        <input type="text" value={variant.sku}
                                                            onChange={e => updateVariantField(vi, 'sku', e.target.value.toUpperCase())}
                                                            className="w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-xs uppercase focus:ring-1 focus:ring-indigo-400" />
                                                    </div>
                                                    {/* Price */}
                                                    <div className="mb-2 md:mb-0">
                                                        <label className="mb-1 block text-xs font-semibold text-slate-500 md:hidden">{`Price (${currencyCode}) *`}</label>
                                                        <input type="number" step="0.01" min="0" value={variant.price}
                                                            onChange={e => updateVariantField(vi, 'price', e.target.value)}
                                                            className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-400" />
                                                    </div>
                                                    {/* Discount */}
                                                    <div className="mb-2 md:mb-0">
                                                        <label className="mb-1 block text-xs font-semibold text-slate-500 md:hidden">Discount (%)</label>
                                                        <input type="number" step="0.01" min="0" max="100" value={variant.discount}
                                                            onChange={e => updateVariantField(vi, 'discount', e.target.value)}
                                                            className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-400" />
                                                    </div>
                                                    {/* Stock */}
                                                    <div className="mb-2 md:mb-0">
                                                        <label className="mb-1 block text-xs font-semibold text-slate-500 md:hidden">Stock *</label>
                                                        <input type="number" min="0" value={variant.stock}
                                                            onChange={e => updateVariantField(vi, 'stock', e.target.value)}
                                                            className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-400" />
                                                    </div>
                                                    {/* Images */}
                                                    <div className="mb-2 md:mb-0">
                                                        <label className="mb-1 block text-xs font-semibold text-slate-500 md:hidden">Images *</label>
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            {(Array.isArray(variant.images) ? variant.images : []).map((img, ii) => (
                                                                <div key={ii} className="group relative h-12 w-12 flex-shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-100">
                                                                    <img src={typeof img === 'string' ? img : (img.path?.startsWith('http') ? img.path : `${API_CONFIG.BASE_URL}/uploads/${img.path}`)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover"
                                                                        onError={e => { e.target.src = '/placeholder.png'; }} />
                                                                    <button type="button" onClick={() => removeVariantImage(vi, ii, true)}
                                                                        className="absolute inset-0 flex items-center justify-center bg-red-500/0 text-sm font-bold text-white opacity-0 transition-all hover:bg-red-500/70 group-hover:opacity-100">×</button>
                                                                </div>
                                                            ))}
                                                            {(variantImages[vi]?.previews || []).map((src, ii) => (
                                                                <div key={`new-${ii}`} className="group relative h-12 w-12 flex-shrink-0 overflow-hidden rounded border-2 border-cyan-400 bg-slate-100">
                                                                    <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                                                                    <button type="button" onClick={() => removeVariantImage(vi, ii, false)}
                                                                        className="absolute inset-0 flex items-center justify-center bg-red-500/0 text-sm font-bold text-white opacity-0 transition-all hover:bg-red-500/70 group-hover:opacity-100">×</button>
                                                                </div>
                                                            ))}
                                                            <label className="flex h-12 w-12 flex-shrink-0 cursor-pointer items-center justify-center rounded border-2 border-dashed border-slate-300 text-slate-400 transition-all hover:border-cyan-400 hover:text-cyan-500">
                                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                                </svg>
                                                                <input type="file" accept="image/*" multiple onChange={e => handleVariantImageChange(e, vi)} className="hidden" />
                                                            </label>
                                                        </div>
                                                    </div>
                                                    {/* Action */}
                                                    <div className="flex items-center justify-end md:justify-center">
                                                        <button type="button" onClick={() => removeVariant(vi)}
                                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-500 transition-all hover:bg-red-100"
                                                            title="Remove variant">
                                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="mt-2 text-xs text-slate-400">
                                            Total stock: <strong>{generatedVariants.reduce((s, v) => s + (parseInt(v.stock) || 0), 0)}</strong> units
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="sticky bottom-3 z-10 flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur sm:flex-row">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/products')}
                        className="w-full rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 transition-colors hover:bg-slate-100 sm:w-auto"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-900 transition-colors hover:bg-cyan-300 disabled:opacity-50 sm:flex-1"
                    >
                        {isSaving ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProductForm;
