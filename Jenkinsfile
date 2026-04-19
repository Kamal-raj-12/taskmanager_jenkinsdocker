pipeline {
    agent any

    options {
        timestamps()
    }

    environment {
        DOCKERHUB_USER        = 'kamalraj12345'
        DOCKER_CREDENTIALS_ID = 'docker-hub-credentials'
        CLIENT_IMAGE          = "${DOCKERHUB_USER}/task-manager-client"
        SERVER_IMAGE          = "${DOCKERHUB_USER}/task-manager-server"
        IMAGE_TAG             = "${env.BUILD_NUMBER}"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Client Image') {
            steps {
                dir('client') {
                    sh """
                        docker build \
                            -t ${CLIENT_IMAGE}:${IMAGE_TAG} \
                            -t ${CLIENT_IMAGE}:latest \
                            .
                    """
                }
            }
        }

        stage('Build Server Image') {
            steps {
                dir('server') {
                    sh """
                        docker build \
                            -t ${SERVER_IMAGE}:${IMAGE_TAG} \
                            -t ${SERVER_IMAGE}:latest \
                            .
                    """
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: DOCKER_CREDENTIALS_ID,
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'

                    sh """
                        docker push ${CLIENT_IMAGE}:${IMAGE_TAG}
                        docker push ${CLIENT_IMAGE}:latest
                        docker push ${SERVER_IMAGE}:${IMAGE_TAG}
                        docker push ${SERVER_IMAGE}:latest
                    """
                }
            }
        }
    }

    post {
        always {
            sh 'docker logout || true'
            sh """
                docker rmi ${CLIENT_IMAGE}:${IMAGE_TAG} ${CLIENT_IMAGE}:latest || true
                docker rmi ${SERVER_IMAGE}:${IMAGE_TAG} ${SERVER_IMAGE}:latest || true
            """
        }
        success {
            echo "Images pushed successfully: ${CLIENT_IMAGE}:${IMAGE_TAG} and ${SERVER_IMAGE}:${IMAGE_TAG}"
        }
        failure {
            echo "Pipeline failed. Check the logs above for details."
        }
    }
}
