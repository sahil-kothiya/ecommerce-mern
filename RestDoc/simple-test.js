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
        console.log(`📡 URL: http://localhost:5001${path}`);

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    console.log(`✅ Status: ${res.statusCode}`);
                    console.log(`📄 Response:`, JSON.stringify(jsonData, null, 2));
                    resolve({ success: true, status: res.statusCode, data: jsonData });
                } catch (error) {
                    console.log(`✅ Status: ${res.statusCode}`);
                    console.log(`📄 Raw response:`, data);
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

async function testAPI() {
    console.log('🚀 Starting API Tests\n');

    // Test 1: Root endpoint
    console.log('='.repeat(50));
    await makeRequest('/', 'Root API endpoint');

    console.log('\n' + '='.repeat(50));
    await makeRequest('/health', 'Health check endpoint');

    console.log('\n' + '='.repeat(50));
    await makeRequest('/api/products?limit=1', 'Products endpoint with limit=1');

    console.log('\n🎯 API Tests completed!\n');
}

testAPI();