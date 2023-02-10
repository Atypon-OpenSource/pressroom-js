#!groovy
node {
    stage ("Checkout") {
        // keep the original branch name before the checkout step overrides it
        if (env.GIT_BRANCH != null) {
            BRANCH="$GIT_BRANCH"
            echo "BRANCH: $BRANCH"
        }
        VARS = checkout scm
        echo "VARS: $VARS"
    }

    stage("Build") {
        nodejs(nodeJSInstallationName: 'node_16_14_2') {
            sh ("yarn install --non-interactive --frozen-lock-file")
            sh ("yarn typecheck")
            sh ("yarn lint")
            sh ("yarn build")
//             sh ("yarn test")
        }
    }

    stage("Build docker image") {
        sh ("docker build .")
    }
}
