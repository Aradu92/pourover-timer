# ☕ Pourover Coffee Timer

A beautiful, interactive pourover coffee timer built with TypeScript, Node.js, and Tailwind CSS. **Cloud-native, containerized, and ready to scale from 1 to 1 million users on Kubernetes.**

## ✨ Features

### Timer & Brewing
- **Visual Timer**: Animated SVG graphic showing the pourover stages
- **Stage Tracking**: 4-stage pourover process with customizable timings
- **Audio Notifications**: Beep sound alerts when it's time for the next pour
- **Instructions**: Clear on-screen instructions for each pour (amount in grams)
- **Custom Recipes**: Create and save your own pour schedules with custom timings and weights
- **Recipe Library**: Save multiple recipes and quickly switch between them

### Analytics & Tracking
- **Detailed Brew Logging**: Track beans, origin, roast level, MASL, and tasting notes
- **Analytics Dashboard**: View statistics, trends, and insights from your brewing history
- **Advanced Filtering**: Filter brews by origin, roast level, and rating
- **Brew Management**: Delete saved brews with confirmation
- **Performance Insights**: Get recommendations based on your brewing data

### Cloud Native Features
- **Containerized**: Docker multi-stage builds for production optimization
- **Kubernetes Ready**: Full K8s manifests with auto-scaling (2-1000 pods)
- **Auto-Scaling**: Horizontal Pod Autoscaler based on CPU/Memory metrics
- **Multi-Cloud**: Deploy to GCP (GKE), AWS (EKS), or Azure (AKS)
- **CI/CD Pipeline**: GitHub Actions for automated build and deployment
- **Health Checks**: Liveness and readiness probes
- **Persistent Storage**: Shared data volume across pods
- **Production Ready**: Security hardened, non-root containers

## Pourover Process

1. **Bloom** (45s): Pour 50 grams of water
2. **First Pour** (45s): Pour 100 grams of water
3. **Second Pour** (45s): Pour 100 grams of water
4. **Final Pour** (45s): Pour 100 grams of water

Total brew time: 3 minutes
Total water: 350 grams

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the server
npm start
```

Open your browser to: http://localhost:3000

### Docker (Recommended for Production)

```bash
# Using Docker Compose
docker-compose up

# Or build and run manually
docker build -t pourover-timer .
docker run -p 3000:3000 pourover-timer
```

### Cloud Deployment

Choose your cloud provider:

**Google Cloud Platform (GKE) - Recommended:**
```bash
./deploy-gcp.sh
```

**Amazon Web Services (EKS):**
```bash
./deploy-aws.sh
```

**Using Makefile:**
```bash
make help              # Show all available commands
make docker-build      # Build Docker image
make deploy-gcp        # Deploy to Google Cloud
make k8s-status        # Check deployment status
```

📖 **Full deployment guide**: See [DEPLOYMENT.md](DEPLOYMENT.md)  
🏗️ **Architecture details**: See [ARCHITECTURE.md](ARCHITECTURE.md)

## 📱 Usage

1. Click **Start** to begin the timer with the default recipe
2. Follow the on-screen instructions for each pour
3. Listen for the beep sound when it's time for the next pour
4. Watch the animated visual indicator show your progress
5. When complete, enter your coffee beans, origin, roast level, and notes
6. Click the **📊 Analytics** tab to view statistics and insights

### Customizing Recipes

1. Click **⚙️ Customize Recipe** to open the recipe editor
2. Adjust the time (seconds) and water amount (grams) for each stage
3. Give your recipe a name
4. Click **💾 Save Recipe** to save it for later use
5. Click **✓ Apply** to use your custom recipe
6. Select saved recipes from the dropdown to load them

### Analytics & Insights

- View total brews, average ratings, and favorite origins
- Filter brews by origin, roast level, or rating
- See detailed brew logs with recipes used
- Get personalized brewing recommendations

## 📁 Project Structure

```
coffee/
├── src/
│   └── server.ts              # Express server with API endpoints
├── public/
│   ├── index.html             # Main UI with tabs (Timer/Analytics)
│   └── timer.js               # Timer logic, analytics, animations
├── data/
│   ├── brews.json             # Brew history (auto-created)
│   └── recipes.json           # Saved recipes (auto-created)
├── k8s/                       # Kubernetes manifests
│   ├── namespace.yaml         # K8s namespace
│   ├── deployment.yaml        # Pod deployment with auto-scaling
│   ├── service.yaml           # LoadBalancer service
│   ├── hpa.yaml               # Horizontal Pod Autoscaler (2-1000 pods)
│   ├── persistent-volume.yaml # Shared data storage
│   └── configmap.yaml         # Environment configuration
├── terraform/                 # Infrastructure as Code
│   ├── gcp-gke.tf             # Google Cloud GKE cluster
│   ├── aws-eks.tf             # AWS EKS cluster
│   └── variables.tf           # Terraform variables
├── .github/workflows/         # CI/CD pipeline
│   └── deploy.yml             # GitHub Actions deployment
├── Dockerfile                 # Multi-stage container build
├── docker-compose.yml         # Local container orchestration
├── Makefile                   # Deployment automation
├── package.json
└── tsconfig.json
```

## 🛠️ Technologies

- **Backend**: Node.js 18, Express, TypeScript
- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **Storage**: JSON file-based with persistent volumes
- **Audio**: Web Audio API
- **Container**: Docker multi-stage builds
- **Orchestration**: Kubernetes
- **Cloud**: GCP (GKE), AWS (EKS), Azure (AKS)
- **CI/CD**: GitHub Actions
- **IaC**: Terraform

## 🌐 API Endpoints

### Brews
- `GET /api/brews` - Get all saved brews
- `POST /api/brews` - Save a new brew
  - Body: `{ beans: string, rating: number }`
- `DELETE /api/brews/:id` - Delete a brew by ID

### Recipes
- `GET /api/recipes` - Get all saved recipes
- `POST /api/recipes` - Save a new recipe
  - Body: `{ name: string, stages: Array<{name: string, duration: number, waterAmount: number}> }`

Enjoy your perfect pourover! ☕
