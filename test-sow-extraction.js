// Test script for SOW extraction
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testSOWExtraction() {
  try {
    const fileContent = fs.readFileSync('test-sow.txt');
    
    const formData = new FormData();
    formData.append('file', fileContent, {
      filename: 'test-sow.txt',
      contentType: 'text/plain'
    });

    const response = await fetch('http://localhost:5000/api/projects/create-from-sow', {
      method: 'POST',
      body: formData,
      headers: {
        'Cookie': 'connect.sid=s%3A_-PjP1MU82u_Z3TBaOLz2YE8PfvCcN1L.kHvgGAUDiADZUON%2F1aehGQ1KCQvUxILiTb3zzxWbuCA',
        ...formData.getHeaders()
      }
    });

    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testSOWExtraction();