const bcrypt = require('bcrypt');

async function generateHash() {
    const password = 'qww';

    const hash = await bcrypt.hash(password, 10);

    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('Hash Length:', hash.length);
}

generateHash();