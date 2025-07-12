pipeline {
    agent any
    environment {
        IMAGE_NAME = 'nodejs-app'
        CONTAINER_NAME = 'nodejs-container'
        DOCKER_HOST = 'unix:///var/run/docker.sock'
        HOST_IP = '52.66.246.55'  // Your EC2 instance IP
        DOCKER_BUILDKIT = '1'     // Enable buildkit for better builds
    }
    
    options {
        timeout(time: 10, unit: 'MINUTES')  // Reduced timeout
        disableConcurrentBuilds()            // Prevent parallel builds
        buildDiscarder(logRotator(numToKeepStr: '5'))  // Keep only 5 builds
        retry(0)                            // Disable automatic retries
    }
    
    stages {
        stage('System Diagnostics') {
            steps {
                script {
                    echo "=== PRE-BUILD SYSTEM STATE ==="
                    sh '''
                        echo "---- Memory/CPU ----"
                        free -h
                        echo "---- Disk Space ----"
                        df -h
                        echo "---- Docker Resources ----"
                        docker system df
                        echo "---- Network ----"
                        netstat -tulnp
                        docker network ls
                        echo "---- Existing Containers ----"
                        docker ps -a
                    '''
                }
            }
        }
        
        stage('Acquire Deployment Lock') {
            steps {
                lock(resource: 'docker-deploy-lock', inversePrecedence: true) {
                    echo "Acquired exclusive deployment lock"
                }
            }
        }
        
        stage('Verify Environment') {
            steps {
                script {
                    echo "=== ENVIRONMENT VERIFICATION ==="
                    def dockerVersion = sh(script: 'docker --version', returnStdout: true).trim()
                    echo "Docker Version: ${dockerVersion}"
                    
                    def socketPerms = sh(script: 'stat -c "%a %U:%G" /var/run/docker.sock', returnStdout: true).trim()
                    if (!socketPerms.contains('666') && !socketPerms.contains('docker')) {
                        error "Docker socket permissions insufficient: ${socketPerms}"
                    }
                    
                    sh 'docker system info'
                }
            }
        }
        
        stage('Checkout Code') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/main']],
                    extensions: [[$class: 'CleanBeforeCheckout']],  // Clean workspace first
                    userRemoteConfigs: [[url: 'https://github.com/shrihari143/jenkins.git']]
                ])
            }
        }
        
        stage('Clean Previous Build') {
            steps {
                script {
                    echo "Forcefully cleaning previous build artifacts"
                    sh '''
                        # Stop and remove any existing containers
                        docker stop ${CONTAINER_NAME} || true
                        docker rm -f ${CONTAINER_NAME} || true
                        
                        # Remove dangling images
                        docker image prune -f
                        
                        # Clean up network resources
                        docker network prune -f
                        
                        # Clean up build cache
                        docker builder prune -f
                        
                        # Clean up volumes
                        docker volume prune -f
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
                        --progress=plain \
                        -t $IMAGE_NAME .
                '''
            }
            post {
                success {
                    echo "Successfully built image ${IMAGE_NAME}"
                    sh 'docker images ${IMAGE_NAME}'
                }
            }
        }
        
        stage('Deploy Container') {
            steps {
                script {
                    echo "Starting container with resource limits"
                    sh """
                        docker run -d \
                            --name ${CONTAINER_NAME} \
                            -p 3000:3000 \
                            --memory=512m \
                            --cpus=1 \
                            --health-cmd="curl -f http://localhost:3000 || exit 1" \
                            --health-interval=5s \
                            --health-retries=3 \
                            --restart unless-stopped \
                            ${IMAGE_NAME}
                    """
                    
                    // Wait for container to be healthy
                    timeout(time: 1, unit: 'MINUTES') {
                        waitUntil {
                            def health = sh(
                                script: "docker inspect --format='{{.State.Health.Status}}' ${CONTAINER_NAME}",
                                returnStdout: true
                            ).trim()
                            echo "Container health status: ${health}"
                            return health == "healthy"
                        }
                    }
                }
            }
        }
        
        stage('Verify Deployment') {
            steps {
                retry(3) {
                    script {
                        def status = sh(
                            script: "curl -s -o /dev/null -w '%{http_code}' http://${HOST_IP}:3000 || true",
                            returnStdout: true
                        ).trim()
                        
                        if (status != '200') {
                            error "Application not healthy (HTTP ${status})"
                        }
                        echo "Application is running (HTTP ${status})"
                    }
                }
            }
        }
    }
    
    post {
        always {
            script {
                echo "=== POST-BUILD CLEANUP ==="
                sh '''
                    # Capture logs before cleanup
                    docker logs ${CONTAINER_NAME} --tail 100 > container.log || true
                    
                    # System cleanup
                    docker stop ${CONTAINER_NAME} || true
                    docker rm -f ${CONTAINER_NAME} || true
                    docker system prune -f --filter "until=1h"
                    
                    # Workspace cleanup
                    cleanWs()
                '''
                
                // Archive important logs
                archiveArtifacts artifacts: 'container.log', allowEmptyArchive: true
            }
        }
        success {
            echo "Pipeline completed successfully!"
            echo "Application is available at: http://${HOST_IP}:3000"
            
            // Optional: Send success notification
            slackSend(color: 'good', message: "SUCCESS: Job '${env.JOB_NAME}' [${env.BUILD_NUMBER}]")
        }
        failure {
            script {
                echo "=== FAILURE DIAGNOSTICS ==="
                sh '''
                    echo "---- Container Logs ----"
                    docker logs ${CONTAINER_NAME} --tail 100 || true
                    
                    echo "---- System Resources ----"
                    free -h
                    df -h
                    
                    echo "---- Docker Processes ----"
                    docker ps -a
                    docker stats --no-stream
                '''
                
                // Optional: Send failure notification
                slackSend(color: 'danger', message: "FAILED: Job '${env.JOB_NAME}' [${env.BUILD_NUMBER}]")
            }
        }
        unstable {
            echo "Pipeline marked as unstable"
        }
        aborted {
            echo "Pipeline aborted"
        }
    }
}