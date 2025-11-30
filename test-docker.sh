#!/bin/bash
# Test local Docker build before deploying to cloud

echo "🧪 Testing Local Docker Build"
echo "=============================="

# Build the image
echo "📦 Building Docker image..."
docker build -t pourover-timer:test . || exit 1

# Run container
echo "🚀 Starting container..."
docker run -d -p 3000:3000 --name pourover-test pourover-timer:test || exit 1

# Wait for startup
echo "⏳ Waiting for application to start..."
sleep 5

# Test health
echo "🏥 Testing health endpoint..."
if curl -f http://localhost:3000/api/brews > /dev/null 2>&1; then
    echo "✅ Health check passed!"
else
    echo "❌ Health check failed!"
    docker logs pourover-test
    docker stop pourover-test && docker rm pourover-test
    exit 1
fi

# Test UI
echo "🌐 Testing UI..."
if curl -f http://localhost:3000/ > /dev/null 2>&1; then
    echo "✅ UI accessible!"
else
    echo "❌ UI check failed!"
    docker logs pourover-test
    docker stop pourover-test && docker rm pourover-test
    exit 1
fi

# Cleanup
echo "🧹 Cleaning up..."
docker stop pourover-test && docker rm pourover-test

echo ""
echo "✅ All tests passed! Ready for cloud deployment."
echo ""
echo "Next steps:"
echo "  1. Deploy to GCP: ./deploy-gcp.sh"
echo "  2. Deploy to AWS: ./deploy-aws.sh"
echo "  3. Or use Make: make deploy-gcp"
