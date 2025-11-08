// Test script to check login API
const fetch = require('node-fetch');

async function testLogin() {
    console.log('=== TESTING LOGIN API ===');
    console.log('URL: http://10.123.210.139/school/lastchapter/api/auth/login.php');
    console.log('Email: maya@gmail.com');
    console.log('Password: Maya@123');
    console.log('');

    try {
        const response = await fetch('http://10.123.210.139/school/lastchapter/api/auth/login.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'maya@gmail.com',
                password: 'Maya@123'
            })
        });

        console.log('Response Status:', response.status);
        console.log('Response Headers:', Object.fromEntries(response.headers));
        
        const responseText = await response.text();
        console.log('Response Body:', responseText);
        
        try {
            const jsonData = JSON.parse(responseText);
            console.log('Parsed JSON:', JSON.stringify(jsonData, null, 2));
            
            if (jsonData.success) {
                console.log('✅ LOGIN SUCCESSFUL!');
                console.log('User Role:', jsonData.data?.role);
                console.log('User Name:', jsonData.data?.name);
                console.log('Session Token:', jsonData.data?.session_token ? 'Present' : 'Missing');
            } else {
                console.log('❌ LOGIN FAILED:', jsonData.message);
            }
        } catch (parseError) {
            console.log('❌ Failed to parse JSON response');
            console.log('Raw response:', responseText);
        }
        
    } catch (error) {
        console.log('❌ Network Error:', error.message);
        console.log('Error details:', error);
    }
}

testLogin();
