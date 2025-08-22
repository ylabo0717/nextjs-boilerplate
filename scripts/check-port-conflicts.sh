#!/bin/bash

# ==============================================================================
# Port Conflict Check Script
# 
# Dockerテスト実行前にポート競合をチェックし、競合している場合は
# 適切な解決方法を提案するスクリプト
# ==============================================================================

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default test ports
DEFAULT_TEST_PORTS=(3000 4318 5432 9090)
COMPOSE_FILE="docker/compose/docker-compose.test.yml"

# Function to display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    -f, --compose-file FILE     Specify docker-compose file (default: docker/compose/docker-compose.test.yml)
    -p, --ports PORT1,PORT2     Specify additional ports to check (comma-separated)
    --auto-resolve             Automatically stop conflicting containers
    --remove-orphans           Remove orphan containers before starting
    -h, --help                 Display this help message

Examples:
    $0                                    # Check default ports
    $0 -p 8080,9000                     # Check additional ports
    $0 --auto-resolve                    # Auto-resolve conflicts
    $0 --remove-orphans --auto-resolve  # Remove orphans and resolve conflicts
EOF
}

# Function to check if port is in use
check_port_usage() {
    local port=$1
    local pid
    pid=$(lsof -ti:$port 2>/dev/null || echo "")
    
    if [[ -n "$pid" ]]; then
        local process_info
        process_info=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
        echo "$pid:$process_info"
    else
        echo ""
    fi
}

# Function to get Docker containers using specific ports
get_docker_containers_on_port() {
    local port=$1
    docker ps --format "table {{.Names}}\t{{.Ports}}" | grep ":$port->" | awk '{print $1}' || echo ""
}

# Function to extract ports from docker-compose file
extract_ports_from_compose() {
    local compose_file=$1
    if [[ -f "$compose_file" ]]; then
        # Extract port mappings in format "host:container" or just "port"
        grep -E "^\s*-\s*['\"]?[0-9]+:?[0-9]*['\"]?" "$compose_file" | \
        sed -E "s/.*['\"]?([0-9]+):[0-9]+['\"]?.*/\1/" | \
        sort -nu || echo ""
    fi
}

# Function to stop conflicting containers
stop_conflicting_containers() {
    local port=$1
    local containers
    containers=$(get_docker_containers_on_port "$port")
    
    if [[ -n "$containers" ]]; then
        echo -e "${YELLOW}Stopping containers using port $port:${NC}"
        echo "$containers" | while read -r container; do
            if [[ -n "$container" ]]; then
                echo -e "  ${BLUE}Stopping container: $container${NC}"
                docker stop "$container" || echo -e "    ${RED}Failed to stop $container${NC}"
            fi
        done
        return 0
    else
        return 1
    fi
}

# Function to remove orphan containers
remove_orphan_containers() {
    local compose_file=$1
    echo -e "${YELLOW}Removing orphan containers...${NC}"
    docker compose -f "$compose_file" down --remove-orphans -v 2>/dev/null || {
        echo -e "${RED}Failed to remove orphan containers${NC}"
        return 1
    }
    echo -e "${GREEN}Orphan containers removed successfully${NC}"
}

