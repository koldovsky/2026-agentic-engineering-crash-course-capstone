ARG DOTNET_SDK_IMAGE=mcr.microsoft.com/dotnet/sdk:8.0-bookworm-slim@sha256:78235e09001f52b6592c458ac010775ebac6725422e80cd0c1650590f67b2743
FROM ${DOTNET_SDK_IMAGE}

ENV DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_NOLOGO=1 \
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1 \
    NUGET_PACKAGES=/nuget \
    HOME=/tmp/agent-home

WORKDIR /workspace
RUN apt-get update && apt-get install -y --no-install-recommends python3 && rm -rf /var/lib/apt/lists/*
COPY docker/scripts/container-verify.sh /usr/local/bin/container-verify
COPY scripts/test-results.py /usr/local/lib/agent-policy/test-results.py
RUN chmod 0555 /usr/local/bin/container-verify

ENTRYPOINT ["/usr/local/bin/container-verify"]
