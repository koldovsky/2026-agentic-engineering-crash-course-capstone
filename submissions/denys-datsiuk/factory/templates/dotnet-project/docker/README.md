# Offline Execution Sandbox

Build once from the template directory:

```bash
docker build -t private-dotnet-agent-sandbox:local -f docker/Dockerfile .
```

The SDK base is pinned by digest. Update that digest only through a reviewed dependency-maintenance change and rebuild the local image.

The allowlisted build context includes only the Dockerfile, entrypoint and shared TRX validator. Image preparation may use networking to install Python; execution remains offline. Both test phases require successful, nonempty TRX results.

Populate and approve a NuGet cache before disconnecting runtime networking. Then run:

```bash
export NUGET_CACHE=/absolute/path/to/approved/nuget-cache
export FOCUSED_TEST_FILTER='FullyQualifiedName~ChangedComponent'
bash scripts/run-offline-sandbox.sh
```

The wrapper checks scope and secrets on the host, creates a temporary sanitized copy without `.git` or denied paths, and runs restore/build/tests with `--network none`, no Linux capabilities, no privilege escalation, a read-only container root, bounded processes, memory, and CPU. Only the temporary workspace is writable and it is deleted on exit.

## Threat Boundary

This container is an execution sandbox, not the language-model endpoint. A cloud-backed agent must remain outside it and delegate commands to the wrapper. Running the agent CLI itself inside `--network none` works only with a fully local, preinstalled model. Docker isolation does not replace host hardening, reviewed base-image provenance, or CI runner isolation.
