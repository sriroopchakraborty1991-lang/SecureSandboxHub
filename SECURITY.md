# Security Notes (MVP)

SecureSandboxHub is intended for local use as an MVP. The security model focuses on safe defaults, not production hardening.

## Runtime Isolation
- Sandbox sessions run as Docker containers via the backend.
- Default policy templates disable network access and enable read-only root filesystem.
- CPU and memory limits are applied via Docker container host config.

## Authentication
- Authentication uses JWT.
- Set `JWT_SECRET` to a long random string in `packages/backend/.env`.

## Monitoring
- Session monitoring uses Server-Sent Events (SSE).
- For SSE, the frontend passes a token via query string to keep the client implementation minimal. Treat the UI as trusted/local; do not use this approach for production.

## Operational Safety
- Do not expose the backend publicly with the Docker socket mounted.
- Do not run this stack on an untrusted multi-tenant machine.

## Reporting Security Issues
If you find a security issue, open a GitHub issue with reproduction steps (avoid posting secrets).

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
