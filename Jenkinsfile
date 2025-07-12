pipeline {
    agent any
    environment {
        IMAGE_NAME = 'nodejs-app'
        CONTAINER_NAME = 'nodejs-container'
        DOCKER_HOST = 'unix:///var/run/docker.sock'  // Explicit Docker socket
    }
    options {
        timeout(time: 15, unit: 'MINUTES')  // Build timeout
        disableConcurrentBuilds()            // Prevent parallel runs
    }
    stages {
        stage('Verify Docker') {
            steps {
                script {
                    // Check Docker is available
                    sh '''
                        docker --version || { echo "ERROR: Docker not found!"; exit 1 }
                        docker info || { echo "ERROR: Cannot connect to Docker daemon"; exit 1 }
                    '''
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    docker build \
                        --no-cache \
                        --force-rm \
                        -t $IMAGE_NAME .
                '''
            }
            post {
                success {
                    echo "Successfully built Docker image: $IMAGE_NAME"
                }
                failure {
                    error "Failed to build Docker image"
                }
            }
        }

        stage('Stop Old Container') {
            steps {
                sh '''
                    if docker inspect $CONTAINER_NAME >/dev/null 2>&1; then
                        echo "Stopping existing container..."
                        docker stop $CONTAINER_NAME || true
                        docker rm $CONTAINER_NAME || true
                    else
                        echo "No existing container found"
                    fi
                '''
            }
        }

        stage('Run New Container') {
            steps {
                sh '''
                    docker run -d \
                        --name $CONTAINER_NAME \
                        -p 3000:3000 \
                        --restart unless-stopped \
                        $IMAGE_NAME
                '''
            }
            post {
                success {
                    echo "Container started successfully"
                    sh 'docker ps -f name=$CONTAINER_NAME'
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                retry(3) {  // Retry up to 3 times
                    script {
                        // Check if container is responding
                        def response = sh(
                            script: 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || true',
                            returnStdout: true
                        ).trim()
                        
                        if (response != "200") {
                            error "Application not responding (HTTP $response)"
                        }
                    }
                }
            }
        }
    }
    post {
        always {
            script {
                // Cleanup Docker artifacts
                sh '''
                    docker system prune -f --filter "until=24h" || true
                    docker volume prune -f || true
                '''
                
                // Archive logs if needed
                archiveArtifacts artifacts: '**/logs/*.log', allowEmptyArchive: true
            }
        }
        success {
            slackSend color: 'good', message: "SUCCESS: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        }
        failure {
            slackSend color: 'danger', message: "FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
            sh 'docker logs $CONTAINER_NAME --tail 50 || true'
        }
    }
}