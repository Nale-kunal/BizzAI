import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

/**
 * k6 Load Test: 500 Concurrent Users
 * 
 * High-load scenario simulating 500 concurrent users
 */

const errorRate = new Rate('errors');

export const options = {
    stages: [
        { duration: '3m', target: 500 },  // Ramp up to 500 users over 3 minutes
        { duration: '10m', target: 500 }, // Stay at 500 users for 10 minutes
        { duration: '3m', target: 0 },    // Ramp down to 0 users
    ],
    thresholds: {
        http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1s
        http_req_failed: ['rate<0.02'],    // Error rate should be less than 2%
        errors: ['rate<0.10'],             // Custom error rate should be less than 10%
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

const users = Array.from({ length: 10 }, (_, i) => ({
    email: `loadtest${i}@example.com`,
    password: 'Test@123'
}));

function login() {
    const user = users[Math.floor(Math.random() * users.length)];

    const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
        email: user.email,
        password: user.password
    }), {
        headers: { 'Content-Type': 'application/json' },
    });

    const loginSuccess = check(loginRes, {
        'login successful': (r) => r.status === 200,
    });

    errorRate.add(!loginSuccess);

    return loginSuccess ? loginRes.json('token') : null;
}

function performOperations(token) {
    // Mix of read and write operations
    const operations = [
        // Read-heavy (70%)
        () => http.get(`${BASE_URL}/api/inventory`, { headers: { 'Authorization': `Bearer ${token}` } }),
        () => http.get(`${BASE_URL}/api/customers`, { headers: { 'Authorization': `Bearer ${token}` } }),
        () => http.get(`${BASE_URL}/api/suppliers`, { headers: { 'Authorization': `Bearer ${token}` } }),
        () => http.get(`${BASE_URL}/api/reports/dashboard`, { headers: { 'Authorization': `Bearer ${token}` } }),
        () => http.get(`${BASE_URL}/api/sales-invoice`, { headers: { 'Authorization': `Bearer ${token}` } }),
        () => http.get(`${BASE_URL}/api/purchases`, { headers: { 'Authorization': `Bearer ${token}` } }),
        () => http.get(`${BASE_URL}/api/inventory`, { headers: { 'Authorization': `Bearer ${token}` } }),

        // Write operations (30%)
        () => http.post(`${BASE_URL}/api/sales-invoice`, JSON.stringify({
            customerName: `Customer ${Math.random()}`,
            items: [{ itemName: 'Test Item', quantity: 1, rate: 100 }],
            paymentMethod: 'cash',
            paymentStatus: 'paid'
        }), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }),

        () => http.post(`${BASE_URL}/api/purchases`, JSON.stringify({
            supplierName: `Supplier ${Math.random()}`,
            items: [{ itemName: 'Test Item', quantity: 10, rate: 50 }],
            purchaseType: 'credit'
        }), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }),

        () => http.post(`${BASE_URL}/api/inventory`, JSON.stringify({
            name: `Item ${Math.random()}`,
            sku: `SKU${Math.floor(Math.random() * 10000)}`,
            sellingPrice: 100,
            purchasePrice: 50,
            currentStock: 100
        }), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }),
    ];

    const operation = operations[Math.floor(Math.random() * operations.length)];
    const res = operation();

    const success = check(res, {
        'operation successful': (r) => r.status >= 200 && r.status < 300,
    });

    errorRate.add(!success);
}

export default function () {
    const token = login();

    if (!token) {
        sleep(1);
        return;
    }

    // Perform 5-10 operations per user session
    const numOperations = Math.floor(Math.random() * 6) + 5;

    for (let i = 0; i < numOperations; i++) {
        performOperations(token);
        sleep(Math.random() * 1.5 + 0.5); // Random sleep 0.5-2 seconds
    }

    sleep(1);
}
