Jenkins CI/CD Pipeline Documentation
Project: Node.js Application Deployment with Docker
Author: Shrihari
Date: [Current Date]

1. Overview
This document explains the Jenkins CI/CD pipeline used to automate the deployment of a Node.js application using Docker. The pipeline includes:
✅ Code checkout
✅ Docker image building
✅ Container deployment
✅ Health verification
✅ Cleanup

2. Pipeline Steps & Explanation
2.1 Environment Setup
Purpose:
Ensure Docker is available and permissions are correct.

Code:
groovy
environment {
    IMAGE_NAME = 'nodejs-app'          // Docker image name
    CONTAINER_NAME = 'nodejs-container' // Docker container name
    DOCKER_HOST = 'unix:///var/run/docker.sock' // Docker socket
    HOST_IP = '50.65.246.55'           // Server IP for health checks
}
Why?
DOCKER_HOST ensures Jenkins uses the host’s Docker daemon.

HOST_IP is needed because Jenkins (running in a container) cannot access localhost—it must use the host’s IP.

2.2 Verify Environment
Purpose:
Check if Docker is installed and the socket has proper permissions.

Code:
groovy
stage('Verify Environment') {
    steps {
        script {
            sh 'docker --version'  // Check Docker CLI
            sh 'docker info'       // Verify Docker daemon access
        }
    }
}
Why?
Prevents failures later in the pipeline if Docker is missing.

Ensures Jenkins has permissions to use Docker (/var/run/docker.sock).

2.3 Checkout Code
Purpose:
Fetch the latest code from GitHub.

Code:
groovy
stage('Checkout Code') {
    steps {
        checkout scm  // Checks out the Git repository
    }
}
Why?
Uses Jenkins’ built-in checkout scm to clone the repo.

Ensures the latest Jenkinsfile and application code are used.

2.4 Build Docker Image
Purpose:
Create a Docker image from the Dockerfile.

Code:
groovy
stage('Build Docker Image') {
    steps {
        sh '''
            docker build \
                --no-cache \      // Ensures fresh dependencies
                --force-rm \      // Cleans up intermediate containers
                -t $IMAGE_NAME .
        '''
    }
}
Why?
--no-cache avoids cached layers (ensures clean builds).

--force-rm removes temporary containers to save space.

2.5 Deploy Container
Purpose:
Stop any old container and start a new one.

Code:
groovy
stage('Deploy Container') {
    steps {
        script {
            // Stop & remove old container if it exists
            sh '''
                if docker ps -a --format "{{.Names}}" | grep -q $CONTAINER_NAME; then
                    docker stop $CONTAINER_NAME || true
                    docker rm $CONTAINER_NAME || true
                fi
            '''
            
            // Start new container
            sh """
                docker run -d \
                    --name $CONTAINER_NAME \
                    -p 3000:3000 \          // Maps host:container ports
                    --restart unless-stopped \ // Auto-restart on crashes
                    $IMAGE_NAME
            """
        }
    }
}
Why?
-p 3000:3000 exposes the container’s port 3000 on the host.

--restart unless-stopped ensures the app restarts if it crashes.

2.6 Verify Deployment
Purpose:
Ensure the app is running and accessible.

Code:
groovy
stage('Verify Deployment') {
    steps {
        retry(3) {  // Retry 3 times if health check fails
            script {
                def status = sh(
                    script: "curl -s -o /dev/null -w '%{http_code}' http://${HOST_IP}:3000",
                    returnStdout: true
                ).trim()
                
                if (status != '200') {
                    sh "docker logs ${CONTAINER_NAME} --tail 50"  // Debug logs
                    error "Application not healthy (HTTP ${status})"
                }
                echo "Application is running (HTTP ${status})"
            }
        }
    }
}
Why?
Uses curl to check if the app returns HTTP 200.

If fails, it shows the last 50 lines of logs for debugging.

Retries 3 times in case of temporary issues.

2.7 Post-Build Actions
Purpose:
Clean up resources and notify results.

Code:
groovy
post {
    always {
        echo "Cleaning up Docker resources..."
        sh '''
            docker system prune -f --filter "until=24h" || true
            docker volume prune -f || true
        '''
        cleanWs()  // Cleans Jenkins workspace
    }
    success {
        echo "Pipeline succeeded! Access your app at: http://${HOST_IP}:3000"
    }
    failure {
        echo "Pipeline failed - checking container logs..."
        sh "docker logs ${CONTAINER_NAME} --tail 100 || true"
    }
}
Why?
docker system prune removes unused containers/images.

cleanWs() frees up disk space in Jenkins.

Provides deployment URL on success (http://50.65.246.55:3000).

3. Key Learnings & Fixes
3.1 Problem: "Cannot Reach localhost:3000"
❌ Error: Jenkins (in a container) couldn’t access localhost:3000.
✅ Fix: Used HOST_IP (server IP) instead of localhost.

3.2 Problem: Docker Permission Errors
❌ Error: Got permission denied while trying to connect to the Docker daemon.
✅ Fix:

Mounted Docker socket with -v /var/run/docker.sock:/var/run/docker.sock.

Set chmod 666 /var/run/docker.sock (or --group-add).

3.3 Problem: Port Not Accessible
❌ Error: HTTP 000 (connection refused).
✅ Fix:

Ensured -p 3000:3000 was in docker run.

Opened port 3000 in firewall/security groups.

4. Final Notes
✔ Pipeline Works Now: Builds, deploys, and verifies the app.
✔ Access App At: http://50.65.246.55:3000.
✔ Future Improvements:

Add Slack notifications.

Use Docker Compose for multi-container apps.

Implement rolling updates.