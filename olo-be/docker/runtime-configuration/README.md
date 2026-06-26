# Workflow presets baked into the olo-ui Docker image.

This folder is copied to `/app/olo-configuration` at container runtime.

- **CI:** refreshed from `olo-mono/olo-definition/olo-configuration/current-active` when that repo checkout includes it.
- **Fallback:** these committed JSON files are used when olo-mono has no `olo-configuration` on GitHub yet.

To update locally from olo-mono:

```bash
./scripts/bundle-docker-configuration.sh
```

Subfolders are supported; olo-be scans recursively (e.g. `agents/agent.json`).
