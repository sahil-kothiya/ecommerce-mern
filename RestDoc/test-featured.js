const http = require('http');

function testFeatured() {
    const options = {
        hostname: 'localhost',
        port: 5001,
        path: '/api/products/featured',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    };

    console.log('🔍 Testing FIXED Featured Products endpoint...\n');

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const jsonData = JSON.parse(data);
                console.log(`✅ Status: ${res.statusCode}`);
                console.log(`🎯 Success: ${jsonData.success}`);

                if (jsonData.success && jsonData.data && jsonData.data.products) {
                    console.log(`⭐ Found ${jsonData.data.products.length} featured products`);
                    console.log(`📊 Total featured: ${jsonData.data.pagination?.total}`);
                    if (jsonData.data.products.length > 0) {
                        console.log(`🏷️ First featured: "${jsonData.data.products[0].title}"`);
                    }
                } else {
                    console.log('📄 Response:', JSON.stringify(jsonData, null, 2));
                }
            } catch (error) {
                console.log(`❌ Parse error. Raw response: ${data}`);
            }
        });
    });

    req.on('error', (error) => {
        console.log(`❌ Request Error: ${error.message}`);
    });

    req.end();
}

testFeatured();