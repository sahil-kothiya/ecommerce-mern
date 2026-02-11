const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/products?limit=2',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};

console.log('🧪 Testing API: GET /api/products?limit=2');
console.log('Server URL: http://localhost:5001');
console.log('');

const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
    console.log('');

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response Body:');
        try {
            const jsonData = JSON.parse(data);
            console.log(JSON.stringify(jsonData, null, 2));

            if (jsonData.success) {
                console.log('\n✅ API Test PASSED!');
                console.log(`🎉 Found ${jsonData.products ? jsonData.products.length : 0} products`);
                console.log(`📊 Total products available: ${jsonData.total || 'N/A'}`);
                if (jsonData.products && jsonData.products[0]) {
                    console.log(`📦 First product: "${jsonData.products[0].name}"`);
                }
            } else {
                console.log('\n❌ API Test FAILED - No success flag');
            }
        } catch (error) {
            console.log('Raw response:', data);
            console.log('\n❌ API Test FAILED - Invalid JSON response');
        }
    });
});

req.on('error', (error) => {
    console.error(`❌ Request Error: ${error.message}`);
    console.log('Make sure the server is running on port 5001');
});

req.setTimeout(5000, () => {
    console.log('❌ Request timeout - server may not be responding');
    req.destroy();
});

req.end();