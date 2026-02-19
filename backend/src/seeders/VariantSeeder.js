import { logger } from '../utils/logger.js';
import { VariantType, VariantOption } from '../models/Supporting.models.js';

const TYPE_LIBRARY = [
    { name: 'color', displayName: 'Color' },
    { name: 'size', displayName: 'Size' },
    { name: 'material', displayName: 'Material' },
    { name: 'style', displayName: 'Style' },
    { name: 'fit', displayName: 'Fit' },
    { name: 'capacity', displayName: 'Capacity' },
    { name: 'length', displayName: 'Length' },
    { name: 'pattern', displayName: 'Pattern' },
    { name: 'flavor', displayName: 'Flavor' },
    { name: 'pack', displayName: 'Pack Size' },
];

const OPTION_LIBRARY = {
    color: [
        { value: 'black', displayValue: 'Black', hexColor: '#000000' },
        { value: 'white', displayValue: 'White', hexColor: '#FFFFFF' },
        { value: 'blue', displayValue: 'Blue', hexColor: '#1D4ED8' },
        { value: 'red', displayValue: 'Red', hexColor: '#DC2626' },
        { value: 'green', displayValue: 'Green', hexColor: '#059669' },
    ],
    size: [
        { value: 'xs', displayValue: 'XS' },
        { value: 's', displayValue: 'S' },
        { value: 'm', displayValue: 'M' },
        { value: 'l', displayValue: 'L' },
        { value: 'xl', displayValue: 'XL' },
    ],
    material: [
        { value: 'cotton', displayValue: 'Cotton' },
        { value: 'polyester', displayValue: 'Polyester' },
        { value: 'leather', displayValue: 'Leather' },
        { value: 'denim', displayValue: 'Denim' },
        { value: 'linen', displayValue: 'Linen' },
    ],
    style: [
        { value: 'casual', displayValue: 'Casual' },
        { value: 'formal', displayValue: 'Formal' },
        { value: 'sport', displayValue: 'Sport' },
        { value: 'vintage', displayValue: 'Vintage' },
        { value: 'minimal', displayValue: 'Minimal' },
    ],
    fit: [
        { value: 'slim', displayValue: 'Slim' },
        { value: 'regular', displayValue: 'Regular' },
        { value: 'relaxed', displayValue: 'Relaxed' },
        { value: 'oversized', displayValue: 'Oversized' },
        { value: 'tailored', displayValue: 'Tailored' },
    ],
    capacity: [
        { value: '250ml', displayValue: '250 ml' },
        { value: '500ml', displayValue: '500 ml' },
        { value: '1l', displayValue: '1 L' },
        { value: '2l', displayValue: '2 L' },
        { value: '5l', displayValue: '5 L' },
    ],
    length: [
        { value: 'short', displayValue: 'Short' },
        { value: 'regular', displayValue: 'Regular' },
        { value: 'long', displayValue: 'Long' },
        { value: 'maxi', displayValue: 'Maxi' },
        { value: 'cropped', displayValue: 'Cropped' },
    ],
    pattern: [
        { value: 'solid', displayValue: 'Solid' },
        { value: 'striped', displayValue: 'Striped' },
        { value: 'checked', displayValue: 'Checked' },
        { value: 'printed', displayValue: 'Printed' },
        { value: 'floral', displayValue: 'Floral' },
    ],
    flavor: [
        { value: 'vanilla', displayValue: 'Vanilla' },
        { value: 'chocolate', displayValue: 'Chocolate' },
        { value: 'strawberry', displayValue: 'Strawberry' },
        { value: 'mint', displayValue: 'Mint' },
        { value: 'mixed-fruit', displayValue: 'Mixed Fruit' },
    ],
    pack: [
        { value: 'single', displayValue: 'Single' },
        { value: 'pack-of-2', displayValue: 'Pack of 2' },
        { value: 'pack-of-4', displayValue: 'Pack of 4' },
        { value: 'pack-of-6', displayValue: 'Pack of 6' },
        { value: 'pack-of-12', displayValue: 'Pack of 12' },
    ],
};

export class VariantSeeder {
    async run(options = {}) {
        const {
            clearExisting = false,
            count = 10,
            optionsPerType = 5,
            activeRatio = 0.8,
        } = options;

        if (clearExisting) {
            await VariantOption.deleteMany({});
            await VariantType.deleteMany({});
        }

        const typeDocs = TYPE_LIBRARY.slice(0, Math.max(1, count)).map((item, index) => ({
            ...item,
            sortOrder: index,
            status: index < Math.floor(count * activeRatio) ? 'active' : 'inactive',
        }));

        const createdTypes = [];
        for (const doc of typeDocs) {
            const existing = await VariantType.findOne({ name: doc.name });
            if (existing) {
                createdTypes.push(existing);
                continue;
            }
            const created = await VariantType.create(doc);
            createdTypes.push(created);
        }

        let createdOptionsCount = 0;
        for (const [typeIndex, typeDoc] of createdTypes.entries()) {
            const library = OPTION_LIBRARY[typeDoc.name] || [];
            const optionDocs = library.slice(0, optionsPerType).map((option, index) => ({
                variantTypeId: typeDoc._id,
                value: option.value,
                displayValue: option.displayValue,
                hexColor: option.hexColor || null,
                sortOrder: index,
                status: typeIndex < Math.floor(createdTypes.length * activeRatio) ? 'active' : 'inactive',
            }));

            for (const optionDoc of optionDocs) {
                const exists = await VariantOption.findOne({
                    variantTypeId: optionDoc.variantTypeId,
                    value: optionDoc.value,
                });
                if (exists) continue;
                await VariantOption.create(optionDoc);
                createdOptionsCount += 1;
            }
        }

        logger.info(`Seeded variant types: ${createdTypes.length}, variant options added: ${createdOptionsCount}`);
    }
}

export const variantSeeder = new VariantSeeder();
