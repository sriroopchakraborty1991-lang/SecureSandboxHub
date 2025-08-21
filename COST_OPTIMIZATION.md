# Cost Optimization Guide - Multi-Cloud Platform (MCP)

This guide provides strategies, tools, and best practices for optimizing costs across your multi-cloud deployment while maintaining performance and reliability.

## Table of Contents

1. [Cost Optimization Overview](#cost-optimization-overview)
2. [Infrastructure Cost Optimization](#infrastructure-cost-optimization)
3. [Kubernetes Cost Optimization](#kubernetes-cost-optimization)
4. [Application-Level Optimization](#application-level-optimization)
5. [Storage Cost Optimization](#storage-cost-optimization)
6. [Network Cost Optimization](#network-cost-optimization)
7. [Monitoring and Analytics](#monitoring-and-analytics)
8. [Automation and Policies](#automation-and-policies)
9. [Multi-Cloud Cost Strategies](#multi-cloud-cost-strategies)
10. [Cost Optimization Checklist](#cost-optimization-checklist)

## Cost Optimization Overview

### Cost Optimization Principles

1. **Right-sizing**: Match resources to actual needs
2. **Elasticity**: Scale resources based on demand
3. **Reserved Capacity**: Commit to long-term usage for discounts
4. **Spot/Preemptible**: Use discounted spare capacity
5. **Lifecycle Management**: Optimize data storage costs
6. **Monitoring**: Continuous cost visibility and alerting
7. **Automation**: Automated cost optimization actions

### Cost Categories

- **Compute**: EC2, GCE, Azure VMs, Kubernetes nodes
- **Storage**: EBS, Cloud Storage, Azure Disk, S3, etc.
- **Network**: Data transfer, load balancers, VPN
- **Database**: RDS, Cloud SQL, Azure Database
- **Monitoring**: CloudWatch, Stackdriver, Azure Monitor
- **Security**: WAF, GuardDuty, Security Center

## Infrastructure Cost Optimization

### Compute Optimization

#### Instance Right-Sizing

```hcl
# terraform.tfvars - Cost-optimized configuration

# Enable cost optimization features
enable_cost_optimization = true
enable_spot_instances = true
enable_autoscaling = true
enable_right_sizing = true

# AWS cost optimization
aws_eks_node_instance_types = ["t3.medium", "t3.large"]  # Burstable instances
aws_eks_enable_spot_instances = true
aws_eks_spot_instance_percentage = 70  # 70% spot, 30% on-demand
aws_eks_node_group_min_size = 1
aws_eks_node_group_max_size = 10
aws_eks_node_group_desired_size = 2

# GCP cost optimization
gcp_gke_machine_type = "e2-medium"  # Cost-optimized machine type
gcp_gke_preemptible_nodes = true
gcp_gke_preemptible_percentage = 80
gcp_enable_autopilot = true  # Serverless Kubernetes

# Azure cost optimization
azure_aks_vm_size = "Standard_B2s"  # Burstable VMs
azure_aks_enable_spot_instances = true
azure_aks_spot_percentage = 60
```

#### Spot/Preemptible Instances

```hcl
# spot-instances.tf
resource "aws_eks_node_group" "spot" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.project_name}-${var.environment}-spot"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = aws_subnet.private[*].id
  
  capacity_type = "SPOT"
  instance_types = ["t3.medium", "t3.large", "m5.large"]
  
  scaling_config {
    desired_size = var.spot_desired_size
    max_size     = var.spot_max_size
    min_size     = var.spot_min_size
  }
  
  # Spot instance configuration
  launch_template {
    name    = aws_launch_template.spot.name
    version = aws_launch_template.spot.latest_version
  }
  
  # Taints for spot instances
  taint {
    key    = "spot-instance"
    value  = "true"
    effect = "NO_SCHEDULE"
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-spot-nodes"
    "kubernetes.io/cluster/${aws_eks_cluster.main.name}" = "owned"
  }
}

resource "aws_launch_template" "spot" {
  name_prefix = "${var.project_name}-${var.environment}-spot"
  
  vpc_security_group_ids = [aws_security_group.eks_nodes.id]
  
  user_data = base64encode(templatefile("${path.module}/userdata.sh", {
    cluster_name = aws_eks_cluster.main.name
    endpoint     = aws_eks_cluster.main.endpoint
    ca_data      = aws_eks_cluster.main.certificate_authority[0].data
  }))
  
  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "${var.project_name}-${var.environment}-spot-node"
    }
  }
}
```

#### Reserved Instances Strategy

```bash
# AWS Reserved Instance recommendations
aws ce get-reservation-purchase-recommendation \
  --service "Amazon Elastic Compute Cloud - Compute" \
  --account-scope PAYER \
  --lookback-period-in-days 60 \
  --term-in-years 1 \
  --payment-option "Partial Upfront"

# GCP Committed Use Discounts
gcloud compute commitments create my-commitment \
  --plan=12-month \
  --resources=vcpu=100,memory=400GB \
  --region=us-central1

# Azure Reserved VM Instances
az reservations reservation-order purchase \
  --reservation-order-id /providers/Microsoft.Capacity/reservationOrders/GUID \
  --sku Standard_D2s_v3 \
  --location westus2 \
  --quantity 10 \
  --term P1Y
```

### Auto-Scaling Configuration

#### Cluster Autoscaler

```yaml
# cluster-autoscaler.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.21.0
        name: cluster-autoscaler
        command:
        - ./cluster-autoscaler
        - --v=4
        - --stderrthreshold=info
        - --cloud-provider=aws
        - --skip-nodes-with-local-storage=false
        - --expander=least-waste
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/mcp-dev
        - --balance-similar-node-groups
        - --scale-down-enabled=true
        - --scale-down-delay-after-add=10m
        - --scale-down-unneeded-time=10m
        - --scale-down-utilization-threshold=0.5
        - --max-node-provision-time=15m
        env:
        - name: AWS_REGION
          value: us-west-2
```

#### Vertical Pod Autoscaler

```yaml
# vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: backend-vpa
  namespace: mcp
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: backend
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 1000m
        memory: 1Gi
      controlledResources: ["cpu", "memory"]
```

## Kubernetes Cost Optimization

### Resource Management

#### Resource Requests and Limits

```yaml
# optimized-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: mcp
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: backend
        image: your-registry/backend:latest
        resources:
          requests:
            cpu: 100m      # Start small
            memory: 128Mi
          limits:
            cpu: 500m      # Allow bursting
            memory: 512Mi
        # Startup and liveness probes to ensure quick startup
        startupProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
          failureThreshold: 30
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          periodSeconds: 5
      # Spot instance toleration
      tolerations:
      - key: "spot-instance"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
      # Node affinity for cost optimization
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: "node.kubernetes.io/instance-type"
                operator: In
                values: ["t3.medium", "t3.large"]
```

#### Horizontal Pod Autoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: mcp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
```

### Namespace Resource Quotas

```yaml
# resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: mcp-quota
  namespace: mcp
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    persistentvolumeclaims: "10"
    pods: "20"
    services: "10"
    secrets: "20"
    configmaps: "20"

---
apiVersion: v1
kind: LimitRange
metadata:
  name: mcp-limits
  namespace: mcp
spec:
  limits:
  - default:
      cpu: 500m
      memory: 512Mi
    defaultRequest:
      cpu: 100m
      memory: 128Mi
    type: Container
  - max:
      cpu: 2000m
      memory: 2Gi
    min:
      cpu: 50m
      memory: 64Mi
    type: Container
```

### Pod Disruption Budgets

```yaml
# pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: backend-pdb
  namespace: mcp
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: backend

---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: frontend-pdb
  namespace: mcp
spec:
  maxUnavailable: 50%
  selector:
    matchLabels:
      app: frontend
```

## Application-Level Optimization

### Container Image Optimization

#### Multi-stage Dockerfile

```dockerfile
# Dockerfile - Optimized for size and security

# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy only necessary files
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start application
CMD ["node", "dist/index.js"]
```

#### Image Optimization Tools

```bash
# Use dive to analyze image layers
docker run --rm -it \
  -v /var/run/docker.sock:/var/run/docker.sock \
  wagoodman/dive:latest your-image:tag

# Use docker-slim to optimize images
docker-slim build --target your-image:tag --tag your-image:slim

# Use distroless base images
FROM gcr.io/distroless/nodejs18-debian11
```

### Application Performance Optimization

#### Caching Strategy

```javascript
// backend/src/middleware/cache.js
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
});

const cache = (duration = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    
    try {
      const cached = await client.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      // Store original res.json
      const originalJson = res.json;
      
      // Override res.json to cache response
      res.json = function(data) {
        client.setex(key, duration, JSON.stringify(data));
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Cache error:', error);
      next();
    }
  };
};

module.exports = { cache };
```

#### Database Connection Pooling

```javascript
// backend/src/config/database.js
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Optimize connection pool for cost
  max: 10,                    // Maximum connections
  min: 2,                     // Minimum connections
  idleTimeoutMillis: 30000,   // Close idle connections
  connectionTimeoutMillis: 2000,
  acquireTimeoutMillis: 60000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200
});

// Graceful shutdown
process.on('SIGINT', () => {
  pool.end(() => {
    console.log('Database pool has ended');
    process.exit(0);
  });
});

module.exports = pool;
```

## Storage Cost Optimization

### Storage Classes and Lifecycle Policies

#### AWS S3 Lifecycle Policy

```hcl
# s3-lifecycle.tf
resource "aws_s3_bucket_lifecycle_configuration" "app_data" {
  bucket = aws_s3_bucket.app_data.id
  
  rule {
    id     = "cost_optimization"
    status = "Enabled"
    
    # Transition to IA after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    
    # Transition to Glacier after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    
    # Transition to Deep Archive after 365 days
    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }
    
    # Delete incomplete multipart uploads
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
    
    # Delete old versions
    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }
    
    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}
```

#### Kubernetes Storage Optimization

```yaml
# storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cost-optimized
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
  namespace: mcp
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: cost-optimized
  resources:
    requests:
      storage: 10Gi
```

### Database Storage Optimization

```hcl
# rds-optimization.tf
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-${var.environment}-db"
  
  # Use cost-optimized instance class
  instance_class = "db.t3.micro"  # Burstable performance
  
  # Storage optimization
  storage_type          = "gp3"
  allocated_storage     = 20
  max_allocated_storage = 100  # Enable autoscaling
  
  # Performance Insights (free tier)
  performance_insights_enabled          = true
  performance_insights_retention_period = 7  # Free tier limit
  
  # Backup optimization
  backup_retention_period = 7   # Minimum for production
  backup_window          = "03:00-04:00"
  
  # Maintenance window
  maintenance_window = "sun:04:00-sun:05:00"
  
  # Enable deletion protection
  deletion_protection = var.environment == "prod"
  
  tags = {
    Environment = var.environment
    CostCenter  = "engineering"
  }
}
```

## Network Cost Optimization

### Data Transfer Optimization

#### CloudFront/CDN Configuration

```hcl
# cloudfront.tf
resource "aws_cloudfront_distribution" "main" {
  origin {
    domain_name = aws_s3_bucket.app_assets.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.app_assets.id}"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }
  
  enabled             = true
  default_root_object = "index.html"
  
  # Cost optimization: Use only required edge locations
  price_class = "PriceClass_100"  # US, Canada, Europe
  
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.app_assets.id}"
    compress               = true
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    cloudfront_default_certificate = true
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-cdn"
  }
}
```

#### VPC Endpoint Configuration

```hcl
# vpc-endpoints.tf
# S3 VPC Endpoint to avoid data transfer charges
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.aws_region}.s3"
  
  route_table_ids = aws_route_table.private[*].id
  
  tags = {
    Name = "${var.project_name}-${var.environment}-s3-endpoint"
  }
}

