# Multi-Cloud Infrastructure Deployment Script (PowerShell)
# This script automates the deployment of the MCP infrastructure and applications

param(
    [Parameter(Position=0)]
    [ValidateSet("deploy", "destroy", "status", "help")]
    [string]$Command = "help",
    
    [string]$Environment = "dev",
    
    [string[]]$CloudProviders = @("aws"),
    
    [string]$PrimaryCloud = "aws"
)

# Configuration
$ProjectName = "mcp"
$TerraformDir = "infrastructure\terraform\multi-cloud"
$HelmDir = "infrastructure\helm"
$KubernetesDir = "infrastructure\kubernetes"

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Function to check if command exists
function Test-Command {
    param([string]$CommandName)
    return [bool](Get-Command $CommandName -ErrorAction SilentlyContinue)
}

# Function to check prerequisites
function Test-Prerequisites {
    Write-Status "Checking prerequisites..."
    
    $missingTools = @()
    
    # Check required tools
    if (-not (Test-Command "terraform")) {
        $missingTools += "terraform"
    }
    
    if (-not (Test-Command "kubectl")) {
        $missingTools += "kubectl"
    }
    
    if (-not (Test-Command "helm")) {
        $missingTools += "helm"
    }
    
    # Check cloud-specific tools
    foreach ($provider in $CloudProviders) {
        switch ($provider) {
            "aws" {
                if (-not (Test-Command "aws")) {
                    $missingTools += "aws-cli"
                }
            }
            "gcp" {
                if (-not (Test-Command "gcloud")) {
                    $missingTools += "gcloud"
                }
            }
            "azure" {
                if (-not (Test-Command "az")) {
                    $missingTools += "azure-cli"
                }
            }
        }
    }
    
    if ($missingTools.Count -gt 0) {
        Write-Error "Missing required tools: $($missingTools -join ', ')"
        Write-Error "Please install the missing tools and try again."
        exit 1
    }
    
    Write-Success "All prerequisites are met."
}

# Function to verify cloud authentication
function Test-CloudAuth {
    Write-Status "Verifying cloud provider authentication..."
    
    foreach ($provider in $CloudProviders) {
        switch ($provider) {
            "aws" {
                try {
                    $null = aws sts get-caller-identity 2>$null
                    Write-Success "AWS authentication verified."
                }
                catch {
                    Write-Error "AWS authentication failed. Please run 'aws configure' or set AWS credentials."
                    exit 1
                }
            }
            "gcp" {
                try {
                    $account = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null | Select-Object -First 1
                    if ([string]::IsNullOrEmpty($account)) {
                        throw "No active account"
                    }
                    Write-Success "GCP authentication verified."
                }
                catch {
                    Write-Error "GCP authentication failed. Please run 'gcloud auth login'."
                    exit 1
                }
            }
            "azure" {
                try {
                    $null = az account show 2>$null
                    Write-Success "Azure authentication verified."
                }
                catch {
                    Write-Error "Azure authentication failed. Please run 'az login'."
                    exit 1
                }
            }
        }
    }
}

# Function to initialize Terraform
function Initialize-Terraform {
    Write-Status "Initializing Terraform..."
    
    Push-Location $TerraformDir
    
    try {
        # Check if terraform.tfvars exists
        if (-not (Test-Path "terraform.tfvars")) {
            Write-Warning "terraform.tfvars not found. Creating from example..."
            Copy-Item "terraform.tfvars.example" "terraform.tfvars"
            Write-Warning "Please edit terraform.tfvars with your specific configuration before proceeding."
            Write-Warning "Press Enter to continue after editing terraform.tfvars, or Ctrl+C to exit."
            Read-Host
        }
        
        terraform init
        
        if ($LASTEXITCODE -ne 0) {
            throw "Terraform init failed"
        }
        
        Write-Success "Terraform initialized."
    }
    finally {
        Pop-Location
    }
}

# Function to plan Terraform deployment
function Invoke-TerraformPlan {
    Write-Status "Planning Terraform deployment..."
    
    Push-Location $TerraformDir
    
    try {
        terraform plan -out=tfplan
        
        if ($LASTEXITCODE -ne 0) {
            throw "Terraform plan failed"
        }
        
        Write-Success "Terraform plan completed. Review the plan above."
        Write-Warning "Press Enter to continue with deployment, or Ctrl+C to exit."
        Read-Host
    }
    finally {
        Pop-Location
    }
}

