import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * k6 Load Test: 1000 Concurrent Users (Stress Test)
 * 
 * Extreme load scenario to identify breaking points
 */

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
    stages: [
        { duration: '5m', target: 1000 },  // Ramp up to 1000 users over 5 minutes
        { duration: '15m', target: 1000 }, // Stay at 1000 users for 15 minutes
        { duration: '5m', target: 0 },     // Ramp down to 0 users
    ],
    thresholds: {
        http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
        http_req_failed: ['rate<0.05'],    // Error rate should be less than 5%
        errors: ['rate<0.15'],             // Custom error rate should be less than 15%
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

const users = Array.from({ length: 20 }, (_, i) => ({
    email: `stresstest${i}@example.com`,
    password: 'Test@123'
}));

function login() {
    const user = users[Math.floor(Math.random() * users.length)];

    const startTime = Date.now();

    const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
        email: user.email,
        password: user.password
    }), {
        headers: { 'Content-Type': 'application/json' },
        timeout: '10s'
    });

    responseTime.add(Date.now() - startTime);

    const loginSuccess = check(loginRes, {
        'login successful': (r) => r.status === 200,
    });

    errorRate.add(!loginSuccess);

    return loginSuccess ? loginRes.json('token') : null;
}

function performReadOperations(token) {
    const endpoints = [
        '/api/inventory',
        '/api/customers',
        '/api/suppliers',
        '/api/sales-invoice',
        '/api/purchases',
        '/api/reports/dashboard'
    ];

    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const startTime = Date.now();

    const res = http.get(`${BASE_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: '10s'
    });

    responseTime.add(Date.now() - startTime);

    const success = check(res, {
        'read successful': (r) => r.status === 200,
    });

    errorRate.add(!success);
}

function performWriteOperations(token) {
    const operations = [
        {
            endpoint: '/api/sales-invoice',
            data: {
                customerName: `StressCustomer${Math.floor(Math.random() * 1000)}`,
                items: [{ itemName: 'Stress Item', quantity: 1, rate: 100 }],
                paymentMethod: 'cash',
                paymentStatus: 'paid'
            }
        },
        {
            endpoint: '/api/purchases',
            data: {
                supplierName: `StressSupplier${Math.floor(Math.random() * 1000)}`,
                items: [{ itemName: 'Stress Item', quantity: 10, rate: 50 }],
                purchaseType: 'credit'
            }
        }
    ];

    const operation = operations[Math.floor(Math.random() * operations.length)];
    const startTime = Date.now();

    const res = http.post(`${BASE_URL}${operation.endpoint}`, JSON.stringify(operation.data), {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Idempotency-Key': `stress-${Date.now()}-${Math.random()}`
        },
        timeout: '15s'
    });

    responseTime.add(Date.now() - startTime);

    const success = check(res, {
        'write successful': (r) => r.status >= 200 && r.status < 300,
    });

    errorRate.add(!success);
}

export default function () {
    const token = login();

    if (!token) {
        sleep(2);
        return;
    }

    // 80% reads, 20% writes
    const numOperations = Math.floor(Math.random() * 8) + 5;

    for (let i = 0; i < numOperations; i++) {
        if (Math.random() < 0.8) {
            performReadOperations(token);
        } else {
            performWriteOperations(token);
        }

        sleep(Math.random() * 1 + 0.3); // Random sleep 0.3-1.3 seconds
    }

    sleep(1);
}
