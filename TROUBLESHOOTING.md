# Troubleshooting Guide - Multi-Cloud Platform (MCP)

This guide covers common issues and their solutions when deploying and operating the Multi-Cloud Platform.

## Table of Contents

1. [Prerequisites Issues](#prerequisites-issues)
2. [Authentication Problems](#authentication-problems)
3. [Terraform Issues](#terraform-issues)
4. [Kubernetes Issues](#kubernetes-issues)
5. [Application Deployment Issues](#application-deployment-issues)
6. [Monitoring Issues](#monitoring-issues)
7. [Network and Connectivity Issues](#network-and-connectivity-issues)
8. [Performance Issues](#performance-issues)
9. [Cost and Resource Issues](#cost-and-resource-issues)
10. [Multi-Cloud Specific Issues](#multi-cloud-specific-issues)

## Prerequisites Issues

### Tool Installation Problems

#### Issue: Command not found errors
```bash
terraform: command not found
kubectl: command not found
```

**Solution:**
```bash
# Verify PATH environment variable
echo $PATH

# Add tools to PATH (Linux/macOS)
export PATH=$PATH:/usr/local/bin

# Windows PowerShell
$env:PATH += ";C:\Program Files\Terraform"

# Reload shell or restart terminal
```

#### Issue: Version compatibility problems
```bash
Terraform version too old
Kubernetes version mismatch
```

**Solution:**
```bash
# Check current versions
terraform version
kubectl version
helm version

# Update tools
# macOS
brew upgrade terraform kubectl helm

# Windows
choco upgrade terraform kubernetes-cli kubernetes-helm

# Linux (Ubuntu)
sudo apt update && sudo apt upgrade terraform kubectl
```

### Permission Issues

#### Issue: Script execution denied
```bash
Permission denied: ./deploy.sh
```

**Solution:**
```bash
# Make script executable
chmod +x deploy.sh
chmod +x infrastructure/scripts/*.sh

# Windows PowerShell execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Authentication Problems

### AWS Authentication

#### Issue: Invalid credentials
```bash
Error: NoCredentialsError: Unable to locate credentials
```

**Solution:**
```bash
# Check AWS configuration
aws configure list
aws sts get-caller-identity

# Reconfigure if needed
aws configure

# Or use environment variables
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
export AWS_DEFAULT_REGION="us-west-2"
```

#### Issue: Insufficient permissions
```bash
Error: AccessDenied: User is not authorized to perform
```

**Solution:**
1. Ensure your AWS user has the following policies:
   - `AmazonEKSClusterPolicy`
   - `AmazonEKSWorkerNodePolicy`
   - `AmazonEKS_CNI_Policy`
   - `AmazonEC2ContainerRegistryReadOnly`
   - `AmazonRDSFullAccess`
   - `AmazonElastiCacheFullAccess`
   - `AmazonS3FullAccess`

2. Or create a custom policy with required permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "eks:*",
                "ec2:*",
                "rds:*",
                "elasticache:*",
                "s3:*",
                "iam:*",
                "logs:*"
            ],
            "Resource": "*"
        }
    ]
}
```

### GCP Authentication

#### Issue: Application Default Credentials not found
```bash
Error: google: could not find default credentials
```

**Solution:**
```bash
# Login to GCP
gcloud auth login

# Set application default credentials
gcloud auth application-default login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Verify
gcloud auth list
```

### Azure Authentication

#### Issue: Azure CLI not authenticated
```bash
Error: Please run 'az login' to setup account
```

**Solution:**
```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "Your Subscription"

# Verify
az account show
```

## Terraform Issues

### State Management

#### Issue: State file locked
```bash
Error: Error acquiring the state lock
```

**Solution:**
```bash
# Check lock info
terraform force-unlock LOCK_ID

# If using remote state, check DynamoDB table
aws dynamodb scan --table-name terraform-state-lock

# Delete stuck lock (use with caution)
aws dynamodb delete-item --table-name terraform-state-lock --key '{"LockID":{"S":"LOCK_ID"}}'
```

#### Issue: State file corruption
```bash
Error: Failed to load state
```

**Solution:**
```bash
# Backup current state
cp terraform.tfstate terraform.tfstate.backup

# Try to recover from backup
terraform state pull > recovered.tfstate
cp recovered.tfstate terraform.tfstate

# If using remote state
terraform state pull
```

### Resource Creation Issues

#### Issue: Resource already exists
```bash
Error: resource already exists
```

**Solution:**
```bash
# Import existing resource
terraform import aws_vpc.main vpc-12345678

# Or remove from state and recreate
terraform state rm aws_vpc.main
terraform apply
```

#### Issue: Resource quota exceeded
```bash
Error: Quota exceeded for resource
```

**Solution:**
1. **AWS**: Request quota increase in Service Quotas console
2. **GCP**: Request quota increase in IAM & Admin console
3. **Azure**: Submit support request for quota increase

```bash
# Check current quotas
# AWS
aws service-quotas list-service-quotas --service-code ec2

# GCP
gcloud compute project-info describe --project=YOUR_PROJECT

# Azure
az vm list-usage --location "West US 2"
```

### Provider Issues

#### Issue: Provider version conflicts
```bash
Error: Incompatible provider version
```

**Solution:**
```bash
# Update provider versions in versions.tf
terraform init -upgrade

# Or lock to specific versions
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

## Kubernetes Issues

### Cluster Access

#### Issue: Unable to connect to cluster
```bash
Error: Unable to connect to the server
```

**Solution:**
```bash
# Update kubeconfig
aws eks update-kubeconfig --region us-west-2 --name mcp-dev-aws

# Check current context
kubectl config current-context

# List available contexts
kubectl config get-contexts

# Switch context
kubectl config use-context CONTEXT_NAME
```

#### Issue: Permission denied in cluster
```bash
Error: User cannot list pods in namespace
```

**Solution:**
```bash
# Check current user
kubectl auth whoami

# Check permissions
kubectl auth can-i list pods
kubectl auth can-i list pods --namespace=mcp

# Add user to cluster (EKS)
kubectl edit configmap aws-auth -n kube-system
```

### Pod Issues

#### Issue: Pods stuck in Pending state
```bash
NAME                 READY   STATUS    RESTARTS   AGE
backend-xxx          0/1     Pending   0          5m
```

**Solution:**
```bash
# Check pod events
kubectl describe pod backend-xxx

# Check node resources
kubectl top nodes
kubectl describe nodes

# Check for resource constraints
kubectl get limitrange
kubectl get resourcequota
```

#### Issue: Pods crashing (CrashLoopBackOff)
```bash
NAME                 READY   STATUS             RESTARTS   AGE
backend-xxx          0/1     CrashLoopBackOff   5          5m
```

**Solution:**
```bash
# Check pod logs
kubectl logs backend-xxx
kubectl logs backend-xxx --previous

# Check pod events
kubectl describe pod backend-xxx

# Check resource limits
kubectl get pod backend-xxx -o yaml | grep -A 10 resources
```

### Service Issues

#### Issue: Service not accessible
```bash
Error: Connection refused
```

**Solution:**
```bash
# Check service endpoints
kubectl get endpoints

# Check service configuration
kubectl describe service backend

# Test service connectivity
kubectl run test-pod --image=busybox --rm -it -- wget -qO- http://backend:8080/health

# Check network policies
kubectl get networkpolicies
```

## Application Deployment Issues

### Helm Issues

#### Issue: Helm chart deployment fails
```bash
Error: failed to install chart
```

**Solution:**
```bash
# Check Helm version
helm version

# Debug chart
helm install --dry-run --debug mcp-backend ./infrastructure/helm/backend

# Check chart syntax
helm lint ./infrastructure/helm/backend

# Check values
helm get values mcp-backend
```

#### Issue: Helm release stuck
```bash
Error: another operation is in progress
```

**Solution:**
```bash
# Check release status
helm list
helm status mcp-backend

# Rollback if needed
helm rollback mcp-backend 1

# Force delete if stuck
helm delete mcp-backend --no-hooks
```

### Image Issues

#### Issue: Image pull errors
```bash
Error: Failed to pull image
```

**Solution:**
```bash
# Check image exists
docker pull your-image:tag

# Check image pull secrets
kubectl get secrets
kubectl describe secret regcred

# Create image pull secret if needed
kubectl create secret docker-registry regcred \
  --docker-server=your-registry \
  --docker-username=your-username \
  --docker-password=your-password
```

## Monitoring Issues

### Prometheus Issues

#### Issue: Prometheus not scraping targets
```bash
Targets showing as down in Prometheus UI
```

**Solution:**
```bash
# Check Prometheus configuration
kubectl get configmap prometheus-config -o yaml

# Check service discovery
kubectl logs prometheus-xxx -c prometheus

# Check network connectivity
kubectl exec prometheus-xxx -- wget -qO- http://target-service:port/metrics
```

### Grafana Issues

#### Issue: Grafana dashboards not loading
```bash
Dashboard shows "No data"
```

**Solution:**
```bash
# Check Grafana data sources
kubectl logs grafana-xxx

# Check Prometheus connectivity from Grafana
kubectl exec grafana-xxx -- wget -qO- http://prometheus:9090/api/v1/query?query=up

# Import dashboards manually
kubectl apply -f infrastructure/kubernetes/monitoring/grafana-dashboards.yaml
```

## Network and Connectivity Issues

### DNS Issues

#### Issue: DNS resolution failures
```bash
Error: Name resolution failed
```

**Solution:**
```bash
# Check CoreDNS
kubectl get pods -n kube-system | grep coredns
kubectl logs -n kube-system coredns-xxx

# Test DNS resolution
kubectl run test-dns --image=busybox --rm -it -- nslookup kubernetes.default

# Check DNS configuration
kubectl get configmap coredns -n kube-system -o yaml
```

### Ingress Issues

#### Issue: Ingress not routing traffic
```bash
Error: 404 Not Found
```

**Solution:**
```bash
# Check ingress controller
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx ingress-nginx-controller-xxx

# Check ingress configuration
kubectl describe ingress mcp-ingress

# Check backend services
kubectl get endpoints
```

### Load Balancer Issues

#### Issue: Load balancer not provisioned
```bash
Service stuck in Pending state
```

**Solution:**
```bash
# Check service events
kubectl describe service mcp-frontend

# Check cloud provider quotas
# AWS
aws elbv2 describe-load-balancers

# Check security groups
aws ec2 describe-security-groups
```

## Performance Issues

### Resource Constraints

#### Issue: High CPU/Memory usage
```bash
Pods being OOMKilled or throttled
```

**Solution:**
```bash
# Check resource usage
kubectl top pods
kubectl top nodes

# Check resource requests/limits
kubectl describe pod backend-xxx | grep -A 10 Limits

# Adjust resource limits
kubectl patch deployment backend -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"limits":{"memory":"1Gi","cpu":"500m"}}}]}}}}'
```

### Scaling Issues

#### Issue: Autoscaler not working
```bash
HPA shows unknown metrics
```

**Solution:**
```bash
# Check HPA status
kubectl get hpa
kubectl describe hpa backend-hpa

# Check metrics server
kubectl get pods -n kube-system | grep metrics-server
kubectl logs -n kube-system metrics-server-xxx

# Check cluster autoscaler
kubectl logs -n kube-system cluster-autoscaler-xxx
```

## Cost and Resource Issues

### Unexpected Costs

#### Issue: High cloud bills
```bash
Unexpected charges in cloud billing
```

**Solution:**
```bash
# Check running resources
# AWS
aws ec2 describe-instances --query 'Reservations[].Instances[?State.Name==`running`]'
aws rds describe-db-instances
aws elasticache describe-cache-clusters

# Enable cost monitoring
aws budgets create-budget --account-id ACCOUNT_ID --budget file://budget.json

# Use spot instances
terraform apply -var="enable_spot_instances=true"
```

### Resource Cleanup

#### Issue: Resources not cleaned up
```bash
Resources remain after terraform destroy
```

**Solution:**
```bash
# Check for remaining resources
aws ec2 describe-instances
aws rds describe-db-instances
aws eks describe-cluster --name cluster-name

# Manual cleanup if needed
aws eks delete-cluster --name cluster-name
aws rds delete-db-instance --db-instance-identifier db-name --skip-final-snapshot

# Check for orphaned resources
aws resourcegroupstaggingapi get-resources --tag-filters Key=Environment,Values=dev
```

## Multi-Cloud Specific Issues

### Cross-Cloud Connectivity

#### Issue: Services can't communicate across clouds
```bash
Connection timeout between AWS and GCP services
```

**Solution:**
```bash
# Check VPN/peering connections
# AWS
aws ec2 describe-vpn-connections
aws ec2 describe-vpc-peering-connections

# GCP
gcloud compute vpn-tunnels list
gcloud compute networks peerings list

# Check firewall rules
aws ec2 describe-security-groups
gcloud compute firewall-rules list
```

### Service Mesh Issues

#### Issue: Istio not working across clusters
```bash
Services not discovered in service mesh
```

**Solution:**
```bash
# Check Istio installation
kubectl get pods -n istio-system
istioctl proxy-status

# Check multi-cluster configuration
istioctl describe service backend
kubectl get endpoints istio-eastwestgateway -n istio-system

# Check certificates
kubectl get secret cacerts -n istio-system
```

## Getting Additional Help

### Diagnostic Commands

```bash
# Comprehensive cluster info
kubectl cluster-info dump > cluster-info.txt

# Get all resources
kubectl get all --all-namespaces > all-resources.txt

# Export Terraform state
terraform show > terraform-state.txt

# Cloud provider specific diagnostics
# AWS
aws support describe-cases

# GCP
gcloud logging read "severity>=ERROR" --limit=50

# Azure
az monitor activity-log list --max-events 50
```

### Log Collection

```bash
# Collect application logs
kubectl logs -l app=backend --tail=100 > backend-logs.txt
kubectl logs -l app=frontend --tail=100 > frontend-logs.txt

# Collect system logs
kubectl logs -n kube-system -l k8s-app=kube-dns > dns-logs.txt
kubectl logs -n kube-system -l app=cluster-autoscaler > autoscaler-logs.txt
```

### Support Resources

1. **Documentation**:
   - [Terraform Documentation](https://www.terraform.io/docs)
   - [Kubernetes Documentation](https://kubernetes.io/docs)
   - [Helm Documentation](https://helm.sh/docs)

2. **Cloud Provider Support**:
   - AWS Support Center
   - GCP Support Console
   - Azure Support Center

3. **Community Resources**:
   - Stack Overflow
   - Kubernetes Slack
   - Terraform Community Forum

4. **Monitoring and Alerting**:
   - Set up proper monitoring to catch issues early
   - Configure alerts for critical metrics
   - Use distributed tracing for complex issues

Remember to always backup your data and test changes in a non-production environment first!