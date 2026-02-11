import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { Brand } from '../models/Brand.js';
import { Product } from '../models/Product.js';
import { VariantType, VariantOption } from '../models/Supporting.models.js';

export class CategoryBrandVariantBaseSeeder {
    constructor() {
        this.categoryCount = 0;
        this.brandCount = 0;
        this.variantTypeCount = 0;
        this.variantOptionCount = 0;
    }

    async run() {
        console.log('🌱 Starting Category, Brand & Variant Base Seeding...\n');

        try {
            // Clear existing data
            await this.clearExistingData();

            // Create variant types and options first
            await this.createVariantTypes();

            // Create brands
            await this.createBrands();

            // Create categories with tree structure
            await this.createCategories();

            // Associate brands with categories
            await this.associateBrandsWithCategories();

            console.log('\n✅ Category, Brand & Variant Base Seeding completed!');
            console.log(`📊 Summary:`);
            console.log(`   - Categories: ${this.categoryCount}`);
            console.log(`   - Brands: ${this.brandCount}`);
            console.log(`   - Variant Types: ${this.variantTypeCount}`);
            console.log(`   - Variant Options: ${this.variantOptionCount}\n`);

        } catch (error) {
            console.error('❌ Seeding failed:', error);
            throw error;
        }
    }

    async clearExistingData() {
        console.log('🧹 Clearing existing data...');

        await Promise.all([
            Category.deleteMany({}),
            Brand.deleteMany({}),
            VariantType.deleteMany({}),
            VariantOption.deleteMany({})
        ]);

        console.log('✅ Existing data cleared');
    }

    async createVariantTypes() {
        console.log('🎨 Creating variant types and options...');

        const variantTypesData = [
            {
                name: 'color',
                displayName: 'Color',
                sortOrder: 1,
                options: [
                    { value: 'red', displayValue: 'Red', hexColor: '#FF0000', sortOrder: 1 },
                    { value: 'blue', displayValue: 'Blue', hexColor: '#0000FF', sortOrder: 2 },
                    { value: 'green', displayValue: 'Green', hexColor: '#00FF00', sortOrder: 3 },
                    { value: 'black', displayValue: 'Black', hexColor: '#000000', sortOrder: 4 },
                    { value: 'white', displayValue: 'White', hexColor: '#FFFFFF', sortOrder: 5 },
                    { value: 'gray', displayValue: 'Gray', hexColor: '#808080', sortOrder: 6 },
                    { value: 'navy', displayValue: 'Navy', hexColor: '#000080', sortOrder: 7 },
                    { value: 'brown', displayValue: 'Brown', hexColor: '#8B4513', sortOrder: 8 },
                    { value: 'pink', displayValue: 'Pink', hexColor: '#FFC0CB', sortOrder: 9 },
                    { value: 'purple', displayValue: 'Purple', hexColor: '#800080', sortOrder: 10 },
                    { value: 'yellow', displayValue: 'Yellow', hexColor: '#FFFF00', sortOrder: 11 },
                    { value: 'orange', displayValue: 'Orange', hexColor: '#FFA500', sortOrder: 12 }
                ]
            },
            {
                name: 'size',
                displayName: 'Size',
                sortOrder: 2,
                options: [
                    { value: 'xs', displayValue: 'XS', sortOrder: 1 },
                    { value: 's', displayValue: 'S', sortOrder: 2 },
                    { value: 'm', displayValue: 'M', sortOrder: 3 },
                    { value: 'l', displayValue: 'L', sortOrder: 4 },
                    { value: 'xl', displayValue: 'XL', sortOrder: 5 },
                    { value: '2xl', displayValue: '2XL', sortOrder: 6 },
                    { value: '3xl', displayValue: '3XL', sortOrder: 7 }
                ]
            },
            {
                name: 'material',
                displayName: 'Material',
                sortOrder: 3,
                options: [
                    { value: 'cotton', displayValue: 'Cotton', sortOrder: 1 },
                    { value: 'polyester', displayValue: 'Polyester', sortOrder: 2 },
                    { value: 'wool', displayValue: 'Wool', sortOrder: 3 },
                    { value: 'silk', displayValue: 'Silk', sortOrder: 4 },
                    { value: 'leather', displayValue: 'Leather', sortOrder: 5 },
                    { value: 'denim', displayValue: 'Denim', sortOrder: 6 },
                    { value: 'linen', displayValue: 'Linen', sortOrder: 7 },
                    { value: 'cashmere', displayValue: 'Cashmere', sortOrder: 8 }
                ]
            },
            {
                name: 'style',
                displayName: 'Style',
                sortOrder: 4,
                options: [
                    { value: 'casual', displayValue: 'Casual', sortOrder: 1 },
                    { value: 'formal', displayValue: 'Formal', sortOrder: 2 },
                    { value: 'sport', displayValue: 'Sport', sortOrder: 3 },
                    { value: 'business', displayValue: 'Business', sortOrder: 4 },
                    { value: 'evening', displayValue: 'Evening', sortOrder: 5 }
                ]
            }
        ];

        for (const variantTypeData of variantTypesData) {
            const { options, ...typeData } = variantTypeData;

            const variantType = new VariantType(typeData);
            await variantType.save();
            this.variantTypeCount++;

            // Create options for this type
            for (const optionData of options) {
                const variantOption = new VariantOption({
                    ...optionData,
                    variantTypeId: variantType._id
                });
                await variantOption.save();
                this.variantOptionCount++;
            }
        }

        console.log(`✅ Created ${this.variantTypeCount} variant types with ${this.variantOptionCount} options`);
    }

