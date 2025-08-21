# Security Testing & Penetration Testing Framework

This document provides comprehensive documentation for the security testing and penetration testing framework implemented for the MCP project.

## Overview

The security testing framework includes:

- **Automated Security Tests**: OWASP Top 10, input validation, authentication, session security, API security
- **Container Security Tests**: Container escape, privilege escalation, network isolation, resource limits
- **Penetration Testing Suite**: Automated tools, custom scenarios, vulnerability scanning, compliance testing
- **Continuous Security Monitoring**: Real-time threat detection, incident response, security metrics
- **Security Reporting**: Comprehensive reports, compliance tracking, executive summaries

## Directory Structure

```
packages/backend/tests/security/
├── owasp-top10.security.test.js          # OWASP Top 10 vulnerability tests
├── container-security.test.js            # Container security tests
├── penetration-testing.test.js           # Penetration testing suite
├── incident-response.test.js             # Incident response testing
├── security-config.js                    # Security configuration
├── security-setup.js                     # Jest setup for security tests
├── security-test-runner.js               # Main test orchestrator
├── security-scanning-integration.js      # External security tools integration
├── security-metrics.service.js           # Security metrics and reporting
└── continuous-monitoring.service.js      # Continuous monitoring service

docs/security/
└── security-procedures.md                # Security procedures documentation
```

## Quick Start

### Prerequisites

1. **Node.js 18+** and **npm 8+**
2. **Docker** (for container security tests)
3. **Security Tools** (optional, for enhanced scanning):
   - OWASP ZAP
   - Nmap
   - Nikto
   - SQLMap
   - Bandit

### Installation

```bash
# Navigate to backend directory
cd packages/backend

# Install dependencies
npm install

# Install security-specific dependencies
npm install --save-dev eslint-plugin-security bandit safety retire snyk
```

### Running Security Tests

#### Quick Security Scan
```bash
# Run OWASP Top 10 and container security tests
npm run security:quick
```

#### Individual Test Suites
```bash
# OWASP Top 10 vulnerability tests
npm run security:owasp

# Container security tests
npm run security:container

# Penetration testing suite
npm run security:pentest

# Incident response tests
npm run security:incident
```

#### Comprehensive Security Testing
```bash
# Run all security tests with detailed reporting
npm run security:full

# Run security scanning with external tools
npm run security:scan

# Generate security compliance report
npm run security:compliance
```

#### Continuous Monitoring
```bash
# Start continuous security monitoring
npm run security:monitor

# Generate security metrics report
npm run security:report
```

## Test Categories

### 1. OWASP Top 10 Security Tests

**File**: `owasp-top10.security.test.js`

**Coverage**:
- **A01: Injection** - SQL, NoSQL, Command, LDAP, XPath, Template injection
- **A02: Cryptographic Failures** - Password hashing, HTTPS, secure cookies
- **A03: Insecure Design** - Rate limiting, account lockout
- **A04: Security Misconfiguration** - Headers, debug info, error handling
- **A05: Vulnerable Components** - Dependency scanning, version checks
- **A06: Authentication Failures** - Password policies, session management
- **A07: Data Integrity Failures** - File integrity, checksum validation
- **A08: Logging Failures** - Security event logging, monitoring
- **A09: SSRF** - Server-side request forgery prevention
- **A10: Security Logging** - Comprehensive audit trails

**Example Usage**:
```bash
# Run specific OWASP category
npm run security:owasp -- --testNamePattern="Injection"

# Run with verbose output
npm run security:owasp -- --verbose
```

### 2. Container Security Tests

**File**: `container-security.test.js`

**Coverage**:
- Container escape prevention
- Privilege escalation protection
- Network isolation validation
- Resource limit enforcement
- Security policy compliance
- File system security
- Runtime security monitoring
- Image security scanning

**Example Usage**:
```bash
# Run container security tests
npm run security:container

# Run with Docker security benchmark
npm run docker:security
```

### 3. Penetration Testing Suite

**File**: `penetration-testing.test.js`

