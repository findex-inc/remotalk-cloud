FROM node:20.11 AS client

RUN apt-get update && apt-get install -y make gcc nasm libpng-dev
RUN npm config set registry http://registry.npmjs.org/

COPY ./webapp /home/webapp
WORKDIR /home/webapp
RUN CI=true make dist

FROM golang:1.22.6 AS server

ARG CURRENT_COMMIT_HASH

RUN apt-get update && apt-get install -y make gcc curl

COPY ./server /go/src/server
WORKDIR /go/src/server
RUN BUILD_NUMBER=${CURRENT_COMMIT_HASH} make setup-go-work build-linux

COPY NOTICE.txt /go/src/
COPY README.md /go/src/
COPY --from=client /home/webapp/channels/dist /go/src/webapp/channels/dist
RUN echo "// $(date)" >> /go/src/server/templates/firebase-messaging-sw.js
RUN make package-linux

FROM ubuntu:22.04

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

ENV PATH="/mattermost/bin:${PATH}"
ARG USER_ID=2000
ARG GROUP_ID=2000

RUN apt-get update \
	&& DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
	ca-certificates \
	curl \
	mime-support \
	unrtf \
	wv \
	poppler-utils \
	tidy \
	tzdata \
	postgresql-client

COPY --from=server /go/src/server/dist/mattermost-team-linux-amd64.tar.gz /

RUN mkdir -p /mattermost/data /mattermost/plugins /mattermost/client/plugins \
	&& addgroup -gid ${GROUP_ID} mattermost \
	&& adduser -q --disabled-password --uid ${USER_ID} --gid ${GROUP_ID} --gecos "" --home /mattermost mattermost \
	&& tar -xzf /mattermost-team-linux-amd64.tar.gz \
	&& rm /mattermost-team-linux-amd64.tar.gz \
	&& chown -R mattermost:mattermost /mattermost /mattermost/data /mattermost/plugins /mattermost/client/plugins

USER mattermost

HEALTHCHECK --interval=30s --timeout=10s \
	CMD curl -f http://localhost:8065/api/v4/system/ping || exit 1

COPY --chown=mattermost:mattermost --chmod=765 ./server/build/entrypoint.sh /
ENTRYPOINT ["/entrypoint.sh"]
WORKDIR /mattermost
CMD ["mattermost"]

EXPOSE 8065 8067 8074 8075

VOLUME ["/mattermost/data", "/mattermost/logs", "/mattermost/config", "/mattermost/plugins", "/mattermost/client/plugins"]
