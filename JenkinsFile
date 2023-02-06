#!groovy

node {
    // push to private registry
    REGISTRY="${env.PRIVATE_ARTIFACT_REGISTRY}"
    REFSPEC="+refs/pull/*:refs/remotes/origin/pr/*"
    CONTAINER_NAME="pressroom"
    ansiColor('xterm') {
        stage ("checkout") {
            // keep the original branch name before the checkout step overrides it
            if (env.GIT_BRANCH != null) {
                BRANCH="$GIT_BRANCH"
                echo "BRANCH: $BRANCH"
            }
            VARS = checkout scm
            echo "VARS: $VARS"
            DOCKER_IMAGE="manuscripts/pressroom-js"
            if (VARS.GIT_BRANCH == "origin/master") {
                IMG_TAG=sh(script: "jq .version < package.json | tr -d '\"' ", returnStdout: true).trim()
            } else {
                IMG_TAG=BRANCH + "-" + VARS.GIT_COMMIT.substring(0,6)
            }
        }

        stage("build docker image") {
            sh("docker build -t ${REGISTRY}/${DOCKER_IMAGE}:${IMG_TAG} .")
        }

        stage("Deploy locally") {
            // this is stored on Jenkins https://acjenkins.atypon.com/configfiles/index
            // and in order to access it we need to use the configFileProvider closure
            configFileProvider([configFile(fileId: 'pressroom_env_variables', variable: 'pressroom_env')]) {
                sh "docker run --env-file ${pressroom_env} -d --name ${CONTAINER_NAME} ${REGISTRY}/${DOCKER_IMAGE}:${IMG_TAG}"
            }
            // w8 for container to start up
            sh "sleep 10"
            logs_content = sh(script: "docker logs --tail 100 ${CONTAINER_NAME}", returnStdout: true).trim()
            writeFile file: 'pressroom_container.log', text: logs_content
            archiveArtifacts artifacts: 'pressroom_container.log', fingerprint: true
            sh "if [ `docker inspect pressroom -f {{.State.ExitCode}}` -eq 1 ]; then docker container rm ${CONTAINER_NAME}; return 1; fi"
        }

        stage("Push to registry") {
            // bring down container and push the image
            sh("docker container stop ${CONTAINER_NAME}; docker container rm ${CONTAINER_NAME}")
            sh("""
                docker push ${REGISTRY}/${DOCKER_IMAGE}:${IMG_TAG} && \
                docker push ${REGISTRY}/${DOCKER_IMAGE}
                """)
        }
    }
}