# DynamoDB VPC Endpoint
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.aws_region}.dynamodb"
  
  route_table_ids = aws_route_table.private[*].id
  
  tags = {
    Name = "${var.project_name}-${var.environment}-dynamodb-endpoint"
  }
}
```

## Monitoring and Analytics

### Cost Monitoring Setup

#### AWS Cost Explorer and Budgets

```hcl
# cost-monitoring.tf
resource "aws_budgets_budget" "monthly" {
  name         = "${var.project_name}-${var.environment}-monthly-budget"
  budget_type  = "COST"
  limit_amount = var.monthly_budget_limit
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
  
  cost_filters {
    tag {
      key = "Environment"
      values = [var.environment]
    }
  }
  
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = [var.budget_alert_email]
  }
  
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.budget_alert_email]
  }
}

# Cost anomaly detection
resource "aws_ce_anomaly_detector" "main" {
  name         = "${var.project_name}-${var.environment}-anomaly-detector"
  monitor_type = "DIMENSIONAL"
  
  specification = jsonencode({
    Dimension = "SERVICE"
    MatchOptions = ["EQUALS"]
    Values = ["Amazon Elastic Compute Cloud - Compute"]
  })
}

resource "aws_ce_anomaly_subscription" "main" {
  name      = "${var.project_name}-${var.environment}-anomaly-subscription"
  frequency = "DAILY"
  
  monitor_arn_list = [
    aws_ce_anomaly_detector.main.arn
  ]
  
  subscriber {
    type    = "EMAIL"
    address = var.budget_alert_email
  }
  
  threshold_expression {
    and {
      dimension {
        key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
        values        = ["100"]
        match_options = ["GREATER_THAN_OR_EQUAL"]
      }
    }
  }
}
```

#### Cost Monitoring Dashboard

```yaml
# cost-dashboard.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cost-dashboard
  namespace: monitoring
