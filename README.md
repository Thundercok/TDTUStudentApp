# offline-tool-routing-agent

A macOS menu-bar agent that routes short requests to local tools: find files and apps by
name or meaning, open them, and translate English and Vietnamese on the device.

It has no language model in its default path. `ToolGoalRouter` picks the tool directly, and
translation and embeddings run from local model files.

> **Status: work in progress, not usable yet.** This code was moved here and renamed without
> being finished. After the rename, 17 of 52 tests fail and `main.py --check-bundle` fails
> while loading the embedding model. Cloud code paths and references to modules that were not
> moved are still in the tree.
>
> The last working source is tag `rat-lite-0.6.0` in
> [structured-multi-step-reasoning](https://github.com/Thundercok/structured-multi-step-reasoning).

Older versions of this repository held a different project, a Flask student app. It is kept
at tag `student-app-v1`.

## Setup

Apple Silicon and macOS 14 or newer.

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt fastembed pypdf
.venv/bin/python tools/prepare_translation_models.py
.venv/bin/python tools/prepare_embedding_model.py
```

## Run

```bash
.venv/bin/python main.py --check-bundle
.venv/bin/python main.py
```

## Layout

| Path | Contents |
| --- | --- |
| `main.py` | Entry point |
| `offline_agent/session.py` | Composes the tools and the router |
| `offline_agent/engine/` | Routing, execution, file search, translation |
| `offline_agent/kernel/` | Tool registry, dispatcher, capabilities |
| `offline_agent/ui/` | Qt Quick desk and its controllers |
| `offline_agent/os/` | Hotkey, permissions, selected text |
| `tools/` | Model preparation and app packaging |
