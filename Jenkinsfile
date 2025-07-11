pipeline {
  agent any

  environment {
    IMAGE_NAME = 'nodejs-app'
    CONTAINER_NAME = 'nodejs-container'
  }

  stages {
    stage('Clone') {
      steps {
        git branch: 'main', url: 'https://github.com/shrihari143/jenkins.git'
      }
    }

    stage('Build Docker Image') {
      steps {
        sh 'docker build -t $IMAGE_NAME .'
      }
    }

    stage('Stop Old Container') {
      steps {
        sh '''
          docker stop $CONTAINER_NAME || true
          docker rm $CONTAINER_NAME || true
        '''
      }
    }

    stage('Run New Container') {
      steps {
        sh 'docker run -d --name $CONTAINER_NAME -p 3000:3000 $IMAGE_NAME'
      }
    }
  }

  post {
    success {
      echo 'Deployed successfully!'
    }
    failure {
      echo 'Build failed.'
    }
  }
}