data:
  dashboard.json: |
    {
      "dashboard": {
        "title": "Cost Optimization Dashboard",
        "panels": [
          {
            "title": "Daily Costs by Service",
            "type": "graph",
            "targets": [
              {
                "expr": "aws_billing_estimated_charges{currency=\"USD\"}"
              }
            ]
          },
          {
            "title": "Resource Utilization",
            "type": "graph",
            "targets": [
              {
                "expr": "avg(rate(container_cpu_usage_seconds_total[5m])) by (pod)"
              },
              {
                "expr": "avg(container_memory_usage_bytes / container_spec_memory_limit_bytes) by (pod)"
              }
            ]
          },
          {
            "title": "Spot Instance Savings",
            "type": "stat",
            "targets": [
              {
                "expr": "sum(aws_ec2_spot_instance_savings)"
              }
            ]
          }
        ]
      }
    }
```

### Cost Optimization Metrics

```yaml
# cost-metrics.yaml
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: cost-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: cost-exporter
  endpoints:
  - port: metrics
    interval: 300s
    path: /metrics

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cost-exporter
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cost-exporter
  template:
    metadata:
      labels:
        app: cost-exporter
    spec:
      containers:
      - name: cost-exporter
        image: your-registry/cost-exporter:latest
        ports:
        - containerPort: 8080
          name: metrics
        env:
        - name: AWS_REGION
          value: us-west-2
        - name: PROMETHEUS_PORT
          value: "8080"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

