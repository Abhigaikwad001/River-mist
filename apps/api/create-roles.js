const jwt = require('jsonwebtoken');

const JWT_SECRET = 'super-secret-jwt-key-for-local-dev-only';
const superAdminToken = jwt.sign({ sub: 1, email: 'admin@rivermist.com' }, JWT_SECRET, { expiresIn: '1h' });

const roles = ['BOOKING_MANAGER', 'EVENT_MANAGER', 'FINANCE_MANAGER', 'CONTENT_MANAGER'];

async function run() {
  const fetch = (await import('node-fetch')).default || global.fetch;

  for (const role of roles) {
    const email = role.toLowerCase() + '@test.com';
    const name = role + ' User';
    
    console.log('Registering', email);
    const regRes = await fetch('http://localhost:3001/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password', name })
    });
    const regData = await regRes.json();
    console.log(regData);

    const userId = regData.user?.id || regData.id;
    if (!userId) {
       console.log('Failed to get user ID for', email, regData);
       continue;
    }

    console.log('Upgrading', email, 'to', role);
    const patchRes = await fetch('http://localhost:3001/users/' + userId + '/role', {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + superAdminToken
      },
      body: JSON.stringify({ role })
    });
    
    console.log('Update Status:', patchRes.status);
    const patchData = await patchRes.json();
    console.log(patchData);
  }
}

run();
