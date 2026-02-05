import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

/**
 * k6 Load Test: 100 Concurrent Users
 * 
 * Simulates 100 concurrent users performing typical operations:
 * - Login
 * - Create invoice
 * - View inventory
 * - Create purchase
 * - View reports
 */

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
    stages: [
        { duration: '2m', target: 100 },  // Ramp up to 100 users over 2 minutes
        { duration: '5m', target: 100 },  // Stay at 100 users for 5 minutes
        { duration: '2m', target: 0 },    // Ramp down to 0 users
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
        http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
        errors: ['rate<0.05'],            // Custom error rate should be less than 5%
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

// Test data
const users = [
    { email: 'test1@example.com', password: 'Test@123' },
    { email: 'test2@example.com', password: 'Test@123' },
    { email: 'test3@example.com', password: 'Test@123' },
];

/**
 * Login and get auth token
 */
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
        'token received': (r) => r.json('token') !== undefined,
    });

    errorRate.add(!loginSuccess);

    if (loginSuccess) {
        return loginRes.json('token');
    }

    return null;
}

/**
 * Create invoice
 */
function createInvoice(token) {
    const invoiceData = {
        customerName: `Customer ${Math.floor(Math.random() * 1000)}`,
        items: [
            {
                itemName: `Item ${Math.floor(Math.random() * 100)}`,
                quantity: Math.floor(Math.random() * 10) + 1,
                rate: Math.floor(Math.random() * 1000) + 100,
            }
        ],
        paymentMethod: 'cash',
        paymentStatus: 'paid'
    };

    const res = http.post(`${BASE_URL}/api/sales-invoice`, JSON.stringify(invoiceData), {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });

    const success = check(res, {
        'invoice created': (r) => r.status === 201,
    });

    errorRate.add(!success);
}

/**
 * Get inventory
 */
function getInventory(token) {
    const res = http.get(`${BASE_URL}/api/inventory`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    const success = check(res, {
        'inventory retrieved': (r) => r.status === 200,
    });

    errorRate.add(!success);
}

/**
 * Create purchase
 */
function createPurchase(token) {
    const purchaseData = {
        supplierName: `Supplier ${Math.floor(Math.random() * 100)}`,
        items: [
            {
                itemName: `Item ${Math.floor(Math.random() * 100)}`,
                quantity: Math.floor(Math.random() * 50) + 10,
                rate: Math.floor(Math.random() * 500) + 50,
            }
        ],
        purchaseType: 'credit'
    };

    const res = http.post(`${BASE_URL}/api/purchases`, JSON.stringify(purchaseData), {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });

    const success = check(res, {
        'purchase created': (r) => r.status === 201,
    });

    errorRate.add(!success);
}

/**
 * Get dashboard
 */
function getDashboard(token) {
    const res = http.get(`${BASE_URL}/api/reports/dashboard`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    const success = check(res, {
        'dashboard retrieved': (r) => r.status === 200,
    });

    errorRate.add(!success);
}

/**
 * Main test scenario
 */
export default function () {
    // Login
    const token = login();

    if (!token) {
        sleep(1);
        return;
    }

    // Perform random operations
    const operations = [
        () => createInvoice(token),
        () => getInventory(token),
        () => createPurchase(token),
        () => getDashboard(token),
    ];

    // Execute 3-5 random operations
    const numOperations = Math.floor(Math.random() * 3) + 3;

    for (let i = 0; i < numOperations; i++) {
        const operation = operations[Math.floor(Math.random() * operations.length)];
        operation();
        sleep(Math.random() * 2 + 1); // Random sleep 1-3 seconds
    }

    sleep(1);
}
