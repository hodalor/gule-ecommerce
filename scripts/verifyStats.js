(async () => {
  try {
    const base = 'http://localhost:8000/api';
    const loginBody = {
      email: 'admin@gule.com',
      password: 'SuperAdmin123!',
      userType: 'admin'
    };

    const loginResp = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginBody)
    });

    if (!loginResp.ok) {
      const text = await loginResp.text();
      throw new Error('Login failed: ' + loginResp.status + ' ' + text);
    }

    const loginJson = await loginResp.json();
    const token = loginJson.accessToken;
    if (!token) {
      throw new Error('No accessToken in login response');
    }

    const statsResp = await fetch(base + '/admin/system/statistics', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!statsResp.ok) {
      const text = await statsResp.text();
      throw new Error('Statistics fetch failed: ' + statsResp.status + ' ' + text);
    }

    const statsJson = await statsResp.json();
    const s = statsJson.statistics || {};
    const usersTotal = ((s.users?.buyers?.total || 0) + (s.users?.sellers?.total || 0));

    console.log('Token length:', token.length);
    console.log('Users total:', usersTotal);
    console.log('Products total:', s.products?.total || 0);
    console.log('Orders total:', s.orders?.totalOrders || 0);
    console.log('Average order value:', s.orders?.averageOrderValue || 0);
    console.log('Recent new buyers:', s.recentActivity?.newBuyers || 0);
  } catch (err) {
    console.error('Verification error:', err.message);
    process.exitCode = 1;
  }
})();