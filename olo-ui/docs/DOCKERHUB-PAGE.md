# Copy-paste content for Docker Hub repository page

**Canonical version:** [../../docs/DOCKERHUB-PAGE.md](../../docs/DOCKERHUB-PAGE.md) (repo root docs).

Use the text below (or the short version) in your Docker Hub repository **Description** so users see how to pull and run the image.

---

## Full description (copy from here)

```
Olo — backend (olo-be) + frontend (olo-ui) in one container. Spring Boot API on 8082, nginx serves the React UI and proxies /api to the backend.

Quick start
----------
docker run -p 3000:80 YOUR_DOCKERHUB_USERNAME/olo-ui

Then open http://localhost:3000 . No separate backend container needed.

Tags
----
- latest — built from main
- 1.0.0, 1.0, 1 — semantic versions (use when we publish v1.0.0 etc.)

Source
------
https://github.com/YOUR_ORG_OR_USER/olo-ui
```

---

## Short description (for Docker Hub "Short Description" field)

```
Olo: Spring Boot backend + React frontend in one container. Single image, port 80.
```

---

**Before publishing:** Replace `YOUR_DOCKERHUB_USERNAME` and `YOUR_ORG_OR_USER` with your Docker Hub username (or org) and GitHub org/user.