# Function to apply Terraform configuration
function Invoke-TerraformApply {
    Write-Status "Applying Terraform configuration..."
    
    Push-Location $TerraformDir
    
    try {
        terraform apply tfplan
        
        if ($LASTEXITCODE -ne 0) {
            throw "Terraform apply failed"
        }
        
        Write-Success "Infrastructure deployment completed."
    }
    finally {
        Pop-Location
    }
}

# Function to configure kubectl for all clusters
function Set-KubectlConfig {
    Write-Status "Configuring kubectl for deployed clusters..."
    
    Push-Location $TerraformDir
    
    try {
        foreach ($provider in $CloudProviders) {
            switch ($provider) {
                "aws" {
                    try {
                        $awsOutput = terraform output -json aws_infrastructure 2>$null | ConvertFrom-Json
                        $awsRegion = if ($awsOutput.region) { $awsOutput.region } else { "us-west-2" }
                        $clusterName = "$ProjectName-$Environment-aws"
                        
                        Write-Status "Configuring kubectl for AWS EKS cluster: $clusterName"
                        aws eks update-kubeconfig --region $awsRegion --name $clusterName
                    }
                    catch {
                        Write-Warning "Could not configure AWS EKS cluster. It may not be deployed yet."
                    }
                }
                "gcp" {
                    try {
                        $gcpOutput = terraform output -json gcp_infrastructure 2>$null | ConvertFrom-Json
                        $gcpZone = if ($gcpOutput.zone) { $gcpOutput.zone } else { "us-west1-a" }
                        $clusterName = "$ProjectName-$Environment-gcp"
                        
                        Write-Status "Configuring kubectl for GCP GKE cluster: $clusterName"
                        gcloud container clusters get-credentials $clusterName --zone $gcpZone
                    }
                    catch {
                        Write-Warning "Could not configure GCP GKE cluster. It may not be deployed yet."
                    }
                }
                "azure" {
                    try {
                        $resourceGroup = "$ProjectName-$Environment-azure"
                        $clusterName = "$ProjectName-$Environment-azure"
                        
                        Write-Status "Configuring kubectl for Azure AKS cluster: $clusterName"
                        az aks get-credentials --resource-group $resourceGroup --name $clusterName
                    }
                    catch {
                        Write-Warning "Could not configure Azure AKS cluster. It may not be deployed yet."
                    }
                }
            }
        }
        
        # Test cluster connectivity
        Write-Status "Testing cluster connectivity..."
        kubectl cluster-info
        kubectl get nodes
        
        Write-Success "kubectl configured successfully."
    }
    finally {
        Pop-Location
    }
}

# Function to deploy monitoring stack
function Deploy-Monitoring {
    Write-Status "Deploying monitoring stack..."
    
    # Create monitoring namespace
    kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy Prometheus
    Write-Status "Deploying Prometheus..."
    kubectl apply -f "$KubernetesDir\monitoring\prometheus-deployment.yaml"
    
    # Deploy Grafana
    Write-Status "Deploying Grafana..."
    kubectl apply -f "$KubernetesDir\monitoring\grafana-deployment.yaml"
    
    # Deploy Jaeger (for tracing)
    Write-Status "Deploying Jaeger..."
    kubectl apply -f "$KubernetesDir\monitoring\jaeger-deployment.yaml"
    
    Write-Success "Monitoring stack deployed."
}

# Function to deploy applications using Helm
function Deploy-Applications {
    Write-Status "Deploying applications using Helm..."
    
    # Create application namespace
    kubectl create namespace $ProjectName --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy backend
    Write-Status "Deploying backend application..."
    helm upgrade --install "$ProjectName-backend" "$HelmDir\backend" `
        --namespace $ProjectName `
        --set environment=$Environment `
        --set image.tag="latest" `
        --wait
    
    # Deploy frontend
    Write-Status "Deploying frontend application..."
    helm upgrade --install "$ProjectName-frontend" "$HelmDir\frontend" `
        --namespace $ProjectName `
        --set environment=$Environment `
        --set image.tag="latest" `
        --wait
    
    Write-Success "Applications deployed successfully."
}