**Coverage**:
- Automated vulnerability scanning
- Network penetration tests
- Web application security tests
- API security validation
- Social engineering simulation
- Compliance testing (GDPR, ISO27001)
- Security configuration assessment

**Example Usage**:
```bash
# Run penetration tests
npm run security:pentest

# Run with custom intensity
SECURITY_TEST_INTENSITY=high npm run security:pentest
```

### 4. Incident Response Testing

**File**: `incident-response.test.js`

**Coverage**:
- Incident detection and classification
- Response time validation
- Communication procedures
- Recovery procedures
- Documentation and reporting
- Team coordination

## Security Configuration

### Environment Variables

```bash
# Security test configuration
SECURITY_TEST_MODE=true
SECURITY_TEST_INTENSITY=medium  # low, medium, high
SECURITY_SCAN_TIMEOUT=300000    # 5 minutes
SECURITY_PARALLEL_TESTS=false

# External tool configuration
OWASP_ZAP_URL=http://localhost:8080
NMAP_PATH=/usr/bin/nmap
NIKTO_PATH=/usr/bin/nikto
SQLMAP_PATH=/usr/bin/sqlmap

# Reporting configuration
SECURITY_REPORT_FORMAT=json,html,pdf
SECURITY_REPORT_OUTPUT=./reports/security
SECURITY_ALERT_WEBHOOK=https://hooks.slack.com/...
```

### Security Test Configuration

**File**: `security-config.js`

Customize test parameters:

```javascript
module.exports = {
  testTimeouts: {
    quick: 30000,
    standard: 60000,
    comprehensive: 300000
  },
  
  owaspConfig: {
    injectionTests: {
      sqlPayloads: 50,
      nosqlPayloads: 30,
      commandPayloads: 25
    }
  },
  
  containerConfig: {
    dockerBenchmark: true,
    privilegeEscalation: true,
    networkIsolation: true
  }
};
```

## Security Tools Integration

### OWASP ZAP Integration

```bash
# Start OWASP ZAP daemon
docker run -d -p 8080:8080 owasp/zap2docker-stable zap.sh -daemon -host 0.0.0.0 -port 8080

# Run security scan with ZAP
OWASP_ZAP_URL=http://localhost:8080 npm run security:scan
```

### Nmap Network Scanning

```bash
# Install Nmap
sudo apt-get install nmap  # Ubuntu/Debian
brew install nmap          # macOS

# Run network security tests
npm run security:scan -- --include-network
```

### Dependency Scanning

```bash
# Run dependency security audit
npm run audit:security

# Check for outdated packages
npm run deps:check

# Update dependencies
npm run deps:update
```

## Security Reporting

### Report Generation

```bash
# Generate comprehensive security report
npm run security:report

# Generate compliance-only report
npm run security:compliance

# Generate executive summary
npm run security:report -- --executive-summary
```

### Report Formats

- **JSON**: Machine-readable format for CI/CD integration
- **HTML**: Interactive web-based reports
- **PDF**: Executive and compliance reports
- **CSV**: Data export for analysis

### Sample Report Structure

```json
{
  "summary": {
    "totalTests": 150,
    "passed": 142,
    "failed": 8,
    "riskScore": "Medium",
    "complianceScore": 94.7
  },
  "vulnerabilities": [
    {
      "id": "OWASP-A01-001",
      "category": "Injection",
      "severity": "High",
      "description": "SQL injection vulnerability detected",
      "location": "/api/users/search",
      "recommendation": "Use parameterized queries"
    }
  ],
  "compliance": {
    "GDPR": { "score": 96, "status": "Compliant" },
    "ISO27001": { "score": 93, "status": "Mostly Compliant" },
    "NIST": { "score": 95, "status": "Compliant" }
  }
}
```

## Continuous Integration

### GitHub Actions Integration

```yaml
# .github/workflows/security.yml
name: Security Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  security:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: |
        cd packages/backend
        npm ci
    
    - name: Run security tests
      run: |
        cd packages/backend
        npm run security:full
    
    - name: Upload security report
      uses: actions/upload-artifact@v3
      with:
        name: security-report
        path: packages/backend/reports/security/
    
    - name: Security notification
      if: failure()
      uses: 8398a7/action-slack@v3
      with:
        status: failure
        text: 'Security tests failed! Check the reports.'
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### Jenkins Integration

```groovy
// Jenkinsfile
pipeline {
    agent any
    
    stages {
        stage('Security Tests') {
            steps {
                dir('packages/backend') {
                    sh 'npm ci'
                    sh 'npm run security:full'
                }
            }
            
            post {
                always {
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'packages/backend/reports/security',
                        reportFiles: 'security-report.html',
                        reportName: 'Security Report'
                    ])
                }
            }
        }
    }
}
```

## Best Practices

### 1. Test Organization

- **Separate test files** by security category
- **Use descriptive test names** that indicate the vulnerability being tested
- **Group related tests** using `describe` blocks
- **Include both positive and negative test cases**

### 2. Test Data Management

- **Use realistic test data** that mimics production scenarios
- **Avoid hardcoded credentials** in test files
- **Clean up test data** after each test run
- **Use factories** for generating test data

### 3. Security Test Isolation

- **Run security tests in isolation** from functional tests
- **Use separate test databases** for security testing
- **Mock external services** to avoid side effects
- **Implement proper cleanup** between tests

### 4. Reporting and Monitoring

- **Generate reports** after each test run
- **Set up alerts** for critical security failures
- **Track security metrics** over time
- **Review reports regularly** with security team

## Troubleshooting

### Common Issues

#### 1. Test Timeouts

```bash
# Increase timeout for slow tests
SECURITY_SCAN_TIMEOUT=600000 npm run security:full

# Run tests sequentially instead of parallel
SECURITY_PARALLEL_TESTS=false npm run security:full
```

#### 2. External Tool Integration

```bash
# Check if tools are installed and accessible
which nmap
which nikto
docker ps | grep zap

# Install missing tools
sudo apt-get install nmap nikto
docker pull owasp/zap2docker-stable
```

#### 3. Permission Issues

```bash
# Fix file permissions
chmod +x tests/security/*.js

# Run with appropriate privileges for container tests
sudo npm run security:container
```

#### 4. Database Connection Issues

```bash
# Check MongoDB connection
echo 'db.runCommand("ismaster")' | mongo

# Reset test database
npm run test:db:reset
```

### Debug Mode

```bash
# Run tests in debug mode
DEBUG=security:* npm run security:full

# Run specific test with debugging
npm run test:debug -- --testPathPattern=owasp-top10
```

## Contributing

### Adding New Security Tests

1. **Create test file** in `tests/security/`
2. **Follow naming convention**: `feature-security.test.js`
3. **Use security test utilities** from `security-setup.js`
4. **Add test configuration** to `security-config.js`
5. **Update documentation** and README

### Security Test Template

```javascript
/**
 * Security Test Template
 * Tests for [SECURITY_FEATURE] vulnerabilities
 */

const request = require('supertest');
const app = require('../../src/app');
const { securityTestUtils } = global;

describe('[SECURITY_FEATURE] Security Tests', () => {
  let testUser;
  
  beforeEach(async () => {
    testUser = securityTestUtils.generateTestUser();
  });
  
  describe('Vulnerability Detection', () => {
    test('should detect [VULNERABILITY_TYPE]', async () => {
      const maliciousPayload = '[MALICIOUS_PAYLOAD]';
      
      const response = await request(app)
        .post('/api/endpoint')
        .send({ data: maliciousPayload })
        .expect(400);
      
      // Assert security measures
      expect(response.body.error).toContain('Invalid input');
      securityTestUtils.assertSecurityHeaders(response);
    });
  });
  
  describe('Protection Mechanisms', () => {
    test('should prevent [ATTACK_TYPE]', async () => {
      // Test implementation
    });
  });
});
```

## Security Contacts

- **Security Team**: security@mcp-project.com
- **Incident Response**: incident-response@mcp-project.com
- **Vulnerability Reports**: security-reports@mcp-project.com

## License

This security testing framework is part of the MCP project and is licensed under the MIT License.

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintainer**: MCP Security Team