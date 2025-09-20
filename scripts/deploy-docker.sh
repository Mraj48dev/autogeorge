#!/bin/bash

# Script di deploy per AutoGeorge con Docker
# Utilizzo: ./scripts/deploy-docker.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.prod.yml"

echo "🚀 Deploying AutoGeorge in $ENVIRONMENT environment"
echo "=============================================="

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzioni helper
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verifica prerequisiti
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker not found. Please install Docker."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose not found. Please install Docker Compose."
        exit 1
    fi

    if [ ! -f ".env.production" ]; then
        log_error ".env.production file not found. Please create it from .env.example"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Build dell'applicazione
build_application() {
    log_info "Building application..."

    # Build immagine Docker
    docker build -t autogeorge:latest .

    log_success "Application built successfully"
}

# Backup database (se esiste)
backup_database() {
    log_info "Creating database backup..."

    # Controlla se il container del database esiste
    if docker-compose -f $COMPOSE_FILE ps postgres | grep -q "Up"; then
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"

        docker-compose -f $COMPOSE_FILE exec -T postgres pg_dump \
            -U ${POSTGRES_USER:-autogeorge} \
            -d ${POSTGRES_DB:-autogeorge_prod} > "backups/$BACKUP_FILE"

        log_success "Database backup created: backups/$BACKUP_FILE"
    else
        log_warning "No existing database found to backup"
    fi
}

# Deploy dei servizi
deploy_services() {
    log_info "Deploying services..."

    # Carica variabili d'ambiente
    export $(cat .env.production | xargs)

    # Stop servizi esistenti
    docker-compose -f $COMPOSE_FILE down

    # Start nuovi servizi
    docker-compose -f $COMPOSE_FILE up -d --build

    log_success "Services deployed successfully"
}

# Migrazione database
migrate_database() {
    log_info "Running database migrations..."

    # Aspetta che il database sia pronto
    log_info "Waiting for database to be ready..."
    sleep 10

    # Esegui migrazioni
    docker-compose -f $COMPOSE_FILE exec app npm run db:push

    # Setup database di produzione
    docker-compose -f $COMPOSE_FILE exec app npx tsx scripts/setup-production-db.ts

    log_success "Database migrations completed"
}

# Verifica salute servizi
health_check() {
    log_info "Performing health check..."

    # Aspetta che i servizi siano pronti
    sleep 30

    # Check applicazione
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        log_success "Application health check passed"
    else
        log_error "Application health check failed"
        return 1
    fi

    # Check database
    if docker-compose -f $COMPOSE_FILE exec postgres pg_isready -U ${POSTGRES_USER:-autogeorge} > /dev/null 2>&1; then
        log_success "Database health check passed"
    else
        log_error "Database health check failed"
        return 1
    fi

    log_success "All health checks passed"
}

# Cleanup
cleanup() {
    log_info "Cleaning up..."

    # Rimuovi immagini non utilizzate
    docker image prune -f

    # Rimuovi volumi non utilizzati
    docker volume prune -f

    log_success "Cleanup completed"
}

# Rollback in caso di errore
rollback() {
    log_error "Deploy failed. Performing rollback..."

    # Ferma i servizi correnti
    docker-compose -f $COMPOSE_FILE down

    # Qui potresti ripristinare l'immagine precedente
    # docker tag autogeorge:previous autogeorge:latest

    log_warning "Rollback completed. Please check logs and retry deployment."
    exit 1
}

# Main execution
main() {
    # Crea directory backup se non esiste
    mkdir -p backups

    # Trap per gestire errori
    trap rollback ERR

    check_prerequisites
    build_application
    backup_database
    deploy_services
    migrate_database
    health_check
    cleanup

    log_success "🎉 Deployment completed successfully!"
    log_info "Application is available at: http://localhost:3000"
    log_info "Admin panel: http://localhost:3000/admin"

    # Mostra status servizi
    echo ""
    log_info "Services status:"
    docker-compose -f $COMPOSE_FILE ps
}

# Esegui main se script chiamato direttamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi