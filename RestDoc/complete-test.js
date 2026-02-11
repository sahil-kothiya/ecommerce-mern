const http = require('http');

function makeRequest(path, description) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 5001,
            path: path,
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        };

        console.log(`🔍 Testing: ${description}`);

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    console.log(`✅ Status: ${res.statusCode} | Success: ${jsonData.success}`);

                    if (jsonData.success && jsonData.data) {
                        if (jsonData.data.categories) {
                            console.log(`📂 Found ${jsonData.data.categories.length} categories`);
                        } else if (jsonData.data.brands) {
                            console.log(`🏷️ Found ${jsonData.data.brands.length} brands`);
                        } else if (jsonData.data.products) {
                            console.log(`📦 Found ${jsonData.data.products.length} products | Total: ${jsonData.data.pagination?.total}`);
                        }
                    }

                    resolve({ success: true, status: res.statusCode, data: jsonData });
                } catch (error) {
                    console.log(`✅ Status: ${res.statusCode} | Raw response length: ${data.length}`);
                    resolve({ success: false, status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (error) => {
            console.log(`❌ Error: ${error.message}`);
            resolve({ success: false, error: error.message });
        });

        req.setTimeout(3000, () => {
            req.destroy();
            console.log('⏰ Request timeout');
            resolve({ success: false, error: 'Timeout' });
        });

        req.end();
    });
}

async function completeAPITest() {
    console.log('🎯 Complete API Verification\n');

    console.log('='.repeat(60));
    await makeRequest('/api/products?limit=3', 'Products with limit=3');

    console.log('\n' + '='.repeat(60));
    await makeRequest('/api/categories', 'All Categories');

    console.log('\n' + '='.repeat(60));
    await makeRequest('/api/brands', 'All Brands');

    console.log('\n' + '='.repeat(60));
    await makeRequest('/api/products/search?q=prada&limit=2', 'Product Search for "prada"');

    console.log('\n' + '='.repeat(60));
    await makeRequest('/api/products/featured', 'Featured Products');

    console.log('\n🎉 Complete API verification finished!\n');
}

completeAPITest();