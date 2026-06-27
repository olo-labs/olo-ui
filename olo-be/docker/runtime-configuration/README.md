# Workflow presets baked into the olo-ui Docker image.

This folder is copied to `/app/olo-configuration` at container runtime.

- **CI:** refreshed from `olo-mono/olo-definition/olo-configuration/current-active` when that repo checkout includes it.
- **Fallback:** these committed JSON files are used when olo-mono has no `olo-configuration` on GitHub yet.

To update locally from olo-mono:

```bash
./scripts/bundle-docker-configuration.sh
```

Subfolders are supported; olo-be scans recursively (e.g. `agents/agent.json`).

### Graph logs (`log/`)

Sample runtime graph logs are bundled under `log/` for the **Workflows → Log** view in olo-ui. These are written by the Olo kernel when dynamic subgraphs are injected at runtime (`DynamicSubgraphInjectionLogger` in olo-kernel). The Docker image sets `OLO_LOG_DIRECTORY=/app/olo-configuration/log`.

Log files are **read-only** in the UI; they contain a `mergedGraph` field with the post-injection workflow graph.