## Automation and Policies

### Automated Cost Optimization

#### Lambda Function for Resource Cleanup

```python
# lambda/cost_optimizer.py
import boto3
import json
from datetime import datetime, timedelta

def lambda_handler(event, context):
    ec2 = boto3.client('ec2')
    rds = boto3.client('rds')
    
    # Stop unused EC2 instances
    stop_unused_instances(ec2)
    
    # Delete old snapshots
    cleanup_old_snapshots(ec2)
    
    # Stop non-production RDS instances during off-hours
    manage_rds_instances(rds)
    
    return {
        'statusCode': 200,
        'body': json.dumps('Cost optimization completed')
    }

def stop_unused_instances(ec2):
    # Get instances with low CPU utilization
    cloudwatch = boto3.client('cloudwatch')
    
    instances = ec2.describe_instances(
        Filters=[
            {'Name': 'instance-state-name', 'Values': ['running']},
            {'Name': 'tag:Environment', 'Values': ['dev', 'staging']}
        ]
    )
    
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            instance_id = instance['InstanceId']
            
            # Check CPU utilization for last 24 hours
            response = cloudwatch.get_metric_statistics(
                Namespace='AWS/EC2',
                MetricName='CPUUtilization',
                Dimensions=[
                    {'Name': 'InstanceId', 'Value': instance_id}
                ],
                StartTime=datetime.utcnow() - timedelta(days=1),
                EndTime=datetime.utcnow(),
                Period=3600,
                Statistics=['Average']
            )
            
            if response['Datapoints']:
                avg_cpu = sum(dp['Average'] for dp in response['Datapoints']) / len(response['Datapoints'])
                
                # Stop instances with < 5% CPU utilization
                if avg_cpu < 5:
                    print(f"Stopping underutilized instance: {instance_id}")
                    ec2.stop_instances(InstanceIds=[instance_id])

def cleanup_old_snapshots(ec2):
    # Delete snapshots older than 30 days
    snapshots = ec2.describe_snapshots(OwnerIds=['self'])
    
    cutoff_date = datetime.utcnow() - timedelta(days=30)
    
    for snapshot in snapshots['Snapshots']:
        if snapshot['StartTime'].replace(tzinfo=None) < cutoff_date:
            try:
                print(f"Deleting old snapshot: {snapshot['SnapshotId']}")
                ec2.delete_snapshot(SnapshotId=snapshot['SnapshotId'])
            except Exception as e:
                print(f"Error deleting snapshot {snapshot['SnapshotId']}: {e}")

def manage_rds_instances(rds):
    # Stop non-production RDS instances during off-hours (6 PM - 8 AM)
    current_hour = datetime.utcnow().hour
    
    if current_hour >= 18 or current_hour <= 8:
        instances = rds.describe_db_instances()
        
        for instance in instances['DBInstances']:
            db_instance_id = instance['DBInstanceIdentifier']
            
            # Check if it's a non-production instance
            tags = rds.list_tags_for_resource(
                ResourceName=instance['DBInstanceArn']
            )
            
            env_tag = next(
                (tag['Value'] for tag in tags['TagList'] if tag['Key'] == 'Environment'),
                None
            )
            
            if env_tag in ['dev', 'staging'] and instance['DBInstanceStatus'] == 'available':
                print(f"Stopping non-production RDS instance: {db_instance_id}")
                rds.stop_db_instance(DBInstanceIdentifier=db_instance_id)
```

