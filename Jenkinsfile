pipeline {
  agent any

  environment {
    IMAGE_NAME = 'nodejs-app'
    CONTAINER_NAME = 'nodejs-container'
  }

  stages {
    stage('Clone') {
      steps {
        git 'https://github.com/shrihari143/jenkins.git'
      }
    }

    stage('Build Docker Image') {
      steps {
        script {
          sh 'docker build -t $IMAGE_NAME .'
        }
      }
    }

    stage('Stop Old Container') {
      steps {
        script {
          sh '''
            docker stop $CONTAINER_NAME || true
            docker rm $CONTAINER_NAME || true
          '''
        }
      }
    }

    stage('Run New Container') {
      steps {
        script {
          sh 'docker run -d --name $CONTAINER_NAME -p 3000:3000 $IMAGE_NAME'
        }
      }
    }
  }

  post {
    success {
      echo 'App deployed successfully!'
    }
    failure {
      echo 'Build failed!'
    }
  }
}
