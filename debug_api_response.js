// Debug script to see exactly what the API returns
const https = require('https');
const http = require('http');

async function debugApiResponse() {
    console.log('=== DEBUGGING API RESPONSE ===');
    console.log('URL: http://10.123.210.139/school/lastchapter/api/auth/login.php');
    console.log('');

    const postData = JSON.stringify({
        email: 'maya@gmail.com',
        password: 'Maya@123'
    });

    const options = {
        hostname: '10.123.210.139',
        port: 80,
        path: '/school/lastchapter/api/auth/login.php',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            console.log('Status Code:', res.statusCode);
            console.log('Headers:', res.headers);
            console.log('');

            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log('=== RAW RESPONSE ===');
                console.log('Length:', data.length);
                console.log('First 500 characters:');
                console.log(data.substring(0, 500));
                console.log('');
                console.log('=== FULL RESPONSE ===');
                console.log(data);
                console.log('');
                
                // Try to identify the issue
                if (data.startsWith('<!DOCTYPE') || data.startsWith('<html')) {
                    console.log('❌ ISSUE: Server returned HTML instead of JSON');
                } else if (data.startsWith('Connection error:')) {
                    console.log('❌ ISSUE: Database connection error');
                } else if (data.includes('Fatal error:')) {
                    console.log('❌ ISSUE: PHP Fatal error');
                } else if (data.includes('Warning:')) {
                    console.log('❌ ISSUE: PHP Warning');
                } else {
                    console.log('✅ Response looks like it might be JSON');
                    try {
                        const parsed = JSON.parse(data);
                        console.log('✅ JSON Parse successful:', parsed);
                    } catch (e) {
                        console.log('❌ JSON Parse failed:', e.message);
                        console.log('Character codes of first 20 chars:');
                        for (let i = 0; i < Math.min(20, data.length); i++) {
                            console.log(`${i}: '${data[i]}' (${data.charCodeAt(i)})`);
                        }
                    }
                }
                
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error('Request error:', e);
            reject(e);
        });

        req.setTimeout(30000, () => {
            console.log('Request timed out');
            req.destroy();
            reject(new Error('Timeout'));
        });

        req.write(postData);
        req.end();
    });
}

debugApiResponse().catch(console.error);
