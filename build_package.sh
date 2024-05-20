#!/bin/bash

docker build --network host -f Dockerfile -t remotalk:package --progress=plain --build-arg CURRENT_COMMIT_HASH="$(git show --format='%h' --no-patch)" --target server .
