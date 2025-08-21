# Getting Started with Multi-Cloud Platform (MCP)

This guide will walk you through deploying the Multi-Cloud Platform step by step.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Configuration](#configuration)
4. [Deployment](#deployment)
5. [Verification](#verification)
6. [Next Steps](#next-steps)

## Prerequisites

### 1. Install Required Tools

#### Windows (using Chocolatey)

```powershell
# Install Chocolatey if not already installed
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install required tools
choco install terraform kubectl kubernetes-helm awscli

# For GCP (optional)
choco install gcloudsdk

# For Azure (optional)
choco install azure-cli
```

#### macOS (using Homebrew)

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required tools
brew install terraform kubectl helm awscli

# For GCP (optional)
brew install --cask google-cloud-sdk

# For Azure (optional)
brew install azure-cli
```

#### Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install Terraform
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://baltocdn.com/helm/signing.asc | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/helm.gpg] https://baltocdn.com/helm/stable/debian/ all main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list
sudo apt update && sudo apt install helm

# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# For GCP (optional)
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
sudo apt update && sudo apt install google-cloud-cli

# For Azure (optional)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### 2. Verify Tool Installation

```bash
# Check versions
terraform version
kubectl version --client
helm version
aws --version

# Optional: Check GCP and Azure CLI
gcloud version
az version
```

## Initial Setup

### 1. Clone or Download the Project

If you haven't already, ensure you have the MCP project files on your local machine.

### 2. Set Up Cloud Provider Authentication

#### AWS Setup

```bash
# Configure AWS CLI
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-west-2"

# Verify authentication
aws sts get-caller-identity
```

#### GCP Setup (Optional)

```bash
# Login to GCP
gcloud auth login

# Set default project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable compute.googleapis.com
gcloud services enable container.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable redis.googleapis.com

# Verify authentication
gcloud auth list
```

#### Azure Setup (Optional)

```bash
# Login to Azure
az login

# Set default subscription (if you have multiple)
az account set --subscription "Your Subscription Name"

# Verify authentication
az account show
```

## Configuration

### 1. Navigate to Terraform Directory

```bash
cd infrastructure/terraform/multi-cloud
```

### 2. Create Configuration File

```bash
# Copy the example configuration
cp terraform.tfvars.example terraform.tfvars

# Edit the configuration file
# Windows
notepad terraform.tfvars

# macOS
open -e terraform.tfvars

# Linux
nano terraform.tfvars
```

### 3. Basic Configuration Example

Here's a minimal configuration for AWS-only deployment:

```hcl
# terraform.tfvars

# General Configuration
project_name = "mcp"
environment = "dev"
cloud_providers = ["aws"]
primary_cloud_provider = "aws"

# AWS Configuration
aws_region = "us-west-2"
aws_availability_zones = ["us-west-2a", "us-west-2b", "us-west-2c"]

# Kubernetes Configuration
kubernetes_version = "1.28"
aws_eks_node_instance_type = "t3.medium"
aws_eks_node_group_min_size = 1
aws_eks_node_group_max_size = 3
aws_eks_node_group_desired_size = 2

# Database Configuration
postgresql_version = "15.4"
aws_rds_instance_class = "db.t3.micro"
aws_rds_allocated_storage = 20

# Enable basic features
enable_monitoring = true
enable_backup = true
enable_cost_optimization = true
```

### 4. Multi-Cloud Configuration Example

For deploying across multiple clouds:

```hcl
# terraform.tfvars

# General Configuration
project_name = "mcp"
environment = "prod"
cloud_providers = ["aws", "gcp", "azure"]
primary_cloud_provider = "aws"

# AWS Configuration
aws_region = "us-west-2"
aws_availability_zones = ["us-west-2a", "us-west-2b", "us-west-2c"]

# GCP Configuration
gcp_project_id = "your-gcp-project-id"
gcp_region = "us-west1"
gcp_zone = "us-west1-a"

# Azure Configuration
azure_location = "West US 2"

# Advanced Features
enable_vault = true
enable_service_mesh = true
enable_global_load_balancer = true
enable_centralized_monitoring = true
enable_cross_cloud_dr = true
```

## Deployment

### Option 1: Using PowerShell (Windows)

```powershell
# Navigate to project root
cd "e:\mcp project"

# Deploy with default settings (AWS only)
.\deploy.ps1 deploy

# Or deploy to multiple clouds
.\deploy.ps1 deploy -Environment prod -CloudProviders @('aws','gcp') -PrimaryCloud aws
```

### Option 2: Using Bash (Linux/macOS)

```bash
# Navigate to project root
cd "/path/to/mcp project"

# Make script executable
chmod +x deploy.sh

# Deploy with default settings (AWS only)
./deploy.sh deploy

# Or deploy to multiple clouds
./deploy.sh deploy --environment prod --cloud aws,gcp --primary-cloud aws
```

### Option 3: Manual Terraform Deployment

```bash
# Navigate to Terraform directory
cd infrastructure/terraform/multi-cloud

# Initialize Terraform
terraform init

# Plan the deployment
terraform plan -out=tfplan

# Apply the configuration
terraform apply tfplan

# Configure kubectl
aws eks update-kubeconfig --region us-west-2 --name mcp-dev-aws

# Deploy monitoring
kubectl apply -f ../../kubernetes/monitoring/

# Deploy applications using Helm
helm upgrade --install mcp-backend ../../helm/backend --namespace mcp --create-namespace
helm upgrade --install mcp-frontend ../../helm/frontend --namespace mcp
```

## Verification

### 1. Check Infrastructure

```bash
# Check Terraform outputs
cd infrastructure/terraform/multi-cloud
terraform output

# Check Kubernetes cluster
kubectl cluster-info
kubectl get nodes
```

### 2. Check Applications

```bash
# Check application pods
kubectl get pods -n mcp

# Check services
kubectl get services -n mcp

# Check ingress
kubectl get ingress -n mcp
```

### 3. Check Monitoring

```bash
# Check monitoring pods
kubectl get pods -n monitoring

# Get Grafana URL (if using LoadBalancer)
kubectl get service grafana -n monitoring
```

### 4. Access Applications

After deployment, the script will display URLs for accessing:

- Frontend application
- Backend API
- Grafana dashboards
- Prometheus metrics

## Next Steps

### 1. Customize Applications

- Modify Helm charts in `infrastructure/helm/`
- Update Kubernetes manifests in `infrastructure/kubernetes/`
- Configure monitoring dashboards

### 2. Set Up CI/CD

- Integrate with GitHub Actions, GitLab CI, or Jenkins
- Automate deployments across environments
- Set up automated testing

### 3. Configure Monitoring

- Set up custom Grafana dashboards
- Configure alerting rules
- Set up log aggregation

### 4. Implement Security

- Configure network policies
- Set up secrets management
- Enable security scanning

### 5. Optimize Costs

- Enable spot instances
- Configure autoscaling
- Set up cost monitoring

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   ```bash
   # Make scripts executable
   chmod +x deploy.sh
   ```

2. **Terraform State Lock**
   ```bash
   # Force unlock (use with caution)
   terraform force-unlock LOCK_ID
   ```

3. **Kubernetes Context Issues**
   ```bash
   # List contexts
   kubectl config get-contexts
   
   # Switch context
   kubectl config use-context CONTEXT_NAME
   ```

4. **Resource Quotas**
   - Check cloud provider quotas
   - Request quota increases if needed
   - Use smaller instance types for testing

### Getting Help

- Check the main [README.md](README.md) for detailed documentation
- Review Terraform and Kubernetes logs
- Check cloud provider documentation
- Open an issue in the project repository

## Cleanup

To destroy all resources:

```bash
# Using deployment script
./deploy.sh destroy

# Or manually
cd infrastructure/terraform/multi-cloud
terraform destroy
```

**Warning**: This will permanently delete all resources. Make sure you have backups if needed.