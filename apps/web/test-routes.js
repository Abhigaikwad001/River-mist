const http = require('http');

const routes = [
  '/',
  '/about',
  '/contact',
  '/food',
  '/gallery',
  '/hurda',
  '/packages',
  '/policies',
  '/auth/login',
  '/auth/register',
  '/booking',
  '/booking/success',
  '/profile',
  '/weddings',
  '/weddings/quote',
  '/events',
  '/explore',
  '/explore/adventure',
  '/explore/aqua',
  '/explore/farm',
  '/explore/riverside',
  '/admin',
  '/admin/activities',
  '/admin/bookings',
  '/admin/calendar',
  '/admin/capacity',
  '/admin/customers',
  '/admin/events',
  '/admin/food',
  '/admin/media',
  '/admin/packages',
  '/admin/payments',
  '/admin/quotes',
  '/admin/resources',
  '/admin/revenue',
  '/admin/settings',
  '/admin/users',
  '/admin/weddings'
];

async function checkRoute(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      resolve({ path, status: res.statusCode });
    });

    req.on('error', (e) => {
      resolve({ path, status: 'ERROR', error: e.message });
    });

    req.end();
  });
}

async function run() {
  console.log('Testing 38 routes on http://localhost:3000...\n');
  let passed = 0;
  let failed = 0;

  for (const route of routes) {
    const result = await checkRoute(route);
    if (result.status === 200 || result.status === 307 || result.status === 308) {
       console.log(`[PASS] ${route} -> HTTP ${result.status}`);
       passed++;
    } else {
       console.error(`[FAIL] ${route} -> HTTP ${result.status}`);
       failed++;
    }
  }

  console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
}

run();
