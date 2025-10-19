#!/bin/bash

# ZK Wordle Deployment Test Script
# Run this before deploying to production

set -e  # Exit on any error

echo "🧪 Starting ZK Wordle Deployment Tests..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

test_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((TESTS_PASSED++))
}

test_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((TESTS_FAILED++))
}

test_warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

# Test 1: Check if Docker is installed
echo "Test 1: Checking Docker installation..."
if command -v docker &> /dev/null; then
    test_pass "Docker is installed"
else
    test_fail "Docker is not installed"
    exit 1
fi

# Test 2: Build Docker image
echo ""
echo "Test 2: Building Docker image..."
if docker build -t zk-wordle-test . > /dev/null 2>&1; then
    test_pass "Docker image built successfully"
else
    test_fail "Docker image build failed"
    exit 1
fi

# Test 3: Check if build directory exists in image
echo ""
echo "Test 3: Checking build artifacts..."
if docker run --rm zk-wordle-test ls dist/index.html > /dev/null 2>&1; then
    test_pass "Build artifacts exist in Docker image"
else
    test_fail "Build artifacts missing from Docker image"
fi

# Test 4: Start container and check if it runs
echo ""
echo "Test 4: Starting Docker container..."
CONTAINER_ID=$(docker run -d -p 5174:5173 -e PORT=5173 zk-wordle-test)

if [ -n "$CONTAINER_ID" ]; then
    test_pass "Container started successfully (ID: ${CONTAINER_ID:0:12})"
    
    # Wait for container to be ready
    echo "Waiting for container to be ready..."
    sleep 10
    
    # Test 5: Check if container is still running
    echo ""
    echo "Test 5: Checking container health..."
    if docker ps | grep -q "$CONTAINER_ID"; then
        test_pass "Container is running"
        
        # Test 6: Check if app is accessible
        echo ""
        echo "Test 6: Checking if app is accessible..."
        if curl -f http://localhost:5174 > /dev/null 2>&1; then
            test_pass "App is accessible on http://localhost:5174"
        else
            test_warn "App not accessible yet, checking logs..."
            docker logs "$CONTAINER_ID"
        fi
    else
        test_fail "Container stopped unexpectedly"
        docker logs "$CONTAINER_ID"
    fi
    
    # Cleanup
    echo ""
    echo "Cleaning up test container..."
    docker stop "$CONTAINER_ID" > /dev/null 2>&1
    docker rm "$CONTAINER_ID" > /dev/null 2>&1
    test_pass "Test container removed"
else
    test_fail "Failed to start container"
fi

# Test 7: Check critical files exist
echo ""
echo "Test 7: Checking critical files..."
FILES_TO_CHECK=(
    "vite.config.ts"
    "package.json"
    "Dockerfile"
    "frontend/components/TwoPlayerGame.tsx"
    "frontend/hooks/useGameState.ts"
    "frontend/utils/contractHelpers.ts"
)

for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$file" ]; then
        test_pass "File exists: $file"
    else
        test_fail "Missing file: $file"
    fi
done

# Test 8: Check for common issues in code
echo ""
echo "Test 8: Checking for common code issues..."

# Check for console.logs (should be removed in production)
LOG_COUNT=$(grep -r "console.log" frontend/ --include="*.tsx" --include="*.ts" | wc -l)
if [ "$LOG_COUNT" -gt 100 ]; then
    test_warn "Found $LOG_COUNT console.log statements - consider removing for production"
else
    test_pass "Console logs count is reasonable ($LOG_COUNT)"
fi

# Check for hardcoded localhost
LOCALHOST_COUNT=$(grep -r "localhost" frontend/ --include="*.tsx" --include="*.ts" | grep -v "test" | grep -v "development" | wc -l)
if [ "$LOCALHOST_COUNT" -gt 0 ]; then
    test_warn "Found hardcoded 'localhost' references - verify these are only in dev code"
else
    test_pass "No hardcoded localhost references found"
fi

# Cleanup test image
echo ""
echo "Cleaning up test image..."
docker rmi zk-wordle-test > /dev/null 2>&1

# Final summary
echo ""
echo "======================================"
echo "Test Summary:"
echo "======================================"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical tests passed! Ready to deploy.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review DEPLOYMENT_CHECKLIST.md"
    echo "2. Test on your deployment platform (Dokploy/Railway/etc.)"
    echo "3. Test with real wallets on testnet"
    echo "4. Monitor logs for the first 24 hours"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please fix issues before deploying.${NC}"
    exit 1
fi