# Main port conflict check function
check_port_conflicts() {
    local compose_file=$1
    local additional_ports=("${@:2}")
    local conflicts_found=false
    local all_ports=("${DEFAULT_TEST_PORTS[@]}")
    
    # Add additional ports if specified
    if [[ ${#additional_ports[@]:-0} -gt 0 ]]; then
        all_ports+=("${additional_ports[@]}")
    fi
    
    # Extract ports from compose file
    local compose_ports_str
    compose_ports_str=$(extract_ports_from_compose "$compose_file")
    if [[ -n "$compose_ports_str" ]]; then
        local compose_ports=()
        while IFS= read -r port; do
            if [[ -n "$port" ]]; then
                compose_ports+=("$port")
            fi
        done <<< "$compose_ports_str"
        all_ports+=("${compose_ports[@]}")
    fi
    
    # Remove duplicates, filter out invalid ports, and sort
    IFS=$'\n' all_ports=($(printf '%s\n' "${all_ports[@]}" | grep -E '^[1-9][0-9]*$' | sort -nu))
    
    echo -e "${BLUE}Checking port conflicts for Docker test environment...${NC}"
    echo -e "Compose file: ${compose_file}"
    echo -e "Checking ports: ${all_ports[*]}"
    echo ""
    
    for port in "${all_ports[@]}"; do
        if [[ -n "$port" && "$port" != "0" && "$port" -gt 0 ]]; then
            local usage_info
            usage_info=$(check_port_usage "$port")
            
            if [[ -n "$usage_info" ]]; then
                local pid process
                IFS=':' read -r pid process <<< "$usage_info"
                
                echo -e "${RED}❌ Port $port is in use${NC}"
                echo -e "   PID: $pid"
                echo -e "   Process: $process"
                
                # Check if it's a Docker container
                local docker_containers
                docker_containers=$(get_docker_containers_on_port "$port")
                if [[ -n "$docker_containers" ]]; then
                    echo -e "   Docker containers: $docker_containers"
                fi
                echo ""
                
                conflicts_found=true
            else
                echo -e "${GREEN}✅ Port $port is available${NC}"
            fi
        fi
    done
    
    if [[ "$conflicts_found" == true ]]; then
        return 1
    else
        echo -e "\n${GREEN}✅ All ports are available. Ready for Docker tests!${NC}"
        return 0
    fi
}

# Function to provide resolution suggestions
suggest_resolution() {
    echo -e "\n${YELLOW}🔧 Suggested resolutions:${NC}"
    echo ""
    echo -e "${BLUE}1. Stop development containers:${NC}"
    echo "   docker compose down"
    echo ""
    echo -e "${BLUE}2. Stop specific containers:${NC}"
    echo "   docker stop <container-name>"
    echo ""
    echo -e "${BLUE}3. Use auto-resolve option:${NC}"
    echo "   $0 --auto-resolve"
    echo ""
    echo -e "${BLUE}4. Remove orphan containers:${NC}"
    echo "   $0 --remove-orphans"
    echo ""
    echo -e "${BLUE}5. Manual cleanup:${NC}"
    echo "   docker system prune"
    echo "   docker compose -f $COMPOSE_FILE down --remove-orphans -v"
}

# Parse command line arguments
AUTO_RESOLVE=false
REMOVE_ORPHANS=false
ADDITIONAL_PORTS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--compose-file)
            COMPOSE_FILE="$2"
            shift 2
            ;;
        -p|--ports)
            IFS=',' read -ra ADDITIONAL_PORTS <<< "$2"
            shift 2
            ;;
        --auto-resolve)
            AUTO_RESOLVE=true
            shift
            ;;
        --remove-orphans)
            REMOVE_ORPHANS=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    # Check if docker is running
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
        exit 1
    fi
    
    # Check if compose file exists
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        echo -e "${RED}❌ Docker Compose file not found: $COMPOSE_FILE${NC}"
        exit 1
    fi
    
    # Remove orphan containers if requested
    if [[ "$REMOVE_ORPHANS" == true ]]; then
        remove_orphan_containers "$COMPOSE_FILE"
        echo ""
    fi
    
    # Check port conflicts
    if check_port_conflicts "$COMPOSE_FILE" "${ADDITIONAL_PORTS[@]+"${ADDITIONAL_PORTS[@]}"}"; then
        exit 0
    else
        if [[ "$AUTO_RESOLVE" == true ]]; then
            echo -e "\n${YELLOW}🔧 Auto-resolving port conflicts...${NC}"
            
            # Extract and resolve conflicts for each port
            local all_ports=("${DEFAULT_TEST_PORTS[@]}")
            if [[ ${#ADDITIONAL_PORTS[@]:-0} -gt 0 ]]; then
                all_ports+=("${ADDITIONAL_PORTS[@]}")
            fi
            
            local resolved_any=false
            for port in "${all_ports[@]}"; do
                if [[ -n "$port" && "$port" != "0" && "$port" -gt 0 && -n "$(check_port_usage "$port")" ]]; then
                    if stop_conflicting_containers "$port"; then
                        resolved_any=true
                    fi
                fi
            done
            
            if [[ "$resolved_any" == true ]]; then
                echo ""
                echo -e "${GREEN}✅ Conflicts resolved. Rechecking ports...${NC}"
                echo ""
                check_port_conflicts "$COMPOSE_FILE" "${ADDITIONAL_PORTS[@]+"${ADDITIONAL_PORTS[@]}"}"
            else
                echo -e "${RED}❌ Could not auto-resolve all conflicts${NC}"
                suggest_resolution
                exit 1
            fi
        else
            suggest_resolution
            exit 1
        fi
    fi
}

# Execute main function
main "$@"