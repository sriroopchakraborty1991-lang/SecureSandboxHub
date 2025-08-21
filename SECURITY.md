# Security Guide - Multi-Cloud Platform (MCP)

This guide covers security best practices, configurations, and recommendations for deploying and operating the Multi-Cloud Platform securely.

## Table of Contents

1. [Security Overview](#security-overview)
2. [Infrastructure Security](#infrastructure-security)
3. [Kubernetes Security](#kubernetes-security)
4. [Application Security](#application-security)
5. [Network Security](#network-security)
6. [Data Security](#data-security)
7. [Identity and Access Management](#identity-and-access-management)
8. [Monitoring and Compliance](#monitoring-and-compliance)
9. [Incident Response](#incident-response)
10. [Security Checklist](#security-checklist)

## Security Overview

### Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimal necessary permissions
3. **Zero Trust**: Never trust, always verify
4. **Encryption Everywhere**: Data at rest and in transit
5. **Continuous Monitoring**: Real-time security monitoring
6. **Compliance**: Adherence to security standards

### Threat Model

#### Common Threats
- Unauthorized access to cloud resources
- Data breaches and exfiltration
- Container and Kubernetes vulnerabilities
- Supply chain attacks
- Insider threats
- DDoS attacks
- Misconfiguration vulnerabilities

#### Attack Vectors
- Compromised credentials
- Vulnerable container images
- Misconfigured cloud services
- Unencrypted data transmission
- Weak network segmentation
- Insufficient logging and monitoring

## Infrastructure Security

### Cloud Provider Security

#### AWS Security Configuration

```hcl
# terraform.tfvars

# Enable AWS security features
enable_aws_config = true
enable_cloudtrail = true
enable_guardduty = true
enable_security_hub = true
enable_vpc_flow_logs = true

# Security settings
aws_enable_encryption = true
aws_kms_key_rotation = true
aws_s3_block_public_access = true
aws_rds_encryption = true
aws_backup_encryption = true
```

**Key Security Features:**

1. **AWS Config**: Configuration compliance monitoring
```bash
# Check Config rules
aws configservice describe-config-rules
aws configservice get-compliance-details-by-config-rule --config-rule-name required-tags
```

2. **CloudTrail**: API call logging
```bash
# Check CloudTrail status
aws cloudtrail describe-trails
aws cloudtrail get-trail-status --name mcp-cloudtrail
```

3. **GuardDuty**: Threat detection
```bash
# Check GuardDuty findings
aws guardduty list-detectors
aws guardduty get-findings --detector-id DETECTOR_ID
```

4. **Security Hub**: Centralized security findings
```bash
# Check Security Hub findings
aws securityhub get-findings --filters '{"SeverityLabel":[{"Value":"HIGH","Comparison":"EQUALS"}]}'
```

#### GCP Security Configuration

```hcl
# terraform.tfvars

# Enable GCP security features
enable_gcp_security_center = true
enable_gcp_audit_logs = true
enable_gcp_access_transparency = true
enable_gcp_binary_authorization = true

# Security settings
gcp_enable_shielded_nodes = true
gcp_enable_private_nodes = true
gcp_enable_network_policy = true
gcp_enable_workload_identity = true
```

**Key Security Features:**

1. **Security Command Center**: Centralized security management
```bash
# Check security findings
gcloud scc findings list --organization=ORG_ID
```

2. **Binary Authorization**: Container image verification
```bash
# Check Binary Authorization policy
gcloud container binauthz policy import policy.yaml
```

3. **Workload Identity**: Secure pod-to-GCP service authentication
```bash
# Configure Workload Identity
gcloud iam service-accounts add-iam-policy-binding GSA_NAME@PROJECT_ID.iam.gserviceaccount.com \
    --role roles/iam.workloadIdentityUser \
    --member "serviceAccount:PROJECT_ID.svc.id.goog[NAMESPACE/KSA_NAME]"
```

#### Azure Security Configuration

```hcl
# terraform.tfvars

# Enable Azure security features
enable_azure_security_center = true
enable_azure_policy = true
enable_azure_key_vault = true
enable_azure_sentinel = true

# Security settings
azure_enable_disk_encryption = true
azure_enable_network_security_groups = true
azure_enable_ddos_protection = true
```

### Infrastructure as Code Security

#### Terraform Security Best Practices

1. **Secure State Management**
```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "mcp-terraform-state"
    key            = "multi-cloud/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-west-2:ACCOUNT:key/KEY-ID"
    dynamodb_table = "terraform-state-lock"
  }
}
```

2. **Variable Validation**
```hcl
# variables.tf
variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access resources"
  type        = list(string)
  validation {
    condition = alltrue([
      for cidr in var.allowed_cidr_blocks : can(cidrhost(cidr, 0))
    ])
    error_message = "All values must be valid CIDR blocks."
  }
}
```

3. **Sensitive Data Handling**
```hcl
# Never store secrets in plain text
variable "database_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# Use random passwords
resource "random_password" "db_password" {
  length  = 32
  special = true
}
```

#### Security Scanning

```bash
# Install security scanning tools
# Checkov - Terraform security scanner
pip install checkov

# TFSec - Terraform security scanner
brew install tfsec

# Terrascan - Multi-cloud security scanner
brew install terrascan

# Run security scans
checkov -d infrastructure/terraform/
tfsec infrastructure/terraform/
terrascan scan -t terraform -d infrastructure/terraform/
```

## Kubernetes Security

### Cluster Security

#### RBAC Configuration

```yaml
# rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: mcp-developer
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps"]
  verbs: ["get", "list", "create", "update", "patch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "create", "update", "patch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: mcp-developers
subjects:
- kind: User
  name: developer@company.com
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: mcp-developer
  apiGroup: rbac.authorization.k8s.io
```

#### Pod Security Standards

```yaml
# pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: mcp-restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

#### Network Policies

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: mcp-backend-policy
  namespace: mcp
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
```

### Container Security

#### Secure Container Images

```dockerfile
# Dockerfile security best practices

# Use minimal base images
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY --chown=nextjs:nodejs . .

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["npm", "start"]
```

#### Image Scanning

```bash
# Install container scanning tools
# Trivy
brew install aquasecurity/trivy/trivy

# Grype
brew tap anchore/grype
brew install grype

# Scan images
trivy image your-registry/backend:latest
grype your-registry/frontend:latest

# Scan for secrets
truffleHog --regex --entropy=False your-registry/app:latest
```

#### Secure Pod Configuration

```yaml
# secure-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-backend
  namespace: mcp
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    runAsGroup: 1001
    fsGroup: 1001
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: backend
    image: your-registry/backend:latest
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
    resources:
      limits:
        memory: "512Mi"
        cpu: "500m"
      requests:
        memory: "256Mi"
        cpu: "250m"
    volumeMounts:
    - name: tmp
      mountPath: /tmp
    - name: cache
      mountPath: /app/cache
  volumes:
  - name: tmp
    emptyDir: {}
  - name: cache
    emptyDir: {}
```

## Application Security

### Secrets Management

#### Using HashiCorp Vault

```bash
# Install Vault
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault hashicorp/vault --namespace vault --create-namespace

# Initialize Vault
kubectl exec vault-0 -- vault operator init

# Configure Kubernetes auth
vault auth enable kubernetes
vault write auth/kubernetes/config \
    token_reviewer_jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
    kubernetes_host="https://$KUBERNETES_PORT_443_TCP_ADDR:443" \
    kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt
```

#### Vault Secret Injection

```yaml
# vault-secret-injection.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: mcp
spec:
  template:
    metadata:
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "mcp-backend"
        vault.hashicorp.com/agent-inject-secret-database: "secret/data/database"
        vault.hashicorp.com/agent-inject-template-database: |
          {{- with secret "secret/data/database" -}}
          DATABASE_URL="postgresql://{{ .Data.data.username }}:{{ .Data.data.password }}@{{ .Data.data.host }}:5432/{{ .Data.data.database }}"
          {{- end -}}
    spec:
      serviceAccountName: mcp-backend
      containers:
      - name: backend
        image: your-registry/backend:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
```

#### Kubernetes Secrets

```bash
# Create secrets securely
kubectl create secret generic database-secret \
  --from-literal=username=dbuser \
  --from-literal=password="$(openssl rand -base64 32)" \
  --namespace=mcp

# Encrypt secrets at rest
# Add to kube-apiserver configuration
--encryption-provider-config=/etc/kubernetes/encryption-config.yaml
```

### Application-Level Security

#### Input Validation

```javascript
// backend/src/middleware/validation.js
const { body, validationResult } = require('express-validator');

const validateInput = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  body('name').trim().escape().isLength({ min: 1, max: 100 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = { validateInput };
```

#### Authentication and Authorization

```javascript
// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.'
});

// JWT verification
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

// Role-based access control
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

module.exports = { authLimiter, verifyToken, requireRole };
```

#### Secure Headers

```javascript
// backend/src/middleware/security.js
const helmet = require('helmet');
const cors = require('cors');

const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }),
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    optionsSuccessStatus: 200
  })
];

module.exports = { securityMiddleware };
```

## Network Security

### VPC Security

#### AWS VPC Configuration

```hcl
# vpc.tf
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = "${var.project_name}-${var.environment}-vpc"
  }
}

# Private subnets for workloads
resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]
  
  tags = {
    Name = "${var.project_name}-${var.environment}-private-${count.index + 1}"
    Type = "Private"
  }
}

# Public subnets for load balancers only
resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = false
  
  tags = {
    Name = "${var.project_name}-${var.environment}-public-${count.index + 1}"
    Type = "Public"
  }
}
```

#### Security Groups

```hcl
# security-groups.tf
resource "aws_security_group" "eks_cluster" {
  name_prefix = "${var.project_name}-${var.environment}-eks-cluster"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-eks-cluster-sg"
  }
}

resource "aws_security_group" "eks_nodes" {
  name_prefix = "${var.project_name}-${var.environment}-eks-nodes"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port = 0
    to_port   = 65535
    protocol  = "tcp"
    self      = true
  }

  ingress {
    from_port       = 1025
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-eks-nodes-sg"
  }
}
```

### TLS/SSL Configuration

#### Certificate Management

```yaml
# cert-manager.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@company.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx

---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: mcp-tls
  namespace: mcp
spec:
  secretName: mcp-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - api.mcp.company.com
  - app.mcp.company.com
```

#### Ingress TLS Configuration

```yaml
# ingress-tls.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mcp-ingress
  namespace: mcp
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/ssl-protocols: "TLSv1.2 TLSv1.3"
    nginx.ingress.kubernetes.io/ssl-ciphers: "ECDHE-RSA-AES128-GCM-SHA256,ECDHE-RSA-AES256-GCM-SHA384"
spec:
  tls:
  - hosts:
    - api.mcp.company.com
    - app.mcp.company.com
    secretName: mcp-tls-secret
  rules:
  - host: api.mcp.company.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 8080
  - host: app.mcp.company.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 3000
```

## Data Security

### Database Security

#### Encryption at Rest

```hcl
# rds.tf
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-${var.environment}-db"
  
  engine         = "postgres"
  engine_version = var.postgresql_version
  instance_class = var.rds_instance_class
  
  allocated_storage     = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id           = aws_kms_key.rds.arn
  
  db_name  = var.database_name
  username = var.database_username
  password = random_password.db_password.result
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-${var.environment}-final-snapshot"
  
  performance_insights_enabled = true
  monitoring_interval         = 60
  monitoring_role_arn        = aws_iam_role.rds_monitoring.arn
  
  tags = {
    Name = "${var.project_name}-${var.environment}-db"
  }
}

resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  
  tags = {
    Name = "${var.project_name}-${var.environment}-rds-key"
  }
}
```

#### Database Connection Security

```javascript
// backend/src/config/database.js
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    require: true,
    rejectUnauthorized: true,
    ca: fs.readFileSync('/etc/ssl/certs/rds-ca-2019-root.pem')
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = pool;
```

### Backup Security

```hcl
# backup.tf
resource "aws_backup_vault" "main" {
  name        = "${var.project_name}-${var.environment}-backup-vault"
  kms_key_arn = aws_kms_key.backup.arn
  
  tags = {
    Name = "${var.project_name}-${var.environment}-backup-vault"
  }
}

resource "aws_kms_key" "backup" {
  description             = "KMS key for backup encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  
  tags = {
    Name = "${var.project_name}-${var.environment}-backup-key"
  }
}
```

## Identity and Access Management

### AWS IAM Best Practices

#### Service Roles

```hcl
# iam.tf
resource "aws_iam_role" "eks_cluster" {
  name = "${var.project_name}-${var.environment}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

# Least privilege policy for application
resource "aws_iam_policy" "app_policy" {
  name = "${var.project_name}-${var.environment}-app-policy"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.app_data.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.app_secrets.arn
      }
    ]
  })
}
```

#### IRSA (IAM Roles for Service Accounts)

```hcl
# irsa.tf
resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_role" "pod_role" {
  name = "${var.project_name}-${var.environment}-pod-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub" = "system:serviceaccount:mcp:backend"
            "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })
}
```

### Multi-Factor Authentication

```bash
# Enable MFA for AWS CLI
aws sts get-session-token --serial-number arn:aws:iam::ACCOUNT:mfa/USERNAME --token-code 123456

# Configure AWS CLI with MFA
aws configure set profile.mfa.role_arn arn:aws:iam::ACCOUNT:role/ROLE_NAME
aws configure set profile.mfa.source_profile default
aws configure set profile.mfa.mfa_serial arn:aws:iam::ACCOUNT:mfa/USERNAME
```

## Monitoring and Compliance

### Security Monitoring

#### Falco - Runtime Security

```bash
# Install Falco
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm install falco falcosecurity/falco --namespace falco --create-namespace

# Custom Falco rules
kubectl create configmap falco-rules --from-file=custom-rules.yaml -n falco
```

```yaml
# custom-rules.yaml
- rule: Unauthorized Process in Container
  desc: Detect unauthorized processes in containers
  condition: >
    spawned_process and container and
    not proc.name in (node, npm, python, java, nginx)
  output: >
    Unauthorized process spawned in container
    (user=%user.name command=%proc.cmdline container=%container.name image=%container.image)
  priority: WARNING

- rule: Sensitive File Access
  desc: Detect access to sensitive files
  condition: >
    open_read and fd.name in (/etc/passwd, /etc/shadow, /etc/hosts)
  output: >
    Sensitive file accessed
    (user=%user.name file=%fd.name container=%container.name)
  priority: HIGH
```

#### Security Dashboards

```yaml
# security-dashboard.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: security-dashboard
  namespace: monitoring
data:
  dashboard.json: |
    {
      "dashboard": {
        "title": "Security Overview",
        "panels": [
          {
            "title": "Failed Login Attempts",
            "type": "graph",
            "targets": [
              {
                "expr": "rate(authentication_failures_total[5m])"
              }
            ]
          },
          {
            "title": "Suspicious Network Activity",
            "type": "graph",
            "targets": [
              {
                "expr": "rate(network_connections_suspicious_total[5m])"
              }
            ]
          }
        ]
      }
    }
```

### Compliance Frameworks

#### CIS Benchmarks

```bash
# Install kube-bench for CIS Kubernetes Benchmark
kubectl apply -f https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job.yaml

# Check results
kubectl logs job/kube-bench

# Install kube-hunter for penetration testing
kubectl create -f https://raw.githubusercontent.com/aquasecurity/kube-hunter/main/job.yaml
```

#### SOC 2 Compliance

```hcl
# compliance.tf
# Enable audit logging
resource "aws_cloudtrail" "audit" {
  name           = "${var.project_name}-${var.environment}-audit"
  s3_bucket_name = aws_s3_bucket.audit_logs.bucket
  
  event_selector {
    read_write_type                 = "All"
    include_management_events       = true
    data_resource {
      type   = "AWS::S3::Object"
      values = ["${aws_s3_bucket.app_data.arn}/*"]
    }
  }
  
  tags = {
    Compliance = "SOC2"
  }
}

# Data retention policy
resource "aws_s3_bucket_lifecycle_configuration" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id
  
  rule {
    id     = "audit_retention"
    status = "Enabled"
    
    expiration {
      days = 2555  # 7 years for SOC 2
    }
    
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
}
```

## Incident Response

### Incident Response Plan

#### Detection and Analysis

```bash
# Security incident detection script
#!/bin/bash

# Check for suspicious activities
echo "Checking for security incidents..."

# Check failed authentication attempts
kubectl logs -l app=backend | grep "authentication failed" | tail -20

# Check for privilege escalation
kubectl get events --field-selector reason=FailedMount,reason=FailedScheduling

# Check for unusual network activity
kubectl logs -n kube-system -l k8s-app=calico-node | grep "DENIED"

# Check GuardDuty findings
aws guardduty get-findings --detector-id $DETECTOR_ID --finding-criteria '{"Criterion":{"severity":{"Gte":7}}}'

# Generate incident report
echo "Incident detected at $(date)" > incident-report.txt
echo "Details:" >> incident-report.txt
```

#### Containment and Recovery

```bash
# Incident containment script
#!/bin/bash

POD_NAME=$1
NAMESPACE=$2

if [ -z "$POD_NAME" ] || [ -z "$NAMESPACE" ]; then
    echo "Usage: $0 <pod-name> <namespace>"
    exit 1
fi

echo "Containing security incident for pod: $POD_NAME in namespace: $NAMESPACE"

# Isolate the pod
kubectl label pod $POD_NAME security-incident=true -n $NAMESPACE

# Apply network policy to isolate
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: isolate-$POD_NAME
  namespace: $NAMESPACE
spec:
  podSelector:
    matchLabels:
      security-incident: "true"
  policyTypes:
  - Ingress
  - Egress
EOF

# Collect forensic data
kubectl logs $POD_NAME -n $NAMESPACE > forensic-logs-$POD_NAME.txt
kubectl describe pod $POD_NAME -n $NAMESPACE > forensic-describe-$POD_NAME.txt

# Scale down the deployment
DEPLOYMENT=$(kubectl get pod $POD_NAME -n $NAMESPACE -o jsonpath='{.metadata.ownerReferences[0].name}')
kubectl scale deployment $DEPLOYMENT --replicas=0 -n $NAMESPACE

echo "Pod isolated and deployment scaled down. Forensic data collected."
```

### Security Playbooks

#### Data Breach Response

1. **Immediate Actions**:
   - Isolate affected systems
   - Preserve evidence
   - Notify stakeholders
   - Assess scope of breach

2. **Investigation**:
   - Analyze logs and forensic data
   - Identify attack vectors
   - Determine data accessed
   - Document timeline

3. **Recovery**:
   - Patch vulnerabilities
   - Restore from clean backups
   - Update security controls
   - Monitor for persistence

4. **Post-Incident**:
   - Conduct lessons learned
   - Update procedures
   - Provide training
   - Notify authorities if required

## Security Checklist

### Pre-Deployment Security Checklist

- [ ] **Infrastructure Security**
  - [ ] Terraform code scanned for security issues
  - [ ] Secrets not hardcoded in configuration
  - [ ] Encryption enabled for all data stores
  - [ ] Network segmentation implemented
  - [ ] Security groups follow least privilege

- [ ] **Kubernetes Security**
  - [ ] RBAC configured with least privilege
  - [ ] Pod Security Standards enforced
  - [ ] Network policies implemented
  - [ ] Admission controllers configured
  - [ ] Resource quotas and limits set

- [ ] **Container Security**
  - [ ] Base images scanned for vulnerabilities
  - [ ] Containers run as non-root
  - [ ] Read-only root filesystem enabled
  - [ ] Unnecessary capabilities dropped
  - [ ] Security contexts configured

- [ ] **Application Security**
  - [ ] Input validation implemented
  - [ ] Authentication and authorization configured
  - [ ] Secure headers implemented
  - [ ] Secrets managed securely
  - [ ] Dependencies scanned for vulnerabilities

- [ ] **Monitoring and Compliance**
  - [ ] Security monitoring tools deployed
  - [ ] Audit logging enabled
  - [ ] Compliance requirements met
  - [ ] Incident response plan documented
  - [ ] Security training completed

### Post-Deployment Security Checklist

- [ ] **Verification**
  - [ ] Security scans completed successfully
  - [ ] Penetration testing performed
  - [ ] Compliance audits passed
  - [ ] Security monitoring active
  - [ ] Backup and recovery tested

- [ ] **Ongoing Security**
  - [ ] Regular security updates scheduled
  - [ ] Vulnerability scanning automated
  - [ ] Security metrics monitored
  - [ ] Incident response procedures tested
  - [ ] Security awareness training ongoing

Remember: Security is an ongoing process, not a one-time implementation. Regularly review and update your security posture to address new threats and vulnerabilities.