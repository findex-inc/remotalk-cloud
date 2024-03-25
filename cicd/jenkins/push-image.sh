#!/bin/bash

# gcr.io/google.com/cloudsdktool/google-cloud-cli:424.0.0-slim 内部から実行 Jenkinsfile参照
# comment
SH_NAME=$(basename "$0")

echo "--- start: $SH_NAME ---"

function exit_proc {
  echo "--- stop: $SH_NAME ---"
}
trap exit_proc EXIT
trap 'trap - EXIT; exit_proc; exit -1' INT PIPE TERM

OPT=$(getopt -o p:i:h -l project:,image:,help -- "$@")
[[ "$?" != 0 ]] && exit 1
eval set -- "${OPT}"
unset OPT
while true; do
    case "${1}" in
        -p | --project)
            TARGET_PROJECT_ID="${2}"
            shift 2
            ;;
        -i | --image)
            TARGET_IMAGE_TAG="${2}"
            shift 2
            ;;
        -h | --help)
            echo "$SH_NAME -p <<ProjectId>> -i <<Docker Image>>"
            echo "  -p --project      GCP: Project id"
            echo "  -i --image        ArtifactRegistry: Docker image"
            exit 0
            ;;
        --)
            shift 1
            break
            ;;
    esac
done

if [ -z "$TARGET_PROJECT_ID" ]; then
  echo "missing -p option"
  exit 1
fi

if [ -z "$TARGET_IMAGE_TAG" ]; then
  echo "missing -i option"
  exit 1
fi

set -eux

# credHelperの作成
mkdir -p /root/.docker
chmod 0600 /root/.docker
echo '{"credHelpers":{"asia-northeast1-docker.pkg.dev":"gcloud"}}' \
>> /root/.docker/config.json

# SAでログイン
gcloud auth login --cred-file=/app/service-account-credential.json
gcloud config set project "$TARGET_PROJECT_ID"

# push
docker push "$TARGET_IMAGE_TAG"
