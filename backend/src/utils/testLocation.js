const fetch = require('node-fetch');

async function testLocation() {
  const data = {
    businessName: "Test Shop",
    ownerName: "Test Owner",
    mobile: "9876543219",
    password: "Test@1234",
    confirmPassword: "Test@1234",
    category: "everyday",
    city: "Ludhiana",
    latitude: 30.9010,
    longitude: 75.8573
  };

  try {
    const response = await fetch('http://127.0.0.1:5000/api/auth/merchant-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLocation();