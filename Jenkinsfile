pipeline {
    agent any

    options {
        timestamps()
        skipDefaultCheckout(true)
    }

    environment {
        DOCKERHUB_USER        = 'kamalraj12345'
        DOCKER_CREDENTIALS_ID = 'docker-hub-credentials'
        CLIENT_IMAGE          = "${DOCKERHUB_USER}/task-manager-client"
        SERVER_IMAGE          = "${DOCKERHUB_USER}/task-manager-server"
        IMAGE_TAG             = "${env.BUILD_NUMBER}"
        K8S_NAMESPACE         = 'task-manager'
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

        stage('Deploy to Kubernetes') {
            steps {
                sh '''
                    if ! command -v kubectl >/dev/null 2>&1; then
                        echo "kubectl is required on the Jenkins node for Kubernetes deployment."
                        exit 1
                    fi

                    kubectl version --client

                    kubectl apply -f k8s/namespace.yaml
                    kubectl apply -f k8s/mongo.yaml
                    kubectl apply -f k8s/backend.yaml
                    kubectl apply -f k8s/frontend.yaml

                    kubectl set image deployment/task-manager-server task-manager-server=${SERVER_IMAGE}:${IMAGE_TAG} -n ${K8S_NAMESPACE}
                    kubectl set image deployment/task-manager-client task-manager-client=${CLIENT_IMAGE}:${IMAGE_TAG} -n ${K8S_NAMESPACE}

                    kubectl rollout status deployment/task-manager-server -n ${K8S_NAMESPACE} --timeout=180s
                    kubectl rollout status deployment/task-manager-client -n ${K8S_NAMESPACE} --timeout=180s
                '''
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
            echo "Build, push, and Kubernetes deploy completed: ${CLIENT_IMAGE}:${IMAGE_TAG}, ${SERVER_IMAGE}:${IMAGE_TAG}"
        }
        failure {
            echo "Pipeline failed. Check the logs above for details."
        }
    }
}
