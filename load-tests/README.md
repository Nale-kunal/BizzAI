# Load Testing Guide

## Overview

This directory contains k6 load testing scenarios for BizzAI Inventory Management System.

## Prerequisites

```bash
# Install k6
# Windows (using Chocolatey)
choco install k6

# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Test Scenarios

### 1. 100 Users (Normal Load)
**File**: `scenarios/100-users.js`  
**Purpose**: Baseline performance testing  
**Duration**: 9 minutes  
**Thresholds**:
- 95% of requests < 500ms
- Error rate < 1%

```bash
k6 run scenarios/100-users.js
```

### 2. 500 Users (High Load)
**File**: `scenarios/500-users.js`  
**Purpose**: High-load performance testing  
**Duration**: 16 minutes  
**Thresholds**:
- 95% of requests < 1000ms
- Error rate < 2%

```bash
k6 run scenarios/500-users.js
```

### 3. 1000 Users (Stress Test)
**File**: `scenarios/1000-users.js`  
**Purpose**: Identify breaking points  
**Duration**: 25 minutes  
**Thresholds**:
- 95% of requests < 2000ms
- Error rate < 5%

```bash
k6 run scenarios/1000-users.js
```

## Environment Variables

```bash
# Set base URL
export BASE_URL=http://localhost:5000

# Or for production
export BASE_URL=https://api.bizzai.com
```

## Running Tests

### Local Testing

```bash
# Ensure backend is running
cd backend
npm run dev

# In another terminal, run load test
cd load-tests
k6 run scenarios/100-users.js
```

### Production Testing

```bash
# Set production URL
export BASE_URL=https://api.bizzai.com

# Run test
k6 run scenarios/500-users.js
```

### Cloud Testing (k6 Cloud)

```bash
# Login to k6 cloud
k6 login cloud

# Run test in cloud
k6 cloud scenarios/1000-users.js
```

## Interpreting Results

### Key Metrics

- **http_req_duration**: Response time (p95 = 95th percentile)
- **http_req_failed**: Failed requests percentage
- **http_reqs**: Total requests per second
- **vus**: Virtual users (concurrent users)
- **errors**: Custom error rate

### Example Output

```
✓ login successful
✓ invoice created
✓ inventory retrieved

checks.........................: 98.50% ✓ 9850  ✗ 150
data_received..................: 45 MB  75 kB/s
data_sent......................: 12 MB  20 kB/s
http_req_duration..............: avg=245ms min=50ms med=200ms max=1.2s p(95)=450ms
http_req_failed................: 0.50%  ✓ 50    ✗ 9950
http_reqs......................: 10000  166.67/s
vus............................: 100    min=0   max=100
```

### Success Criteria

✅ **PASS**: All thresholds met  
⚠️ **WARNING**: Some thresholds exceeded but system stable  
❌ **FAIL**: Critical thresholds exceeded or system crashed

## Performance Baselines

### Expected Performance (Single Server)

| Scenario | Concurrent Users | Avg Response Time | P95 Response Time | Throughput (req/s) |
|----------|------------------|-------------------|-------------------|--------------------|
| 100 Users | 100 | 150-250ms | < 500ms | 150-200 |
| 500 Users | 500 | 300-600ms | < 1000ms | 400-600 |
| 1000 Users | 1000 | 600-1200ms | < 2000ms | 600-800 |

### Horizontal Scaling

With 3 backend instances:
- 1000 users: < 800ms p95
- 2000 users: < 1500ms p95

## Troubleshooting

### High Error Rates

1. Check database connections
2. Verify Redis is running
3. Check MongoDB connection pool size
4. Review application logs

### Slow Response Times

1. Enable database query profiling
2. Check for N+1 queries
3. Verify indexes exist
4. Monitor CPU/memory usage
5. Check network latency

### Connection Errors

1. Increase connection pool size
2. Adjust timeout settings
3. Check firewall rules
4. Verify load balancer configuration

## Best Practices

1. **Warm-up**: Always include ramp-up period
2. **Cooldown**: Include ramp-down to gracefully end test
3. **Realistic Data**: Use production-like data volumes
4. **Monitoring**: Monitor system resources during tests
5. **Repeatability**: Run tests multiple times for consistency
6. **Baseline**: Establish baseline before optimizations

## Next Steps

After load testing:

1. **Analyze Results**: Identify bottlenecks
2. **Optimize**: Database queries, indexes, caching
3. **Scale**: Add more instances if needed
4. **Re-test**: Verify improvements
5. **Document**: Update baselines

## Support

For issues or questions:
- Check logs: `backend/logs/`
- Review metrics: k6 HTML report
- Contact: dev@bizzai.com