    async createBrands() {
        console.log('🏷️  Creating brands...');

        const brandsData = [
            // Fashion Brands
            { title: 'Nike', description: 'Athletic wear and sportswear', status: 'active' },
            { title: 'Adidas', description: 'Sports clothing and accessories', status: 'active' },
            { title: 'Zara', description: 'Fashion retail clothing', status: 'active' },
            { title: 'H&M', description: 'Fast fashion clothing', status: 'active' },
            { title: 'Gucci', description: 'Luxury fashion brand', status: 'active' },
            { title: 'Prada', description: 'Italian luxury fashion', status: 'active' },
            { title: 'Louis Vuitton', description: 'French luxury fashion house', status: 'active' },

            // Electronics Brands
            { title: 'Apple', description: 'Consumer electronics and software', status: 'active' },
            { title: 'Samsung', description: 'Electronics and appliances', status: 'active' },
            { title: 'Sony', description: 'Electronics and entertainment', status: 'active' },
            { title: 'LG', description: 'Home appliances and electronics', status: 'active' },
            { title: 'HP', description: 'Computer hardware and software', status: 'active' },
            { title: 'Dell', description: 'Computer technology solutions', status: 'active' },
            { title: 'Microsoft', description: 'Software and hardware products', status: 'active' },

            // Home & Garden Brands
            { title: 'IKEA', description: 'Furniture and home accessories', status: 'active' },
            { title: 'Home Depot', description: 'Home improvement retail', status: 'active' },
            { title: 'Wayfair', description: 'Online furniture and home goods', status: 'active' },
            { title: 'West Elm', description: 'Modern furniture and home decor', status: 'active' },

            // Beauty & Personal Care
            { title: 'L\'Oreal', description: 'Cosmetics and beauty products', status: 'active' },
            { title: 'MAC Cosmetics', description: 'Professional makeup and cosmetics', status: 'active' },
            { title: 'Sephora', description: 'Beauty retailer and cosmetics', status: 'active' },
            { title: 'Clinique', description: 'Skincare and cosmetics', status: 'active' },

            // Sports & Outdoor
            { title: 'Under Armour', description: 'Athletic clothing and accessories', status: 'active' },
            { title: 'The North Face', description: 'Outdoor recreation products', status: 'active' },
            { title: 'Patagonia', description: 'Outdoor clothing and gear', status: 'active' },
            { title: 'REI', description: 'Outdoor gear and sporting goods', status: 'active' }
        ]; for (const brandData of brandsData) {
            const brand = new Brand(brandData);
            await brand.save();
            this.brandCount++;
        }

        console.log(`✅ Created ${this.brandCount} brands`);
    }

