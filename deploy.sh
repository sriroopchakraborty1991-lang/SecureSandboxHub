#!/bin/bash

# Multi-Cloud Infrastructure Deployment Script
# This script automates the deployment of the MCP infrastructure and applications

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="mcp"
ENVIRONMENT="dev"
CLOUD_PROVIDERS=("aws")  # Default to AWS only
PRIMARY_CLOUD="aws"
TERRAFORM_DIR="infrastructure/terraform/multi-cloud"
HELM_DIR="infrastructure/helm"
KUBERNETES_DIR="infrastructure/kubernetes"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing_tools=()
    
    # Check required tools
    if ! command_exists terraform; then
        missing_tools+=("terraform")
    fi
    
    if ! command_exists kubectl; then
        missing_tools+=("kubectl")
    fi
    
    if ! command_exists helm; then
        missing_tools+=("helm")
    fi
    
    # Check cloud-specific tools
    for provider in "${CLOUD_PROVIDERS[@]}"; do
        case $provider in
            "aws")
                if ! command_exists aws; then
                    missing_tools+=("aws-cli")
                fi
                ;;
            "gcp")
                if ! command_exists gcloud; then
                    missing_tools+=("gcloud")
                fi
                ;;
            "azure")
                if ! command_exists az; then
                    missing_tools+=("azure-cli")
                fi
                ;;
        esac
    done
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_error "Please install the missing tools and try again."
        exit 1
    fi
    
    print_success "All prerequisites are met."
}

# Function to verify cloud authentication
verify_cloud_auth() {
    print_status "Verifying cloud provider authentication..."
    
    for provider in "${CLOUD_PROVIDERS[@]}"; do
        case $provider in
            "aws")
                if ! aws sts get-caller-identity >/dev/null 2>&1; then
                    print_error "AWS authentication failed. Please run 'aws configure' or set AWS credentials."
                    exit 1
                fi
                print_success "AWS authentication verified."
                ;;
            "gcp")
                if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1 >/dev/null 2>&1; then
                    print_error "GCP authentication failed. Please run 'gcloud auth login'."
                    exit 1
                fi
                print_success "GCP authentication verified."
                ;;
            "azure")
                if ! az account show >/dev/null 2>&1; then
                    print_error "Azure authentication failed. Please run 'az login'."
                    exit 1
                fi
                print_success "Azure authentication verified."
                ;;
        esac
    done
}

# Function to initialize Terraform
init_terraform() {
    print_status "Initializing Terraform..."
    
    cd "$TERRAFORM_DIR"
    
    # Check if terraform.tfvars exists
    if [ ! -f "terraform.tfvars" ]; then
        print_warning "terraform.tfvars not found. Creating from example..."
        cp terraform.tfvars.example terraform.tfvars
        print_warning "Please edit terraform.tfvars with your specific configuration before proceeding."
        print_warning "Press Enter to continue after editing terraform.tfvars, or Ctrl+C to exit."
        read -r
    fi
    
    terraform init
    
    cd - >/dev/null
    print_success "Terraform initialized."
}

# Function to plan Terraform deployment
plan_terraform() {
    print_status "Planning Terraform deployment..."
    
    cd "$TERRAFORM_DIR"
    terraform plan -out=tfplan
    cd - >/dev/null
    
    print_success "Terraform plan completed. Review the plan above."
    print_warning "Press Enter to continue with deployment, or Ctrl+C to exit."
    read -r
}

# Function to apply Terraform configuration
apply_terraform() {
    print_status "Applying Terraform configuration..."
    
    cd "$TERRAFORM_DIR"
    terraform apply tfplan
    cd - >/dev/null
    
    print_success "Infrastructure deployment completed."
}

# Function to configure kubectl for all clusters
configure_kubectl() {
    print_status "Configuring kubectl for deployed clusters..."
    
    cd "$TERRAFORM_DIR"
    
    for provider in "${CLOUD_PROVIDERS[@]}"; do
        case $provider in
            "aws")
                local aws_region=$(terraform output -raw aws_infrastructure | jq -r '.region // "us-west-2"')
                local cluster_name="${PROJECT_NAME}-${ENVIRONMENT}-aws"
                
                print_status "Configuring kubectl for AWS EKS cluster: $cluster_name"
                aws eks update-kubeconfig --region "$aws_region" --name "$cluster_name"
                ;;
            "gcp")
                local gcp_zone=$(terraform output -raw gcp_infrastructure | jq -r '.zone // "us-west1-a"')
                local cluster_name="${PROJECT_NAME}-${ENVIRONMENT}-gcp"
                
                print_status "Configuring kubectl for GCP GKE cluster: $cluster_name"
                gcloud container clusters get-credentials "$cluster_name" --zone "$gcp_zone"
                ;;
            "azure")
                local resource_group="${PROJECT_NAME}-${ENVIRONMENT}-azure"
                local cluster_name="${PROJECT_NAME}-${ENVIRONMENT}-azure"
                
                print_status "Configuring kubectl for Azure AKS cluster: $cluster_name"
                az aks get-credentials --resource-group "$resource_group" --name "$cluster_name"
                ;;
        esac
    done
    
    cd - >/dev/null
    
    # Test cluster connectivity
    print_status "Testing cluster connectivity..."
    kubectl cluster-info
    kubectl get nodes
    
    print_success "kubectl configured successfully."
}

# Function to deploy monitoring stack
deploy_monitoring() {
    print_status "Deploying monitoring stack..."
    
    # Create monitoring namespace
    kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy Prometheus
    print_status "Deploying Prometheus..."
    kubectl apply -f "$KUBERNETES_DIR/monitoring/prometheus-deployment.yaml"
    
    # Deploy Grafana
    print_status "Deploying Grafana..."
    kubectl apply -f "$KUBERNETES_DIR/monitoring/grafana-deployment.yaml"
    
    # Deploy Jaeger (for tracing)
    print_status "Deploying Jaeger..."
    kubectl apply -f "$KUBERNETES_DIR/monitoring/jaeger-deployment.yaml"
    
    print_success "Monitoring stack deployed."
}

# Function to deploy applications using Helm
deploy_applications() {
    print_status "Deploying applications using Helm..."
    
    # Create application namespace
    kubectl create namespace "$PROJECT_NAME" --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy backend
    print_status "Deploying backend application..."
    helm upgrade --install "$PROJECT_NAME-backend" "$HELM_DIR/backend" \
        --namespace "$PROJECT_NAME" \
        --set environment="$ENVIRONMENT" \
        --set image.tag="latest" \
        --wait
    
    # Deploy frontend
    print_status "Deploying frontend application..."
    helm upgrade --install "$PROJECT_NAME-frontend" "$HELM_DIR/frontend" \
        --namespace "$PROJECT_NAME" \
        --set environment="$ENVIRONMENT" \
        --set image.tag="latest" \
        --wait
    
    print_success "Applications deployed successfully."
}

# Function to display deployment information
display_info() {
    print_status "Deployment Information:"
    
    echo ""
    echo "=== Cluster Information ==="
    kubectl get nodes -o wide
    
    echo ""
    echo "=== Application Status ==="
    kubectl get pods -n "$PROJECT_NAME"
    
    echo ""
    echo "=== Services ==="
    kubectl get services -n "$PROJECT_NAME"
    
    echo ""
    echo "=== Ingress ==="
    kubectl get ingress -n "$PROJECT_NAME"
    
    echo ""
    echo "=== Monitoring ==="
    kubectl get pods -n monitoring
    
    # Get load balancer URLs if available
    cd "$TERRAFORM_DIR"
    
    for provider in "${CLOUD_PROVIDERS[@]}"; do
        case $provider in
            "aws")
                local alb_dns=$(terraform output -raw aws_infrastructure 2>/dev/null | jq -r '.alb_dns_name // "N/A"')
                if [ "$alb_dns" != "N/A" ]; then
                    echo "AWS Load Balancer: https://$alb_dns"
                fi
                ;;
            "gcp")
                local gcp_ip=$(terraform output -raw gcp_infrastructure 2>/dev/null | jq -r '.load_balancer_ip // "N/A"')
                if [ "$gcp_ip" != "N/A" ]; then
                    echo "GCP Load Balancer: https://$gcp_ip"
                fi
                ;;
            "azure")
                local azure_ip=$(terraform output -raw azure_infrastructure 2>/dev/null | jq -r '.load_balancer_ip // "N/A"')
                if [ "$azure_ip" != "N/A" ]; then
                    echo "Azure Load Balancer: https://$azure_ip"
                fi
                ;;
        esac
    done
    
    cd - >/dev/null
    
    print_success "Deployment completed successfully!"
}

# Function to cleanup deployment
cleanup() {
    print_warning "This will destroy all infrastructure and applications. Are you sure? (y/N)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        print_status "Cleaning up applications..."
        
        # Remove Helm releases
        helm uninstall "$PROJECT_NAME-backend" -n "$PROJECT_NAME" 2>/dev/null || true
        helm uninstall "$PROJECT_NAME-frontend" -n "$PROJECT_NAME" 2>/dev/null || true
        
        # Remove namespaces
        kubectl delete namespace "$PROJECT_NAME" --ignore-not-found=true
        kubectl delete namespace monitoring --ignore-not-found=true
        
        print_status "Destroying infrastructure..."
        cd "$TERRAFORM_DIR"
        terraform destroy -auto-approve
        cd - >/dev/null
        
        print_success "Cleanup completed."
    else
        print_status "Cleanup cancelled."
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  deploy     Deploy infrastructure and applications"
    echo "  destroy    Destroy infrastructure and applications"
    echo "  status     Show deployment status"
    echo "  help       Show this help message"
    echo ""
    echo "Options:"
    echo "  --environment ENV    Set environment (default: dev)"
    echo "  --cloud PROVIDERS    Set cloud providers (default: aws)"
    echo "  --primary-cloud CLOUD Set primary cloud provider (default: aws)"
    echo ""
    echo "Examples:"
    echo "  $0 deploy"
    echo "  $0 deploy --environment prod --cloud aws,gcp"
    echo "  $0 destroy"
    echo "  $0 status"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --cloud)
                IFS=',' read -ra CLOUD_PROVIDERS <<< "$2"
                shift 2
                ;;
            --primary-cloud)
                PRIMARY_CLOUD="$2"
                shift 2
                ;;
            *)
                shift
                ;;
        esac
    done
}

# Main function
main() {
    local command="$1"
    shift
    
    parse_args "$@"
    
    case $command in
        "deploy")
            print_status "Starting deployment with environment: $ENVIRONMENT, clouds: ${CLOUD_PROVIDERS[*]}"
            check_prerequisites
            verify_cloud_auth
            init_terraform
            plan_terraform
            apply_terraform
            configure_kubectl
            deploy_monitoring
            deploy_applications
            display_info
            ;;
        "destroy")
            cleanup
            ;;
        "status")
            display_info
            ;;
        "help")
            show_usage
            ;;
        *)
            print_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [ $# -eq 0 ]; then
        show_usage
        exit 1
    fi
    
    main "$@"
fi