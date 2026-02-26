import { logger } from '../../../utils/logger.js';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { API_CONFIG } from '../../../constants';
import notify from '../../../utils/notify';
import { resolveImageUrl } from '../../../utils/imageUrl';
import { useSiteSettings } from '../../../context/useSiteSettings';
import { formatCurrency } from '../../../utils/currency';

const schema = yup.object({
    title: yup.string().trim().required('Title is required'),
    summary: yup.string().default(''),
    description: yup.string().default(''),
    basePrice: yup.string().default(''),
    baseDiscount: yup.number().transform((v, orig) => (orig === '' ? 0 : v)).min(0).max(100).default(0),
    baseStock: yup.number().transform((v, orig) => (orig === '' ? 0 : v)).min(0).default(0),
    baseSku: yup.string().default(''),
    categoryId: yup.string().default(''),
    childCategoryId: yup.string().default(''),
    brandId: yup.string().default(''),
    condition: yup.string().default('new'),
    status: yup.string().default('draft'),
    isFeatured: yup.boolean().default(false),
    tags: yup.array().of(yup.string()).default([]),
    size: yup.array().of(yup.string()).default([]),
});

// ── Helpers

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

// All image filenames available under /images (served by backend)
const PROJECT_IMAGES = [
    '404-error-cyberpunk-5120x2880-18226.jpg',
    'alucard-guns-5120x2880-22588.png',
    'attack-on-titan-shingeki-no-kyojin-mikasa-ackerman-anime-3840x2160-2073.jpg',
    'be-yourself-be-you-inspirational-quotes-dark-background-5120x2880-1486.jpg',
    'bee-happy-clear-sky-sky-blue-clouds-bee-2560x2560-1407.jpg',
    'butterfly-samsung-galaxy-fold-black-background-stock-4600x2560-1401.jpg',
    'captain-america-6200x3429-21470.png',
    'challenge-yourself-make-your-dream-become-reality-work-3840x2160-1933.png',
    'cute-panda-love-heart-colorful-hearts-white-background-4000x2366-6575.jpg',
    'cyberpunk-2077-john-wick-keanu-reeves-3500x5000-1005.jpg',
    'death-darksiders-5120x2880-19314.jpg',
    'dont-waste-time-popular-quotes-inspirational-quotes-dark-3840x2160-6179.png',
    'dope-sukuna-pink-5120x2880-16935.png',
    'eat-sleep-create-repeat-inspirational-quotes-neon-pink-2560x1440-1948.jpg',
    'emoji-smileys-yellow-box-cheerful-smiling-emoticons-5412x3811-2302.jpg',
    'giyu-tomioka-amoled-3840x2160-22604.png',
    'goku-fusion-attack-dragon-ball-z-anime-series-black-8000x4961-1920.jpg',
    'goku-ultra-instinct-5120x2880-21414.png',
    'goku-ultra-instinct-5120x2880-22575.png',
    'gon-freecss-green-5120x2880-22503.jpg',
    'guts-berserk-dark-5120x2880-19127.jpg',
    'guts-black-5120x2880-21420.png',
    'guts-neon-iconic-5120x2880-21415.png',
    'hacker-laptop-hoodie-modern-malware-cyber-security-5k-5472x3648-1651.jpg',
    'i-am-groot-tv-series-2022-series-baby-groot-marvel-comics-3840x2160-8555.jpg',
    'i-love-coding-dark-3840x2160-16016.png',
    'jinx-arcane-neon-5120x2880-19860.jpg',
    'kazutora-hanemiya-5120x2880-21416.png',
    'kratos-jason-momoa-god-of-war-dark-3840x2160-1481.jpg',
    'life-seasons-spring-summer-autumn-winter-blue-background-6000x3375-2348.jpg',
    'lost-in-space-404-5120x2880-18155.png',
    'miles-morales-spider-man-dark-black-background-artwork-5k-8k-8000x4518-1902.png',
    'mob-psycho-100-3840x2160-16205.png',
    'monkey-d-luffy-one-piece-minimal-art-red-background-5k-8k-8000x4500-9031.jpg',
    'neonlight-red-background-neon-sign-glowing-the-world-is-3850x2888-2149.jpg',
    'pexels-anshu-35588565.jpg',
    'pexels-giancarlo-principe-outdoor-adventures-2158906038-35743219.jpg',
    'pexels-gonchifacello-20271088.jpg',
    'pexels-jean-pixels-427051121-22644127.jpg',
    'pexels-njeromin-35223500.jpg',
    'pubg-survive-loot-repeat-black-background-pubg-helmet-3840x2160-1174.png',
    'roronoa-zoro-5120x2880-18692.jpg',
    'roronoa-zoro-neon-5120x2880-19829.png',
    'samurai-katana-warrior-immortal-sun-silhouette-black-4082x8556-7471.png',
    'sasuke-uchiha-dark-7680x4320-19881.jpg',
    'sasuke-uchiha-neon-5120x2880-22582.png',
    'satoru-gojo-neon-5120x2880-22583.png',
    'scorpion-mortal-kombat-artwork-black-background-3840x2160-1586.jpg',
    'shinobu-kocho-demon-slayer-kimetsu-no-yaiba-3840x2160-7913.jpg',
    'son-goku-amoled-7680x4320-18688.jpg',
    'son-goku-dragon-ball-z-anime-series-black-background-amoled-8000x4961-1921.jpg',
    'spider-man-miles-morales-playstation-5-dark-background-2020-3840x2160-1490.jpg',
    'spooky-devil-amoled-3840x2160-16276.png',
    'sukuna-purple-5120x2880-16958.png',
    'sukuna-x-gojo-3840x2160-21530.png',
    'sukuna-x-gojo-5120x2880-21530.png',
    'tanjiro-kamado-5120x6402-18414.jpeg',
    'turbo-granny-okarun-3840x2160-19414.jpg',
    'ultra-instinct-goku-5120x2880-19856.jpg',
    'ultra-instinct-goku-black-background-dragon-ball-z-amoled-3840x2160-1817.jpg',
    'v-cyberpunk-action-3840x2160-16280.jpg',
    'v-cyberpunk-johnny-3840x2160-16282.jpg',
    'vegeta-dragon-ball-z-anime-series-black-background-amoled-8000x4961-1913.jpg',
    'work-harder-neon-lights-blue-background-motivational-4240x2384-2453.jpg',
];

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const pickRandomImages = (count) => {
    const shuffled = [...PROJECT_IMAGES].sort(() => 0.5 - Math.random());
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

const getImageUrl = (path) => {
    return resolveImageUrl(path, { placeholder: null });
};

const authFetch = (url, options = {}) => {
    const { headers = {}, ...rest } = options;
    return fetch(url, {
        credentials: 'include',
        ...rest,
        headers,
    });
};

const ProductFormEnhanced = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { settings } = useSiteSettings();
    const currencyCode = String(settings?.currencyCode || 'USD').toUpperCase();
    const isEdit = Boolean(id);

    const { register, handleSubmit, reset, setError, watch, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            title: '',
            summary: '',
            description: '',
            basePrice: '',
            baseDiscount: 0,
            baseStock: 0,
            baseSku: '',
            categoryId: '',
            childCategoryId: '',
            brandId: '',
            condition: 'new',
            status: 'draft',
            isFeatured: false,
            tags: [],
            size: [],
        },
        mode: 'onBlur',
    });

    const watchTags = watch('tags', []);
    const watchSize = watch('size', []);
    const watchBasePrice = watch('basePrice', '');
    const watchBaseDiscount = watch('baseDiscount', 0);
    const watchSummary = watch('summary', '');

    // â”€â”€ Product images â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    const [draggedIndex, setDraggedIndex] = useState(null);

    // â”€â”€ Selects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);

    // â”€â”€ Variant state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [hasVariants, setHasVariants] = useState(false);
    const [availableVariantTypes, setAvailableVariantTypes] = useState([]);
    const [variantOptions, setVariantOptions] = useState({});         // typeId -> options[]
    const [isFilling, setIsFilling] = useState(false);
    const [selectedOptionIds, setSelectedOptionIds] = useState({});   // typeId -> Set<optionId>
    const [generatedVariants, setGeneratedVariants] = useState([]);
    const [variantImages, setVariantImages] = useState({});           // variantIdx -> {files,previews}

    // â”€â”€ UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [isLoading, setIsLoading] = useState(Boolean(isEdit));
    const [isSaving, setIsSaving] = useState(false);

    // =========================================================================
    // LIFECYCLE
    // =========================================================================

    useEffect(() => {
        loadVariantTypes();
        if (isEdit) {
            loadProduct();
        } else {
            loadSelectOptions();
        }
    }, [id]);

    // =========================================================================
    // DATA LOADING
    // =========================================================================

    const loadSelectOptions = async () => {
        try {
            const [catRes, brandRes] = await Promise.all([
                fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}?limit=200`),
                fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BRANDS}?limit=200`),
            ]);
            const [catData, brandData] = await Promise.all([catRes.json(), brandRes.json()]);
            setCategories(Array.isArray(catData?.data) ? catData.data : catData?.data?.categories || []);
            setBrands(Array.isArray(brandData?.data) ? brandData.data : brandData?.data?.items || brandData?.data?.brands || []);
        } catch (error) {
            logger.error('Error loading selects:', error);
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
                // Auto-load options for all types immediately
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
        } catch (error) {
            logger.error('Error loading variant types:', error);
        }
    };

    const loadProduct = async () => {
        try {
            setIsLoading(true);

            // Load product + categories + brands concurrently so reset() fires
            // only after select options are available (prevents blank dropdowns).
            const [res, catRes, brandRes] = await Promise.all([
                authFetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}/admin/${id}`),
                fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CATEGORIES}?limit=200`),
                fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BRANDS}?limit=200`),
            ]);

            const [data, catData, brandData] = await Promise.all([
                res.json(), catRes.json(), brandRes.json(),
            ]);

            // Populate selects BEFORE calling reset so RHF can match option values
            const cats = Array.isArray(catData?.data) ? catData.data : catData?.data?.categories || [];
            const brds = Array.isArray(brandData?.data) ? brandData.data : brandData?.data?.items || brandData?.data?.brands || [];
            setCategories(cats);
            setBrands(brds);

            if (!data.success) { notify.error('Failed to load product'); return; }
            const p = data.data;

            reset({
                title: p.title || '',
                summary: p.summary || '',
                description: p.description || '',
                basePrice: p.basePrice ?? '',
                baseDiscount: p.baseDiscount ?? 0,
                baseStock: p.baseStock ?? 0,
                baseSku: p.baseSku || '',
                categoryId: p.category?.id || '',
                childCategoryId: p.childCategory?.id || '',
                brandId: p.brand?.id || '',
                condition: p.condition || 'new',
                status: p.status || 'draft',
                isFeatured: p.isFeatured || false,
                tags: p.tags || [],
                size: p.size || [],
            });

            if (p.images?.length) setExistingImages(p.images);

            if (p.hasVariants && p.variants?.length) {
                setHasVariants(true);
                setGeneratedVariants(p.variants.map(v => ({ ...v, _tempId: v._id || String(Math.random()) })));

                const selectedByType = p.variants.reduce((acc, variant) => {
                    const options = Array.isArray(variant?.options) ? variant.options : [];

                    options.forEach((option) => {
                        const typeId = String(option?.typeId || option?.type?._id || option?.type?.id || '').trim();
                        const optionId = String(option?.optionId || option?._id || option?.id || '').trim();

                        if (!typeId || !optionId) {
                            return;
                        }

                        if (!acc[typeId]) {
                            acc[typeId] = new Set();
                        }

                        acc[typeId].add(optionId);
                    });

                    return acc;
                }, {});

                setSelectedOptionIds(selectedByType);
            } else {
                setHasVariants(false);
                setGeneratedVariants([]);
                setSelectedOptionIds({});
            }
        } catch (error) {
            logger.error('Error loading product:', error);
            notify.error('Failed to load product');
        } finally {
            setIsLoading(false);
        }
    };

    // =========================================================================
    // FORM HANDLERS â€“ basic fields
    // =========================================================================


    // â”€â”€ Product images â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        if (images.length + existingImages.length + files.length > 10) { notify.error('Maximum 10 images allowed'); return; }
        const valid = files.filter(f => {
            if (!f.type.startsWith('image/')) { notify.error(`${f.name} is not an image`); return false; }
            if (f.size > 5 * 1024 * 1024) { notify.error(`${f.name} exceeds 5MB`); return false; }
            return true;
        });
        if (!valid.length) return;
        setImages(prev => [...prev, ...valid]);
        valid.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => setImagePreviews(prev => [...prev, { url: reader.result, name: file.name, isPrimary: false }]);
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (i) => {
        setImages(prev => prev.filter((_, idx) => idx !== i));
        setImagePreviews(prev => prev.filter((_, idx) => idx !== i));
    };

    const removeExistingImage = (i) => setExistingImages(prev => prev.filter((_, idx) => idx !== i));

    const setPrimaryImage = (i, isExisting) => {
        if (isExisting) setExistingImages(prev => prev.map((img, idx) => ({ ...img, isPrimary: idx === i })));
        else setImagePreviews(prev => prev.map((img, idx) => ({ ...img, isPrimary: idx === i })));
    };

    const handleDragStart = (e, i) => { setDraggedIndex(i); e.dataTransfer.effectAllowed = 'move'; };
    const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) return;
        const newPrev = [...imagePreviews];
        const newFiles = [...images];
        const [pDrag] = newPrev.splice(draggedIndex, 1);
        const [fDrag] = newFiles.splice(draggedIndex, 1);
        newPrev.splice(dropIndex, 0, pDrag);
        newFiles.splice(dropIndex, 0, fDrag);
        setImagePreviews(newPrev);
        setImages(newFiles);
        setDraggedIndex(null);
    };

    // =========================================================================
    // VARIANT HANDLERS
    // =========================================================================

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

    const generateCombinations = () => {
        // Use any type that has at least one option selected (no type-level checkbox needed)
        const activeTypes = availableVariantTypes
            .filter(t => selectedOptionIds[t._id]?.size > 0);

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
            if (key && !existingByKey.has(key)) existingByKey.set(key, variant);
        });

        const newVariants = Array.from(comboByKey.entries()).map(([key, combo]) => {
            const existingVariant = existingByKey.get(key);
            if (existingVariant) {
                // Fill random defaults for any missing/zero fields from DB
                const hasPrice = existingVariant.price && String(existingVariant.price).trim() !== '';
                const hasStock = existingVariant.stock != null && existingVariant.stock !== '';
                return {
                    ...existingVariant,
                    price: hasPrice ? existingVariant.price : String(randomInt(50, 1000)),
                    discount: existingVariant.discount != null ? existingVariant.discount : randomInt(0, 50),
                    stock: hasStock ? existingVariant.stock : randomInt(0, 100),
                    options: existingVariant.options?.length ? existingVariant.options : buildVariantFromCombo(combo).options,
                    _tempId: existingVariant._tempId || existingVariant._id || `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                };
            }
            // Brand new variant — auto-fill random price/discount/stock
            return {
                ...buildVariantFromCombo(combo),
                price: String(randomInt(50, 1000)),
                discount: randomInt(0, 50),
                stock: randomInt(0, 100),
            };
        });

        setGeneratedVariants(newVariants);
        setVariantImages({});
        // Auto-load random local images for all variants
        loadRandomImagesForVariants(newVariants);
    };

    // Load random images from /images for the given variants array
    const loadRandomImagesForVariants = async (variants) => {
        if (!variants.length) return;
        setIsFilling(true);
        try {
            const newImages = {};
            await Promise.all(
                variants.map(async (variant, vi) => {
                    // Skip if the variant already has saved DB images
                    if (variant.images?.length > 0) return;
                    const count = randomInt(1, 5);
                    const selected = pickRandomImages(count);
                    const files = [];
                    const previews = [];
                    await Promise.allSettled(
                        selected.map(async (imgName) => {
                            const res = await fetch(`${API_CONFIG.BASE_URL}/images/${encodeURIComponent(imgName)}`);
                            if (!res.ok) return;
                            const blob = await res.blob();
                            const ext = imgName.split('.').pop().toLowerCase();
                            const mime = ext === 'png' ? 'image/png' : ext === 'jpeg' ? 'image/jpeg' : 'image/jpeg';
                            const file = new File([blob], imgName, { type: mime });
                            const preview = URL.createObjectURL(blob);
                            files.push(file);
                            previews.push(preview);
                        })
                    );
                    if (files.length) newImages[vi] = { files, previews };
                })
            );
            setVariantImages(prev => ({ ...prev, ...newImages }));
            notify.success(`Generated ${variants.length} variant(s) with random data & images`);
        } catch (err) {
            notify.error('Failed to load random images');
        } finally {
            setIsFilling(false);
        }
    };

    // Re-randomize price/discount/stock + fresh random images for all current variants
    const fillRandomVariantData = async () => {
        if (!generatedVariants.length) return;
        setGeneratedVariants(prev =>
            prev.map(v => ({
                ...v,
                price: String(randomInt(50, 1000)),
                discount: randomInt(0, 50),
                stock: randomInt(0, 100),
            }))
        );
        await loadRandomImagesForVariants(generatedVariants);
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
        const valid = files.filter(f => {
            if (!f.type.startsWith('image/')) { notify.error(`${f.name} not an image`); return false; }
            if (f.size > 5 * 1024 * 1024) { notify.error(`${f.name} exceeds 5MB`); return false; }
            return true;
        });
        valid.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setVariantImages(prev => {
                    const cur = prev[vi] || { files: [], previews: [] };
                    return { ...prev, [vi]: { files: [...cur.files, file], previews: [...cur.previews, reader.result] } };
                });
            };
            reader.readAsDataURL(file);
        });
    };

    const removeVariantImage = (vi, ii, isExisting) => {
        if (isExisting) {
            setGeneratedVariants(prev =>
                prev.map((v, i) => i === vi ? { ...v, images: v.images.filter((_, idx) => idx !== ii) } : v)
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

    // =========================================================================
    // VALIDATION
    // =========================================================================


    const onSubmit = async (data) => {
        if (!hasVariants) {
            if (!data.basePrice || parseFloat(data.basePrice) <= 0) {
                setError('basePrice', { message: 'Valid price is required' });
                notify.error('Please fix form errors');
                return;
            }
            if (!isEdit && !data.baseSku.trim()) {
                setError('baseSku', { message: 'SKU is required' });
                notify.error('Please fix form errors');
                return;
            }
        } else {
            if (!generatedVariants.length) {
                setError('variants', { message: 'Add at least one variant' });
                notify.error('Please fix form errors');
                return;
            }
            if (generatedVariants.some(v => !v.price || parseFloat(v.price) <= 0)) {
                setError('variants', { message: 'All variants need a valid price' });
                notify.error('Please fix form errors');
                return;
            }
            if (generatedVariants.some(v => !v.sku?.trim())) {
                setError('variants', { message: 'All variants need a SKU' });
                notify.error('Please fix form errors');
                return;
            }
            const seenOptionKeys = new Set();
            const seenSkus = new Set();
            for (const variant of generatedVariants) {
                const sku = String(variant?.sku || '').trim().toUpperCase();
                if (sku) {
                    if (seenSkus.has(sku)) { setError('variants', { message: 'Duplicate SKU found. Each variant SKU must be unique' }); notify.error('Please fix form errors'); return; }
                    seenSkus.add(sku);
                }
                const optionKey = getOptionsKey(variant?.options || []);
                if (optionKey) {
                    if (seenOptionKeys.has(optionKey)) { setError('variants', { message: 'Duplicate variant combination found' }); notify.error('Please fix form errors'); return; }
                    seenOptionKeys.add(optionKey);
                }
            }
        }

        setIsSaving(true);
        try {
            const fd = new FormData();

            Object.entries(data).forEach(([key, val]) => {
                if (Array.isArray(val)) val.forEach(item => fd.append(`${key}[]`, item));
                else fd.append(key, val == null ? '' : val);
            });

            fd.append('hasVariants', hasVariants);

            images.forEach((file, i) => {
                fd.append('images', file);
                fd.append(`imageData[${i}][isPrimary]`, imagePreviews[i]?.isPrimary || false);
            });
            if (isEdit) fd.append('existingImages', JSON.stringify(existingImages));

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
                    images: v.images || [],
                }));
                fd.append('variants', JSON.stringify(variantsPayload));
                Object.entries(variantImages).forEach(([idx, imgData]) => {
                    (imgData.files || []).forEach(file => fd.append(`variantImages_${idx}`, file));
                });
            }

            const url = isEdit
                ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}`
                : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}`;

            const res = await authFetch(url, { method: isEdit ? 'PUT' : 'POST', body: fd });
            const resData = await res.json();

            if (resData.success || res.ok) {
                notify.success(`Product ${isEdit ? 'updated' : 'created'} successfully!`);
                navigate('/admin/products');
            } else {
                notify.error(resData.message || 'Failed to save product');
                if (Array.isArray(resData?.errors)) {
                    resData.errors.forEach(({ field, message }) => { if (field) setError(field, { message }); });
                }
            }
        } catch (error) {
            logger.error('Submit error:', error);
            notify.error('Failed to save product');
        } finally {
            setIsSaving(false);
        }
    };

    const finalPrice = () => {
        const p = parseFloat(watchBasePrice) || 0;
        const d = parseFloat(watchBaseDiscount) || 0;
        return formatCurrency(p - p * d / 100, settings);
    };

    // =========================================================================
    // RENDER
    // =========================================================================

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4" />
                    <p className="text-lg text-gray-700 font-medium">Loading product...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-1">{isEdit ? 'Edit Product' : 'Create New Product'}</h1>
                <p className="text-gray-500 text-sm">{isEdit ? 'Update product details, images, and variants' : 'Add a new product with all details'}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">

                {/* â”€â”€ 1. Basic Information â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                        Basic Information
                    </h2>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Product Title *</label>
                            <input {...register('title')}
                                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                                placeholder="Enter product title" />
                            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Summary</label>
                            <textarea {...register('summary')} rows={2} maxLength={500}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="Brief product summary (max 500 chars)" />
                            <p className="mt-1 text-xs text-gray-400">{(watchSummary || '').length}/500</p>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                            <textarea {...register('description')} rows={6}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="Detailed product description" />
                        </div>
                    </div>
                </div>

                {/* â”€â”€ 2. Pricing & Inventory (hidden/greyed when hasVariants) */}
                <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-8 ${hasVariants ? 'hidden' : ''}`}>
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <span className="bg-green-100 text-green-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                        Pricing &amp; Inventory
                        {hasVariants && <span className="text-xs font-normal text-gray-400 ml-1">(managed per variant)</span>}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Base Price *</label>
                            <div className="relative">
                                <span className="absolute left-4 top-3.5 text-gray-500">$</span>
                                <input {...register('basePrice')} type="number" step="0.01" min="0"
                                    className={`w-full pl-8 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all ${errors.basePrice ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="0.00" />
                            </div>
                            {errors.basePrice && <p className="mt-1 text-sm text-red-600">{errors.basePrice.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Discount (%)</label>
                            <input {...register('baseDiscount')} type="number" step="0.01" min="0" max="100"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Final Price</label>
                            <div className="px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl font-bold text-gray-900">{finalPrice()}</div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Stock Qty</label>
                            <input {...register('baseStock')} type="number" min="0"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">SKU *</label>
                            <input {...register('baseSku')}
                                className={`w-full px-4 py-3 border rounded-xl uppercase focus:ring-2 focus:ring-blue-500 transition-all ${errors.baseSku ? 'border-red-500' : 'border-gray-300'}`}
                                placeholder="e.g., PROD-12345" />
                            {errors.baseSku && <p className="mt-1 text-sm text-red-600">{errors.baseSku.message}</p>}
                        </div>
                    </div>
                </div>

                {/* â”€â”€ 3. Product Images â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <span className="bg-purple-100 text-purple-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                        Product Images
                    </h2>
                    <div className="space-y-5">
                        <label className="block">
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer">
                                <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="text-gray-700 font-medium mb-1">Click to upload or drag and drop</p>
                                <p className="text-sm text-gray-400">PNG, JPG, WEBP up to 5MB Â· max 10 images</p>
                            </div>
                            <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                        </label>

                        {existingImages.length > 0 && (
                            <div>
                                <p className="text-sm font-semibold text-gray-600 mb-2">Current Images</p>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                    {existingImages.map((img, i) => (
                                        <div key={i} className="relative group aspect-square bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-200">
                                            <img src={getImageUrl(img.path)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" onError={e => { e.target.src = '/placeholder.png'; }} />
                                            {img.isPrimary && <span className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">â˜…</span>}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-1">
                                                <button type="button" onClick={() => setPrimaryImage(i, true)} className="bg-white text-gray-800 p-1.5 rounded-full opacity-0 group-hover:opacity-100 text-xs">âœ“</button>
                                                <button type="button" onClick={() => removeExistingImage(i)} className="bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 text-xs">âœ•</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {imagePreviews.length > 0 && (
                            <div>
                                <p className="text-sm font-semibold text-gray-600 mb-2">New Images (drag to reorder)</p>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                    {imagePreviews.map((preview, i) => (
                                        <div key={i} draggable
                                            onDragStart={(e) => handleDragStart(e, i)}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, i)}
                                            className={`relative group aspect-square bg-gray-100 rounded-xl overflow-hidden border-2 cursor-move transition-all ${draggedIndex === i ? 'border-blue-500 opacity-50' : 'border-gray-200'}`}>
                                            <img src={preview.url} alt={preview.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                            {preview.isPrimary && <span className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">â˜…</span>}
                                            <span className="absolute top-1 right-1 bg-white/90 text-gray-700 text-xs px-1.5 py-0.5 rounded-full">{i + 1}</span>
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-1">
                                                <button type="button" onClick={() => setPrimaryImage(i, false)} className="bg-white text-gray-800 p-1.5 rounded-full opacity-0 group-hover:opacity-100 text-xs">âœ“</button>
                                                <button type="button" onClick={() => removeImage(i)} className="bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 text-xs">âœ•</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* â”€â”€ 4. Classification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <span className="bg-orange-100 text-orange-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">4</span>
                        Classification &amp; Attributes
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                            <select {...register('categoryId')}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all">
                                <option value="">Select Category</option>
                                {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.title}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Brand</label>
                            <select {...register('brandId')}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all">
                                <option value="">Select Brand</option>
                                {brands.map(b => <option key={b._id} value={b._id}>{b.title}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Condition</label>
                            <select {...register('condition')}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all">
                                <option value="new">New</option>
                                <option value="hot">Hot</option>
                                <option value="default">Default</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                            <select {...register('status')}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all">
                                <option value="draft">Draft</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Tags (comma-separated)</label>
                            <input type="text" value={watchTags.join(', ')} onChange={(e) => setValue('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="e.g., summer, sale, trending" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Sizes (comma-separated)</label>
                            <input type="text" value={watchSize.join(', ')} onChange={(e) => setValue('size', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="e.g., S, M, L, XL" />
                        </div>
                        <div className="md:col-span-2 flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                            <input {...register('isFeatured')} type="checkbox" id="isFeatured"
                                className="w-5 h-5 text-blue-600 border-gray-300 rounded" />
                            <label htmlFor="isFeatured" className="text-sm font-medium text-gray-700 cursor-pointer">
                                â˜… Mark as Featured Product (display on homepage)
                            </label>
                        </div>
                    </div>
                </div>

                {/* â”€â”€ 5. Product Variants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">5</span>
                        Product Variants
                    </h2>

                    {/* Checkbox toggle - matches Laravel style */}
                    <div className="flex items-center gap-3 mb-6">
                        <input
                            type="checkbox"
                            id="hasVariants"
                            checked={hasVariants}
                            onChange={e => handleHasVariantsToggle(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded cursor-pointer"
                        />
                        <label htmlFor="hasVariants" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                            Enable Variants <span className="text-gray-400">(e.g., Colors, Sizes)</span>
                        </label>
                    </div>

                    {hasVariants && (
                        <div className="space-y-6">

                            {/* Type & Options Builder - always visible when variants enabled */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Select Variant Types &amp; Options</h3>
                                </div>
                                {availableVariantTypes.length === 0 ? (
                                    <div className="text-center py-6 border border-dashed border-gray-300 rounded-xl text-gray-400 text-sm">
                                        No variant types found.{' '}
                                        <a href="/admin/variants/types" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Create variant types first</a>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {availableVariantTypes.map(type => (
                                            <div key={type._id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                                                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                                                    <span className="font-semibold text-gray-800 text-sm">{type.displayName}</span>
                                                </div>
                                                <div className="px-4 py-3 min-h-[48px]">
                                                    {variantOptions[type._id] === undefined ? (
                                                        <p className="text-sm text-gray-400 animate-pulse">Loading options...</p>
                                                    ) : (variantOptions[type._id] || []).length === 0 ? (
                                                        <p className="text-xs text-gray-400">
                                                            No options.{' '}
                                                            <a href="/admin/variants/options" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">Add options</a>
                                                        </p>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {(variantOptions[type._id] || []).map(opt => {
                                                                const isSelected = selectedOptionIds[type._id]?.has(opt._id);
                                                                return (
                                                                    <label key={opt._id}
                                                                        className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-full text-xs cursor-pointer transition-all select-none ${isSelected ? 'border-blue-500 bg-blue-600 text-white' : 'border-gray-300 text-gray-600 hover:border-blue-400 bg-white'}`}>
                                                                        <input type="checkbox" checked={!!isSelected} onChange={() => handleOptionToggle(type._id, opt._id)} className="hidden" />
                                                                        {opt.hexColor && (
                                                                            <span className="w-3 h-3 rounded-full border border-white/50 inline-block flex-shrink-0" style={{ background: opt.hexColor }} />
                                                                        )}
                                                                        {opt.displayValue}
                                                                        {isSelected && <span className="ml-0.5 text-white/80 text-[10px] leading-none">x</span>}
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
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                                        Generated Variants
                                        {generatedVariants.length > 0 && (
                                            <span className="ml-2 text-xs font-normal text-gray-400 normal-case">({generatedVariants.length})</span>
                                        )}
                                    </h3>
                                    <div className="flex gap-2 flex-wrap">
                                        {generatedVariants.length > 0 && (
                                            <button type="button" onClick={addEmptyVariant}
                                                className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-all">
                                                + Add Row
                                            </button>
                                        )}
                                        {generatedVariants.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={fillRandomVariantData}
                                                disabled={isFilling}
                                                className="text-xs px-4 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all flex items-center gap-1.5"
                                                title="Re-randomize price (50-1000), discount (0-50%), stock (0-100) and 1-5 local images per variant"
                                            >
                                                {isFilling ? (
                                                    <>
                                                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                        </svg>
                                                        Fetching images…
                                                    </>
                                                ) : (
                                                    <>🎲 Randomize Data</>
                                                )}
                                            </button>
                                        )}
                                        <button type="button" onClick={generateCombinations}
                                            className="text-xs px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold transition-all">
                                            Generate Variants
                                        </button>
                                    </div>
                                </div>
                                {errors.variants && <p className="text-sm text-red-600 mb-3">{errors.variants.message}</p>}
                                {generatedVariants.length === 0 ? (
                                    <div className="text-center py-8 border border-dashed border-gray-300 rounded-xl text-gray-400 text-sm">
                                        Select types &amp; options above, then click <strong>Generate Variants</strong>
                                    </div>
                                ) : (
                                    <>
                                        <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_2fr_auto] gap-3 px-4 py-2 bg-gray-100 rounded-t-xl border border-gray-200 border-b-0 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                            <span>Variant Name</span>
                                            <span>SKU *</span>
                                            <span>{`Price (${currencyCode}) *`}</span>
                                            <span>Discount (%)</span>
                                            <span>Stock *</span>
                                            <span>Images *</span>
                                            <span>Action</span>
                                        </div>
                                        <div className="border border-gray-200 rounded-b-xl overflow-hidden divide-y divide-gray-200">
                                            {generatedVariants.map((variant, vi) => (
                                                <div key={variant._tempId || vi} className="md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_2fr_auto] gap-3 p-4 bg-white hover:bg-gray-50/50 transition-colors">
                                                    {/* Variant Name */}
                                                    <div className="flex items-start flex-wrap gap-1 mb-2 md:mb-0 md:items-center">
                                                        {variant.options?.length > 0 ? (
                                                            variant.options.map((opt, oi) => (
                                                                <span key={oi} className="flex items-center gap-1 text-xs font-semibold text-blue-700">
                                                                    {opt.hexColor && (
                                                                        <span className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block flex-shrink-0" style={{ background: opt.hexColor }} />
                                                                    )}
                                                                    {opt.typeDisplayName}: {opt.displayValue}
                                                                    {oi < variant.options.length - 1 && <span className="text-gray-300 font-normal mx-0.5">/</span>}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <input type="text" value={variant.displayName}
                                                                onChange={e => updateVariantField(vi, 'displayName', e.target.value)}
                                                                placeholder="Variant name"
                                                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-400" />
                                                        )}
                                                    </div>
                                                    {/* SKU */}
                                                    <div className="mb-2 md:mb-0">
                                                        <label className="md:hidden block text-xs font-semibold text-gray-500 mb-1">SKU *</label>
                                                        <input type="text" value={variant.sku}
                                                            onChange={e => updateVariantField(vi, 'sku', e.target.value.toUpperCase())}
                                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-mono uppercase focus:ring-1 focus:ring-indigo-400" />
                                                    </div>
                                                    {/* Price */}
                                                    <div className="mb-2 md:mb-0">
                                                        <label className="md:hidden block text-xs font-semibold text-gray-500 mb-1">{`Price (${currencyCode}) *`}</label>
                                                        <input type="number" step="0.01" min="0" value={variant.price}
                                                            onChange={e => updateVariantField(vi, 'price', e.target.value)}
                                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-400" />
                                                    </div>
                                                    {/* Discount */}
                                                    <div className="mb-2 md:mb-0">
                                                        <label className="md:hidden block text-xs font-semibold text-gray-500 mb-1">Discount (%)</label>
                                                        <input type="number" step="0.01" min="0" max="100" value={variant.discount}
                                                            onChange={e => updateVariantField(vi, 'discount', e.target.value)}
                                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-400" />
                                                    </div>
                                                    {/* Stock */}
                                                    <div className="mb-2 md:mb-0">
                                                        <label className="md:hidden block text-xs font-semibold text-gray-500 mb-1">Stock *</label>
                                                        <input type="number" min="0" value={variant.stock}
                                                            onChange={e => updateVariantField(vi, 'stock', e.target.value)}
                                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-400" />
                                                    </div>
                                                    {/* Images */}
                                                    <div className="mb-2 md:mb-0">
                                                        <label className="md:hidden block text-xs font-semibold text-gray-500 mb-1">Images *</label>
                                                        <div className="flex flex-wrap gap-1.5 items-center">
                                                            {(variant.images || []).map((img, ii) => (
                                                                <div key={ii} className="relative group w-12 h-12 bg-gray-100 rounded overflow-hidden border border-gray-200 flex-shrink-0">
                                                                    <img src={getImageUrl(img.path)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover"
                                                                        onError={e => { e.target.src = '/placeholder.png'; }} />
                                                                    <button type="button" onClick={() => removeVariantImage(vi, ii, true)}
                                                                        className="absolute inset-0 bg-red-500/0 hover:bg-red-500/70 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 text-white text-sm font-bold">x</button>
                                                                </div>
                                                            ))}
                                                            {(variantImages[vi]?.previews || []).map((src, ii) => (
                                                                <div key={`new-${ii}`} className="relative group w-12 h-12 bg-gray-100 rounded overflow-hidden border-2 border-blue-400 flex-shrink-0">
                                                                    <img src={src} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                                                    <button type="button" onClick={() => removeVariantImage(vi, ii, false)}
                                                                        className="absolute inset-0 bg-red-500/0 hover:bg-red-500/70 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 text-white text-sm font-bold">x</button>
                                                                </div>
                                                            ))}
                                                            <label className="w-12 h-12 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 cursor-pointer transition-all flex-shrink-0">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                                </svg>
                                                                <input type="file" accept="image/*" multiple onChange={e => handleVariantImageChange(e, vi)} className="hidden" />
                                                            </label>
                                                        </div>
                                                    </div>
                                                    {/* Action */}
                                                    <div className="flex items-center justify-end md:justify-center">
                                                        <button type="button" onClick={() => removeVariant(vi)}
                                                            className="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 rounded-lg flex items-center justify-center transition-all"
                                                            title="Remove variant">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">
                                            Total stock: <strong>{generatedVariants.reduce((s, v) => s + (parseInt(v.stock) || 0), 0)}</strong> units
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* Submit */}
                <div className="flex items-center gap-4 justify-end bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <button type="button" onClick={() => navigate('/admin/products')}
                        className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold transition-all">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSaving}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                        {isSaving ? (
                            <>
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Saving...
                            </>
                        ) : (
                            <>{isEdit ? 'Update Product' : 'Create Product'}</>
                        )}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default ProductFormEnhanced;