# Function to display deployment information
function Show-DeploymentInfo {
    Write-Status "Deployment Information:"
    
    Write-Host ""
    Write-Host "=== Cluster Information ===" -ForegroundColor Cyan
    kubectl get nodes -o wide
    
    Write-Host ""
    Write-Host "=== Application Status ===" -ForegroundColor Cyan
    kubectl get pods -n $ProjectName
    
    Write-Host ""
    Write-Host "=== Services ===" -ForegroundColor Cyan
    kubectl get services -n $ProjectName
    
    Write-Host ""
    Write-Host "=== Ingress ===" -ForegroundColor Cyan
    kubectl get ingress -n $ProjectName
    
    Write-Host ""
    Write-Host "=== Monitoring ===" -ForegroundColor Cyan
    kubectl get pods -n monitoring
    
    # Get load balancer URLs if available
    Push-Location $TerraformDir
    
    try {
        foreach ($provider in $CloudProviders) {
            switch ($provider) {
                "aws" {
                    try {
                        $awsOutput = terraform output -json aws_infrastructure 2>$null | ConvertFrom-Json
                        $albDns = $awsOutput.alb_dns_name
                        if ($albDns -and $albDns -ne "N/A") {
                            Write-Host "AWS Load Balancer: https://$albDns" -ForegroundColor Green
                        }
                    }
                    catch {
                        # Ignore errors
                    }
                }
                "gcp" {
                    try {
                        $gcpOutput = terraform output -json gcp_infrastructure 2>$null | ConvertFrom-Json
                        $gcpIp = $gcpOutput.load_balancer_ip
                        if ($gcpIp -and $gcpIp -ne "N/A") {
                            Write-Host "GCP Load Balancer: https://$gcpIp" -ForegroundColor Green
                        }
                    }
                    catch {
                        # Ignore errors
                    }
                }
                "azure" {
                    try {
                        $azureOutput = terraform output -json azure_infrastructure 2>$null | ConvertFrom-Json
                        $azureIp = $azureOutput.load_balancer_ip
                        if ($azureIp -and $azureIp -ne "N/A") {
                            Write-Host "Azure Load Balancer: https://$azureIp" -ForegroundColor Green
                        }
                    }
                    catch {
                        # Ignore errors
                    }
                }
            }
        }
    }
    finally {
        Pop-Location
    }
    
    Write-Success "Deployment completed successfully!"
}

# Function to cleanup deployment
function Remove-Deployment {
    Write-Warning "This will destroy all infrastructure and applications. Are you sure? (y/N)"
    $response = Read-Host
    
    if ($response -match "^[Yy]$") {
        Write-Status "Cleaning up applications..."
        
        # Remove Helm releases
        try { helm uninstall "$ProjectName-backend" -n $ProjectName } catch { }
        try { helm uninstall "$ProjectName-frontend" -n $ProjectName } catch { }
        
        # Remove namespaces
        try { kubectl delete namespace $ProjectName --ignore-not-found=true } catch { }
        try { kubectl delete namespace monitoring --ignore-not-found=true } catch { }
        
        Write-Status "Destroying infrastructure..."
        Push-Location $TerraformDir
        
        try {
            terraform destroy -auto-approve
            Write-Success "Cleanup completed."
        }
        finally {
            Pop-Location
        }
    }
    else {
        Write-Status "Cleanup cancelled."
    }
}

# Function to show usage
function Show-Usage {
    Write-Host "Usage: .\deploy.ps1 [COMMAND] [OPTIONS]" -ForegroundColor White
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Yellow
    Write-Host "  deploy     Deploy infrastructure and applications"
    Write-Host "  destroy    Destroy infrastructure and applications"
    Write-Host "  status     Show deployment status"
    Write-Host "  help       Show this help message"
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  -Environment ENV        Set environment (default: dev)"
    Write-Host "  -CloudProviders ARRAY   Set cloud providers (default: @('aws'))"
    Write-Host "  -PrimaryCloud CLOUD     Set primary cloud provider (default: aws)"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Green
    Write-Host "  .\deploy.ps1 deploy"
    Write-Host "  .\deploy.ps1 deploy -Environment prod -CloudProviders @('aws','gcp')"
    Write-Host "  .\deploy.ps1 destroy"
    Write-Host "  .\deploy.ps1 status"
}

# Main execution
try {
    switch ($Command) {
        "deploy" {
            Write-Status "Starting deployment with environment: $Environment, clouds: $($CloudProviders -join ',')"
            Test-Prerequisites
            Test-CloudAuth
            Initialize-Terraform
            Invoke-TerraformPlan
            Invoke-TerraformApply
            Set-KubectlConfig
            Deploy-Monitoring
            Deploy-Applications
            Show-DeploymentInfo
        }
        "destroy" {
            Remove-Deployment
        }
        "status" {
            Show-DeploymentInfo
        }
        "help" {
            Show-Usage
        }
        default {
            Write-Error "Unknown command: $Command"
            Show-Usage
            exit 1
        }
    }
}
catch {
    Write-Error "An error occurred: $($_.Exception.Message)"
    exit 1
}