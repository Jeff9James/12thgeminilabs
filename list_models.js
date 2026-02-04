
const fetch = require('node-fetch');
const fs = require('fs');

async function listModels() {
    const apiKey = "AIzaSyAOA7A5gUTb1wsY7WeEB1kHcD-0m3yTOok";
    const versions = ['v1beta', 'v1alpha'];
    const results = {};

    for (const v of versions) {
        try {
            const url = `https://generativelanguage.googleapis.com/${v}/models?key=${apiKey}`;
            const response = await fetch(url);
            const data = await response.json();
            results[v] = data.models || data;
        } catch (e) {
            results[v] = { error: e.message };
        }
    }

    fs.writeFileSync('full_model_list.json', JSON.stringify(results, null, 2));
    console.log("Full model list saved to full_model_list.json");
}

listModels();
