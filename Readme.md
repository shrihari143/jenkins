End-to-End CI/CD Pipeline Setup Documentation
From Zero to Deployment: AWS EC2 + Jenkins + Docker + Node.js

1. Overview
This guide documents the complete setup from launching an AWS EC2 instance to running a fully automated CI/CD pipeline for a Node.js app using Jenkins and Docker.

2. Step-by-Step Setup
2.1 Launch AWS EC2 Instance
Purpose:
Create a cloud server to host Jenkins and the application.

Steps:
Go to AWS EC2 Dashboard → Launch Instance

Choose:

AMI: Ubuntu 22.04 LTS

Instance Type: t2.micro (free tier)

Configure:

Security Group: Open ports 22 (SSH), 8080 (Jenkins), 3000 (Node.js App)

Launch with a key pair (e.g., jenkins-key.pem)

Why?
Ubuntu is lightweight and Docker-compatible.

Open ports allow Jenkins and the app to be accessible.

2.2 Connect to EC2 & Install Dependencies
Purpose:
Prepare the server with Docker, Jenkins, and Git.

Commands:
bash
# Connect to EC2
ssh -i "jenkins-key.pem" ubuntu@50.65.246.55

# Install Docker
sudo apt update
sudo apt install -y docker.io
sudo usermod -aG docker ubuntu  # Allow non-root Docker usage

# Install Jenkins
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io.key | sudo gpg --dearmor -o /usr/share/keyrings/jenkins-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.gpg] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt update
sudo apt install -y jenkins
sudo systemctl start jenkins

# Install Git
sudo apt install -y git
Why?
Docker runs containers, Jenkins automates CI/CD, Git fetches code.

usermod -aG docker ubuntu avoids sudo for Docker commands.

2.3 Configure Jenkins
Purpose:
Set up Jenkins for pipeline automation.

Steps:
Access Jenkins at http://50.65.246.55:8080

Unlock Jenkins:

bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
Install recommended plugins (Docker, Git, Pipeline).

Create an admin user.

Why?
Plugins enable Docker/Git integration for pipelines.

2.4 Set Up Jenkins Pipeline
Purpose:
Automate build, test, and deployment.

Steps:
In Jenkins, create a New Item → Pipeline.

Configure:

Pipeline Script from SCM → Git

Repository: https://github.com/shrihari143/jenkins.git

Script Path: Jenkinsfile

Jenkinsfile Contents:
groovy
pipeline {
    agent any
    environment {
        IMAGE_NAME = 'nodejs-app'
        CONTAINER_NAME = 'nodejs-container'
        HOST_IP = '50.65.246.55'  // EC2 IP
    }
    stages {
        stage('Build') {
            steps {
                sh 'docker build -t $IMAGE_NAME .'
            }
        }
        stage('Deploy') {
            steps {
                sh '''
                    docker stop $CONTAINER_NAME || true
                    docker rm $CONTAINER_NAME || true
                    docker run -d --name $CONTAINER_NAME -p 3000:3000 $IMAGE_NAME
                '''
            }
        }
    }
}
Why?
HOST_IP ensures health checks work (no localhost issues).

Pipeline automates everything from code change to deployment.

2.5 Test the Pipeline
Purpose:
Verify the app deploys successfully.

Steps:
Push a change to GitHub.

Jenkins automatically triggers the pipeline.

Check deployment:

bash
curl http://50.65.246.55:3000
Should return:

text
This project is deployed by CI/CD Jenkins...
Debugging Tips:
Jenkins Logs:

bash
sudo tail -f /var/log/jenkins/jenkins.log
Docker Logs:

bash
docker logs nodejs-container
3. Key Fixes & Lessons Learned
3.1 Fix: Docker Permission Denied
Error: Got permission denied while trying to connect to Docker daemon
Solution:

bash
sudo usermod -aG docker jenkins  # Add Jenkins to Docker group
sudo systemctl restart jenkins
3.2 Fix: Port 3000 Not Accessible
Error: curl: (7) Failed to connect to 50.65.246.55 port 3000
Solution:

Check EC2 Security Group → Allow inbound traffic on port 3000.

Verify Docker port mapping:

bash
docker ps  # Should show 0.0.0.0:3000->3000/tcp
4. Final Architecture
text
GitHub (Code) 
    → Jenkins (CI/CD) 
    → Docker (Containerization) 
    → EC2 (Hosting)
    → Accessible at http://50.65.246.55:3000
5. Improvements for Production
Use HTTPS: Add Nginx + Let’s Encrypt SSL.

Database: Add PostgreSQL/MongoDB containers.

Monitoring: Set up Prometheus + Grafana.