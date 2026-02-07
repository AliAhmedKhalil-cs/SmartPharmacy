// check-models.js
const API_KEY = "AIzaSyD-aIZhRFjjHMePxCyN_F0Jx6WNRoSVIXk"; // مفتاحك

async function listModels() {
    console.log("🔍 Checking available models for this key...");

    // نجرب الإصدار المستقر v1 بدلاً من beta
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("❌ API Error:", data.error.message);
        } else if (data.models) {
            console.log("✅ SUCCESS! Here are your available models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`   - ${m.name.replace('models/', '')}`);
                }
            });
        } else {
            console.log("⚠️ No models found. Is the 'Generative Language API' enabled in Google Cloud Console?");
        }
    } catch (e) {
        console.error("Connection Error:", e.message);
    }
}

listModels();