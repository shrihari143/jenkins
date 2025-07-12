pipeline {
    agent any
    environment {
        IMAGE_NAME = 'nodejs-app'
        CONTAINER_NAME = 'nodejs-container'
        DOCKER_HOST = 'unix:///var/run/docker.sock'
        // Add this - replace with your actual server IP/hostname
        HOST_IP = '52.66.246.55' 
    }
    options {
        timeout(time: 15, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '5'))
    }
    stages {
        stage('Verify Environment') {
            steps {
                script {
                    def dockerVersion = sh(script: 'docker --version', returnStdout: true).trim()
                    echo "Docker Version: ${dockerVersion}"
                    
                    def socketPerms = sh(script: 'stat -c "%a %U:%G" /var/run/docker.sock', returnStdout: true).trim()
                    if (!socketPerms.contains('666') && !socketPerms.contains('docker')) {
                        error "Docker socket permissions insufficient: ${socketPerms}"
                    }
                }
            }
        }

        stage('Checkout Code') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/main']],
                    extensions: [],
                    userRemoteConfigs: [[url: 'https://github.com/shrihari143/jenkins.git']]
                ])
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
                    echo "Successfully built image ${IMAGE_NAME}"
                    sh 'docker images ${IMAGE_NAME}'
                }
            }
        }

        stage('Deploy Container') {
            steps {
                script {
                    def containerExists = sh(
                        script: "docker ps -a --filter name=${CONTAINER_NAME} --format '{{.Names}}'",
                        returnStdout: true
                    ).trim()
                    
                    if (containerExists) {
                        echo "Removing existing container: ${containerExists}"
                        sh "docker stop ${CONTAINER_NAME} || true"
                        sh "docker rm ${CONTAINER_NAME} || true"
                    }
                    
                    sh """
                        docker run -d \
                            --name ${CONTAINER_NAME} \
                            -p 3000:3000 \
                            --restart unless-stopped \
                            ${IMAGE_NAME}
                    """
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                retry(3) {
                    script {
                        // Changed from localhost to HOST_IP
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
                echo "Cleaning up Docker resources..."
                sh '''
                    docker system prune -f --filter "until=24h" || true
                    docker volume prune -f || true
                '''
                cleanWs()
            }
        }
        success {
            echo "Pipeline completed successfully!"
            echo "Application is available at: http://${HOST_IP}:3000"
        }
        failure {
            script {
                echo "Pipeline failed - checking container logs..."
                sh "docker logs ${CONTAINER_NAME} --tail 50 || true"
            }
        }
    }
}