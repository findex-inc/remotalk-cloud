// VSCode拡張: Jenkins Pipeline Linter Connector がインストールされていれば、Jenkinsfileにフォーカスした状態で、F1 -> Validate Jenkins でlintできます。

def currentStage = ''

pipeline{
  agent{
      label 'jammy'
  }
  environment {
    // JenkinsGUI(pipeline)で設定済みのパラメータ
    // - ref
    // - pusher
    // - target_project_id
    // - remotalk_image_tag
    // pipeline全体での環境変数
    NOTIFICATION_TOKEN = credentials("${notification_token}")
  }
  stages {
    stage('change permission sh files') {
      steps {
        script { currentStage = env.STAGE_NAME }
        sh 'chmod 755 $(pwd)/cicd/jenkins/push-image.sh'
      }
    }
    stage('Build RemoTalk Image') {
      environment {
        // このstageのみの環境変数
        DOCKER_BUILDKIT = '1'
      }
      steps {
        script { currentStage = env.STAGE_NAME }
        sh 'docker build -f Dockerfile -t ${remotalk_image_tag} --progress=plain .'
      }
    }
    stage('Push RemoTalk Image to Artifact Registry') {
      steps {
        script { currentStage = env.STAGE_NAME }
        withCredentials([file(credentialsId: "${push_credential}", variable: 'SA_CREDENTIAL')]) {
          sh '''
            docker run --rm \
              -v /var/run/docker.sock:/var/run/docker.sock \
              -v $(pwd)/cicd/jenkins/push-image.sh:/app/push-image.sh \
              -v $SA_CREDENTIAL:/app/service-account-credential.json \
              gcr.io/google.com/cloudsdktool/google-cloud-cli:424.0.0-slim \
              ./app/push-image.sh -p $target_project_id -i $remotalk_image_tag
          '''
        }
      }
    }
  }
  post {
    success {
      hangoutsNotify(
        message: "App: RemoTalk \n\n Status: <font color=\"#008000\"><b>SUCCESS</b></font> \n\n Stage: Post Action \n\n Triggered: <i>$pusher</i>",
        token: "$NOTIFICATION_TOKEN"
      )
    }
    unsuccessful {
      hangoutsNotify(
        message: "App: RemoTalk \n\n Status: <font color=\"#FF0000\"><b>FAILURE</b></font> \n\n Stage: $currentStage \n\n Triggered: <i>$pusher</i>",
        token: "$NOTIFICATION_TOKEN"
      )
    }
  }
}
