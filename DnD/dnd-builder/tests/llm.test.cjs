
require('dotenv').config();
const { getProvider } = require('../server/llm/LLMProvider.js');
async function run() {
  const provider = await getProvider();
  console.log('Provider loaded:', provider.name);
  console.log('Testing response 1...');
  const res1 = await provider.complete('You are a helpful assistant.', 'Say the word cheese!');
  console.log('Response 1:', res1);
  console.log('Testing response 2...');
  const res2 = await provider.complete('You are a helpful assistant.', 'What is 2+2?');
  console.log('Response 2:', res2);
  if (res1 === res2) {
    console.error('ERROR: Responses are identical!');
    process.exit(1);
  }
  console.log('Success! Responses varied.');
}
run().catch(console.error);

