# jenkins-docker/Dockerfile
FROM jenkins/jenkins:lts

USER root

# Install Docker CLI
RUN apt-get update && apt-get install -y docker.io

# Give jenkins user access to docker group
RUN usermod -aG docker jenkins

USER jenkins
