const http = require('http');

function testAPI(endpoint) {
    const options = {
        hostname: 'localhost',
        port: 5001,
        path: endpoint,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        status: res.statusCode,
                        data: jsonData
                    });
                } catch (error) {
                    resolve({
                        status: res.statusCode,
                        data: data
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

async function runTests() {
    console.log('🧪 Testing API endpoints...\n');

    try {
        // Test Products endpoint
        console.log('📦 Testing Products API...');
        const productsResult = await testAPI('/api/products?limit=3');
        console.log(`Status: ${productsResult.status}`);
        if (productsResult.data.success) {
            console.log(`Found ${productsResult.data.products.length} products`);
            console.log(`Total available: ${productsResult.data.total}`);
            console.log(`First product: ${productsResult.data.products[0]?.name || 'N/A'}`);
        } else {
            console.log('Response:', JSON.stringify(productsResult.data, null, 2));
        }
        console.log('');

        // Test Categories endpoint
        console.log('📂 Testing Categories API...');
        const categoriesResult = await testAPI('/api/categories');
        console.log(`Status: ${categoriesResult.status}`);
        if (categoriesResult.data.success) {
            console.log(`Found ${categoriesResult.data.categories.length} categories`);
            console.log(`First category: ${categoriesResult.data.categories[0]?.name || 'N/A'}`);
        } else {
            console.log('Response:', JSON.stringify(categoriesResult.data, null, 2));
        }
        console.log('');

        // Test Brands endpoint
        console.log('🏷️  Testing Brands API...');
        const brandsResult = await testAPI('/api/brands');
        console.log(`Status: ${brandsResult.status}`);
        if (brandsResult.data.success) {
            console.log(`Found ${brandsResult.data.brands.length} brands`);
            console.log(`First brand: ${brandsResult.data.brands[0]?.name || 'N/A'}`);
        } else {
            console.log('Response:', JSON.stringify(brandsResult.data, null, 2));
        }

        console.log('\n✅ API testing completed!');

    } catch (error) {
        console.error('❌ Error testing API:', error.message);
    }
}

runTests();