#### Kubernetes CronJob for Resource Cleanup

```yaml
# resource-cleanup.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: resource-cleanup
  namespace: kube-system
spec:
  schedule: "0 2 * * *"  # Run daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: resource-cleanup
          containers:
          - name: cleanup
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              # Delete completed jobs older than 24 hours
              kubectl delete jobs --field-selector status.successful=1 -A --ignore-not-found=true
              
              # Delete failed jobs older than 7 days
              kubectl get jobs -A -o json | jq -r '.items[] | select(.status.failed > 0 and (.metadata.creationTimestamp | fromdateiso8601) < (now - 604800)) | "\(.metadata.namespace) \(.metadata.name)"' | while read namespace name; do
                kubectl delete job "$name" -n "$namespace" --ignore-not-found=true
              done
              
              # Delete unused PVCs
              kubectl get pvc -A -o json | jq -r '.items[] | select(.status.phase == "Available") | "\(.metadata.namespace) \(.metadata.name)"' | while read namespace name; do
                kubectl delete pvc "$name" -n "$namespace" --ignore-not-found=true
              done
          restartPolicy: OnFailure

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: resource-cleanup
  namespace: kube-system

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: resource-cleanup
rules:
- apiGroups: ["batch"]
  resources: ["jobs"]
  verbs: ["get", "list", "delete"]
- apiGroups: [""]
  resources: ["persistentvolumeclaims"]
  verbs: ["get", "list", "delete"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: resource-cleanup
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: resource-cleanup
subjects:
- kind: ServiceAccount
  name: resource-cleanup
  namespace: kube-system
```

## Multi-Cloud Cost Strategies

### Cloud Arbitrage

```hcl
# multi-cloud-arbitrage.tf
variable "workload_distribution" {
  description = "Distribution of workloads across clouds based on cost"
  type = map(object({
    percentage = number
    reason     = string
  }))
  default = {
    aws = {
      percentage = 60
      reason     = "Mature services, good spot pricing"
    }
    gcp = {
      percentage = 30
      reason     = "Sustained use discounts, preemptible instances"
    }
    azure = {
      percentage = 10
      reason     = "Hybrid benefits, dev/test pricing"
    }
  }
}

# Deploy based on cost optimization
resource "random_integer" "cloud_selector" {
  min = 1
  max = 100
}

locals {
  selected_cloud = (
    random_integer.cloud_selector.result <= var.workload_distribution.aws.percentage ? "aws" :
    random_integer.cloud_selector.result <= (var.workload_distribution.aws.percentage + var.workload_distribution.gcp.percentage) ? "gcp" :
    "azure"
  )
}
```

### Cross-Cloud Cost Comparison

