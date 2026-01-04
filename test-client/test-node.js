/**
 * Node.js Test Client for Eclair AI Backend
 * 
 * This script tests the AI chat endpoint with streaming support.
 * Run with: node test-node.js
 */

const https = require('https');

const API_BASE_URL = 'https://eclair-b7zo.vercel.app';

/**
 * Send a message to the AI and stream the response
 */
async function chatWithAI(prompt) {
    console.log('\n🚀 Eclair AI Test Client');
    console.log('━'.repeat(60));
    console.log(`📤 Sending: "${prompt}"`);
    console.log('━'.repeat(60));
    console.log('\n💬 AI Response (streaming):\n');

    const data = JSON.stringify({
        prompt: prompt,
        temperature: 0.7,
        max_tokens: 2048
    });

    const url = new URL('/api/ai/chat', API_BASE_URL);

    const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let fullResponse = '';

            res.on('data', (chunk) => {
                const text = chunk.toString();
                const lines = text.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonData = JSON.parse(line.slice(6));

                            // Stream content as it arrives
                            if (jsonData.content) {
                                process.stdout.write(jsonData.content);
                                fullResponse += jsonData.content;
                            }

                            // Final response
                            if (jsonData.finished) {
                                console.log('\n\n━'.repeat(60));
                                console.log('✅ Response completed!');
                                console.log('━'.repeat(60));
                                resolve(jsonData.fullResponse || fullResponse);
                            }

                            // Error handling
                            if (jsonData.error) {
                                reject(new Error(jsonData.message || 'AI service error'));
                            }
                        } catch (parseError) {
                            // Ignore parsing errors for incomplete chunks
                        }
                    }
                }
            });

            res.on('end', () => {
                if (!fullResponse) {
                    reject(new Error('No response received'));
                }
            });
        });

        req.on('error', (error) => {
            console.error('\n❌ Request failed:', error.message);
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

/**
 * Test backend health
 */
async function testHealth() {
    return new Promise((resolve, reject) => {
        https.get(`${API_BASE_URL}/`, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

/**
 * Main execution
 */
async function main() {
    try {
        // Test backend health first
        console.log('\n🏥 Testing backend health...');
        const health = await testHealth();
        console.log(`✅ Backend is online!`);
        console.log(`   Status: ${health.status}`);
        console.log(`   Message: ${health.message}`);
        console.log(`   Timestamp: ${health.timestamp}`);

        // Get prompt from command line or use default
        const prompt = process.argv[2] || 'Tell me a fun fact about AI in one sentence.';

        // Chat with AI
        await chatWithAI(prompt);

        console.log('\n✨ Test completed successfully!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\nPlease check:');
        console.error('1. Your Vercel deployment is running');
        console.error('2. The API URL is correct');
        console.error('3. Your internet connection\n');
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    main();
}

module.exports = { chatWithAI, testHealth };
