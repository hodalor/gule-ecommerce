const bcrypt = require('bcryptjs');

console.log('Testing password hashing:');
const password = 'Password123!';
console.log('Original password:', password);
console.log('Password length:', password.length);
console.log('Password bytes:', Buffer.from(password).toString('hex'));

bcrypt.hash(password, 12).then(hash => {
  console.log('Generated hash:', hash);
  bcrypt.compare(password, hash).then(result => {
    console.log('Self comparison:', result);
    
    // Test with the stored hash from database
    const storedHash = '$2b$12$uLSw0uYV91vXLm1oDHgHhu73ckU5CyXmuHo8w18GnWaBywWtxE8PW';
    bcrypt.compare(password, storedHash).then(dbResult => {
      console.log('Database hash comparison:', dbResult);
    });
  });
});