```python
# scripts/cost_comparison.py
import boto3
import json
from google.cloud import billing
from azure.mgmt.consumption import ConsumptionManagementClient

def compare_costs():
    costs = {
        'aws': get_aws_costs(),
        'gcp': get_gcp_costs(),
        'azure': get_azure_costs()
    }
    
    # Find the most cost-effective cloud for each service
    recommendations = analyze_costs(costs)
    
    return recommendations

def get_aws_costs():
    ce = boto3.client('ce')
    
    response = ce.get_cost_and_usage(
        TimePeriod={
            'Start': '2023-01-01',
            'End': '2023-12-31'
        },
        Granularity='MONTHLY',
        Metrics=['BlendedCost'],
        GroupBy=[
            {'Type': 'DIMENSION', 'Key': 'SERVICE'}
        ]
    )
    
    return response['ResultsByTime']

def get_gcp_costs():
    # Implementation for GCP billing API
    pass

def get_azure_costs():
    # Implementation for Azure consumption API
    pass

def analyze_costs(costs):
    # Analyze and provide recommendations
    recommendations = []
    
    # Example recommendation logic
    if costs['gcp']['compute'] < costs['aws']['compute']:
        recommendations.append({
            'service': 'compute',
            'recommendation': 'Move compute workloads to GCP',
            'potential_savings': costs['aws']['compute'] - costs['gcp']['compute']
        })
    
    return recommendations

if __name__ == '__main__':
    recommendations = compare_costs()
    print(json.dumps(recommendations, indent=2))
```

## Cost Optimization Checklist

### Infrastructure Checklist

- [ ] **Compute Optimization**
  - [ ] Right-sized instances based on actual usage
  - [ ] Spot/preemptible instances enabled where appropriate
  - [ ] Reserved instances purchased for predictable workloads
  - [ ] Auto-scaling configured with appropriate thresholds
  - [ ] Unused instances identified and terminated

- [ ] **Storage Optimization**
  - [ ] Appropriate storage classes selected
  - [ ] Lifecycle policies implemented
  - [ ] Unused volumes identified and deleted
  - [ ] Snapshot retention policies configured
  - [ ] Data compression enabled where possible

- [ ] **Network Optimization**
  - [ ] CDN/CloudFront configured for static content
  - [ ] VPC endpoints configured to reduce data transfer
  - [ ] Appropriate regions selected to minimize latency and cost
  - [ ] Load balancer optimization implemented

### Kubernetes Checklist

- [ ] **Resource Management**
  - [ ] Resource requests and limits properly configured
  - [ ] Horizontal Pod Autoscaler (HPA) implemented
  - [ ] Vertical Pod Autoscaler (VPA) configured
  - [ ] Cluster autoscaler optimized
  - [ ] Resource quotas and limits enforced

- [ ] **Workload Optimization**
  - [ ] Pod disruption budgets configured
  - [ ] Node affinity rules for cost optimization
  - [ ] Spot instance tolerations configured
  - [ ] Multi-zone deployment for availability vs. cost balance

### Application Checklist

- [ ] **Performance Optimization**
  - [ ] Application profiling completed
  - [ ] Caching strategies implemented
  - [ ] Database connection pooling optimized
  - [ ] Container images optimized for size
  - [ ] Health checks configured for fast startup

- [ ] **Monitoring and Alerting**
  - [ ] Cost monitoring dashboards created
  - [ ] Budget alerts configured
  - [ ] Anomaly detection enabled
  - [ ] Resource utilization monitoring active
  - [ ] Cost optimization metrics tracked

### Automation Checklist

- [ ] **Automated Optimization**
  - [ ] Automated resource cleanup scheduled
  - [ ] Cost optimization policies implemented
  - [ ] Unused resource detection automated
  - [ ] Right-sizing recommendations automated
  - [ ] Cost reporting automated

- [ ] **Governance**
  - [ ] Tagging strategy implemented for cost allocation
  - [ ] Cost center assignments configured
  - [ ] Approval workflows for expensive resources
  - [ ] Regular cost reviews scheduled
  - [ ] Cost optimization training provided

### Multi-Cloud Checklist

- [ ] **Cross-Cloud Optimization**
  - [ ] Cost comparison analysis completed
  - [ ] Workload placement optimized by cost
  - [ ] Data transfer costs minimized
  - [ ] Cloud-specific discounts maximized
  - [ ] Arbitrage opportunities identified

Remember: Cost optimization is an ongoing process. Regularly review and adjust your strategies based on changing usage patterns, new cloud services, and evolving business requirements.