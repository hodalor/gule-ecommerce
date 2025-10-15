const bcrypt = require('bcryptjs');

async function testHashGeneration() {
  const password = 'Password123!';
  
  console.log('Original password:', password);
  console.log('Password length:', password.length);
  console.log('Password bytes:', Buffer.from(password, 'utf8'));
  
  // Test with different salt rounds
  for (let saltRounds = 10; saltRounds <= 12; saltRounds++) {
    console.log(`\n--- Testing with salt rounds: ${saltRounds} ---`);
    
    const hash1 = await bcrypt.hash(password, saltRounds);
    const hash2 = await bcrypt.hash(password, saltRounds);
    
    console.log('Hash 1:', hash1);
    console.log('Hash 2:', hash2);
    
    console.log('Hash 1 comparison:', await bcrypt.compare(password, hash1));
    console.log('Hash 2 comparison:', await bcrypt.compare(password, hash2));
  }
  
  // Test the stored hash from database
  const storedHash = '$2b$12$3xKotnc4o7RFwugTr7aH.um/AaO7P6lVu6bwI60udl7gU/CmKykku';
  console.log('\n--- Testing stored hash ---');
  console.log('Stored hash:', storedHash);
  console.log('Stored hash comparison:', await bcrypt.compare(password, storedHash));
  
  // Test with different password variations
  const variations = [
    'Password123!',
    'password123!',
    'PASSWORD123!',
    'Password123',
    'Password123! ',
    ' Password123!'
  ];
  
  console.log('\n--- Testing password variations ---');
  for (const variation of variations) {
    const result = await bcrypt.compare(variation, storedHash);
    console.log(`"${variation}" -> ${result}`);
  }
}

testHashGeneration().catch(console.error);