    async createCategories() {
        console.log('📂 Creating category tree structure...');

        // Root categories
        const rootCategories = [
            {
                title: 'Electronics',
                summary: 'Electronic devices and gadgets',
                status: 'active',
                children: [
                    {
                        title: 'Computers & Laptops',
                        summary: 'Desktop computers, laptops, and accessories',
                        children: [
                            { title: 'Desktop Computers', summary: 'Desktop PCs and workstations' },
                            { title: 'Laptops', summary: 'Portable computers and notebooks' },
                            { title: 'Computer Accessories', summary: 'Keyboards, mice, monitors, and more' },
                            { title: 'Components', summary: 'PC parts and components' }
                        ]
                    },
                    {
                        title: 'Mobile Devices',
                        summary: 'Smartphones, tablets, and mobile accessories',
                        children: [
                            { title: 'Smartphones', summary: 'Mobile phones and accessories' },
                            { title: 'Tablets', summary: 'iPad, Android tablets, and accessories' },
                            { title: 'Smart Watches', summary: 'Wearable technology and fitness trackers' },
                            { title: 'Mobile Accessories', summary: 'Cases, chargers, and mobile accessories' }
                        ]
                    },
                    {
                        title: 'Audio & Video',
                        summary: 'Sound systems, headphones, and entertainment',
                        children: [
                            { title: 'Headphones & Earbuds', summary: 'Audio devices and accessories' },
                            { title: 'Speakers', summary: 'Bluetooth speakers and sound systems' },
                            { title: 'Gaming', summary: 'Video games, consoles, and gaming accessories' },
                            { title: 'TV & Home Theater', summary: 'Televisions and home entertainment' }
                        ]
                    }
                ]
            },
            {
                title: 'Fashion & Apparel',
                summary: 'Clothing, shoes, and fashion accessories',
                status: 'active',
                children: [
                    {
                        title: 'Men\'s Clothing',
                        summary: 'Men\'s fashion and apparel',
                        children: [
                            { title: 'Shirts & T-Shirts', summary: 'Casual and dress shirts for men' },
                            { title: 'Pants & Jeans', summary: 'Trousers, jeans, and casual pants' },
                            { title: 'Jackets & Coats', summary: 'Outerwear and jackets' },
                            { title: 'Suits & Blazers', summary: 'Formal wear and business attire' },
                            { title: 'Underwear & Sleepwear', summary: 'Undergarments and pajamas' }
                        ]
                    },
                    {
                        title: 'Women\'s Clothing',
                        summary: 'Women\'s fashion and apparel',
                        children: [
                            { title: 'Dresses', summary: 'Casual and formal dresses' },
                            { title: 'Tops & Blouses', summary: 'Shirts, blouses, and tops' },
                            { title: 'Pants & Leggings', summary: 'Trousers, jeans, and leggings' },
                            { title: 'Skirts', summary: 'Mini, midi, and maxi skirts' },
                            { title: 'Jackets & Blazers', summary: 'Women\'s outerwear' },
                            { title: 'Lingerie & Sleepwear', summary: 'Intimate apparel and pajamas' }
                        ]
                    },
                    {
                        title: 'Shoes & Footwear',
                        summary: 'Shoes for all occasions',
                        children: [
                            { title: 'Men\'s Shoes', summary: 'Dress shoes, sneakers, and boots for men' },
                            { title: 'Women\'s Shoes', summary: 'Heels, flats, sneakers, and boots for women' },
                            { title: 'Athletic Shoes', summary: 'Sports and running shoes' },
                            { title: 'Boots', summary: 'Casual and formal boots' }
                        ]
                    },
                    {
                        title: 'Accessories',
                        summary: 'Fashion accessories and jewelry',
                        children: [
                            { title: 'Bags & Handbags', summary: 'Purses, backpacks, and luggage' },
                            { title: 'Jewelry', summary: 'Necklaces, rings, and watches' },
                            { title: 'Hats & Caps', summary: 'Headwear and accessories' },
                            { title: 'Belts & Wallets', summary: 'Leather goods and accessories' }
                        ]
                    }
                ]
            },
            {
                title: 'Home & Garden',
                summary: 'Home improvement, furniture, and garden supplies',
                status: 'active',
                children: [
                    {
                        title: 'Furniture',
                        summary: 'Indoor and outdoor furniture',
                        children: [
                            { title: 'Living Room', summary: 'Sofas, chairs, and coffee tables' },
                            { title: 'Bedroom', summary: 'Beds, dressers, and nightstands' },
                            { title: 'Dining Room', summary: 'Dining tables, chairs, and storage' },
                            { title: 'Office Furniture', summary: 'Desks, chairs, and office storage' },
                            { title: 'Outdoor Furniture', summary: 'Patio and garden furniture' }
                        ]
                    },
                    {
                        title: 'Home Decor',
                        summary: 'Decorative items and home accessories',
                        children: [
                            { title: 'Wall Art', summary: 'Paintings, prints, and wall decorations' },
                            { title: 'Lighting', summary: 'Lamps, fixtures, and lighting accessories' },
                            { title: 'Rugs & Carpets', summary: 'Floor coverings and area rugs' },
                            { title: 'Curtains & Blinds', summary: 'Window treatments and accessories' }
                        ]
                    },
                    {
                        title: 'Kitchen & Dining',
                        summary: 'Kitchenware and dining essentials',
                        children: [
                            { title: 'Cookware', summary: 'Pots, pans, and cooking utensils' },
                            { title: 'Small Appliances', summary: 'Blenders, toasters, and kitchen gadgets' },
                            { title: 'Dinnerware', summary: 'Plates, bowls, and serving pieces' },
                            { title: 'Kitchen Storage', summary: 'Containers and organization solutions' }
                        ]
                    }
                ]
            },
            {
                title: 'Beauty & Personal Care',
                summary: 'Cosmetics, skincare, and personal care products',
                status: 'active',
                children: [
                    {
                        title: 'Makeup',
                        summary: 'Cosmetics and beauty products',
                        children: [
                            { title: 'Face Makeup', summary: 'Foundation, concealer, and face products' },
                            { title: 'Eye Makeup', summary: 'Eyeshadow, mascara, and eye products' },
                            { title: 'Lip Makeup', summary: 'Lipstick, lip gloss, and lip care' },
                            { title: 'Makeup Tools', summary: 'Brushes, sponges, and beauty tools' }
                        ]
                    },
                    {
                        title: 'Skincare',
                        summary: 'Face and body skincare products',
                        children: [
                            { title: 'Cleansers', summary: 'Face wash and cleansing products' },
                            { title: 'Moisturizers', summary: 'Face and body lotions and creams' },
                            { title: 'Serums & Treatments', summary: 'Anti-aging and targeted skincare' },
                            { title: 'Sunscreen', summary: 'UV protection and sun care products' }
                        ]
                    },
                    {
                        title: 'Hair Care',
                        summary: 'Shampoo, styling, and hair treatments',
                        children: [
                            { title: 'Shampoo & Conditioner', summary: 'Hair cleansing and conditioning' },
                            { title: 'Hair Styling', summary: 'Styling products and tools' },
                            { title: 'Hair Treatments', summary: 'Deep conditioning and repair treatments' }
                        ]
                    }
                ]
            },
            {
                title: 'Sports & Outdoors',
                summary: 'Athletic gear, outdoor equipment, and fitness products',
                status: 'active',
                children: [
                    {
                        title: 'Athletic Wear',
                        summary: 'Sportswear and activewear',
                        children: [
                            { title: 'Men\'s Activewear', summary: 'Athletic clothing for men' },
                            { title: 'Women\'s Activewear', summary: 'Athletic clothing for women' },
                            { title: 'Sports Shoes', summary: 'Athletic and running shoes' },
                            { title: 'Sports Accessories', summary: 'Athletic gear and accessories' }
                        ]
                    },
                    {
                        title: 'Outdoor Recreation',
                        summary: 'Camping, hiking, and outdoor gear',
                        children: [
                            { title: 'Camping Gear', summary: 'Tents, sleeping bags, and camping equipment' },
                            { title: 'Hiking & Backpacking', summary: 'Hiking gear and outdoor equipment' },
                            { title: 'Water Sports', summary: 'Swimming, surfing, and water activities' }
                        ]
                    },
                    {
                        title: 'Fitness Equipment',
                        summary: 'Home gym and fitness accessories',
                        children: [
                            { title: 'Cardio Equipment', summary: 'Treadmills, bikes, and cardio machines' },
                            { title: 'Strength Training', summary: 'Weights, resistance, and strength equipment' },
                            { title: 'Yoga & Pilates', summary: 'Mats, blocks, and yoga accessories' }
                        ]
                    }
                ]
            }
        ];

        // Create categories recursively
        for (const rootCategoryData of rootCategories) {
            await this.createCategoryTree(rootCategoryData, null, 0);
        }

        console.log(`✅ Created ${this.categoryCount} categories`);
    }

    async createCategoryTree(categoryData, parent = null, level = 0) {
        const { children, ...categoryInfo } = categoryData;

        // Get next position for this level
        const position = await Category.getNextPosition(parent?._id || null);

        const category = new Category({
            ...categoryInfo,
            parentId: parent?._id || null,
            level,
            sortOrder: position,
            isNavigationVisible: level <= 2 // Show in navigation for first 3 levels
        });

        await category.save();
        this.categoryCount++;

        // Create children if they exist
        if (children && children.length > 0) {
            for (const childData of children) {
                await this.createCategoryTree(childData, category, level + 1);
            }
        }

        return category;
    }

    async associateBrandsWithCategories() {
        console.log('🔗 Associating brands with categories...');

        // Get all brands and categories
        const brands = await Brand.find({ status: 'active' });
        const categories = await Category.find({ status: 'active' });

        // Brand-category associations
        const associations = {
            'Electronics': ['Apple', 'Samsung', 'Sony', 'LG', 'HP', 'Dell', 'Microsoft'],
            'Fashion & Apparel': ['Nike', 'Adidas', 'Zara', 'H&M', 'Gucci', 'Prada', 'Louis Vuitton', 'Under Armour'],
            'Home & Garden': ['IKEA', 'Home Depot', 'Wayfair', 'West Elm'],
            'Beauty & Personal Care': ['L\'Oreal', 'MAC Cosmetics', 'Sephora', 'Clinique'],
            'Sports & Outdoors': ['Nike', 'Adidas', 'Under Armour', 'The North Face', 'Patagonia', 'REI']
        };

        for (const [categoryTitle, brandNames] of Object.entries(associations)) {
            const category = categories.find(c => c.title === categoryTitle);
            if (!category) continue;

            const categoryBrands = brands.filter(b => brandNames.includes(b.title));

            category.brands = categoryBrands.map(brand => ({
                id: brand._id,
                title: brand.title,
                slug: brand.slug
            }));

            await category.save();
        }

        console.log('✅ Brand-category associations completed');
    }
}

export const categoryBrandVariantBaseSeeder = new CategoryBrandVariantBaseSeeder();