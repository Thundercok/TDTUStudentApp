#!/bin/zsh
# Standalone Qt Quick Agent. Never installs dependencies or downloads models.
# Prepare pinned data once with tools/prepare_translation_models.py.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-$ROOT/.venv/bin/python}"
DIST_DIR="${OFFLINE_AGENT_DIST_DIR:-$ROOT/dist}"
BUILD_TMP="$(mktemp -d /private/tmp/offline-agent-app.XXXXXX)"
trap 'rm -rf "$BUILD_TMP"' EXIT
export CLANG_MODULE_CACHE_PATH="$BUILD_TMP/clang-cache"
export SWIFT_MODULECACHE_PATH="$BUILD_TMP/swift-cache"
export PYINSTALLER_CONFIG_DIR="$BUILD_TMP/pyinstaller-cache"
if [[ -n "${OFFLINE_AGENT_SPIKE_DEPS:-}" ]]; then
  export PYTHONPATH="$OFFLINE_AGENT_SPIKE_DEPS${PYTHONPATH:+:$PYTHONPATH}"
fi
cd "$ROOT"
if [[ ! -f "$ROOT/offline_agent/assets/translation/en-vi/model/model.bin" || ! -f "$ROOT/offline_agent/assets/translation/vi-en/model/model.bin" ]]; then
  echo 'Prepare bundled translation data with tools/prepare_translation_models.py before building.' >&2
  exit 1
fi
if ! "$PYTHON_BIN" "$ROOT/tools/prepare_embedding_model.py" --check-only 2>/dev/null; then
  echo 'Prepare the bundled embedding model with tools/prepare_embedding_model.py before building.' >&2
  exit 1
fi
# fastembed/onnxruntime stay in: the meaning-based finder needs them at runtime.
excluded=(torch transformers scipy sklearn gymnasium mlx mlx_lm sentence_transformers
  apsw sqlite_vec offline_agent.engine.semantic jax jaxlib pyarrow polars psycopg2 hf_xet
  offline_agent.engine.selected_document_qa offline_agent.engine.selected_pdf offline_agent.engine.qa_engine offline_agent.engine.meta_reasoner
  offline_agent.ui.quick_pdf_controller offline_agent.ui.quick_app reasoning experiments
  PyQt6.QtWidgets offline_agent.ui.floaty offline_agent.ui.settings_dialog
  matplotlib pandas IPython ipykernel notebook jupyterlab bokeh plotly seaborn dask sympy onnx
  offline_agent.timetable offline_agent.astrology offline_agent.plugins offline_agent.crawler offline_agent.engine.slm offline_agent.engine.document_model_service
  offline_agent.kernel.capabilities.documents
  offline_agent.kernel.capabilities.result_tables offline_agent.kernel.capabilities.smart_notes offline_agent.kernel.capabilities.web
  offline_agent.kernel.capabilities.timetable offline_agent.kernel.capabilities.natal offline_agent.kernel.capabilities.views)
exclude_args=()
for module in "${excluded[@]}"; do exclude_args+=(--exclude-module "$module"); done
PYTHON_BIN="$PYTHON_BIN" zsh "$ROOT/tools/build_hotkey.sh" "$BUILD_TMP/agent-hotkey"
rm -rf "$DIST_DIR/Offline Agent" 2>/dev/null || true "$DIST_DIR/Offline Agent.app" "$DIST_DIR/Offline Agent.zip"
"$PYTHON_BIN" -m PyInstaller --noconfirm --clean --windowed --name "Offline Agent" \
  --distpath "$DIST_DIR" --workpath "$BUILD_TMP/build" --specpath "$BUILD_TMP/spec" \
  --icon "$ROOT/tools/app_icon.icns" --osx-bundle-identifier io.github.thundercok.offlineagent \
  --add-data "$ROOT/offline_agent/assets/mascot_cutout.png:offline_agent/assets" \
  --add-binary "$BUILD_TMP/agent-hotkey:offline_agent/bin" \
  --add-data "$ROOT/offline_agent/assets/translation:offline_agent/assets/translation" \
  --add-data "$ROOT/offline_agent/assets/embedding:offline_agent/assets/embedding" \
  --add-data "$ROOT/offline_agent/ui/quick/AgentDesk.qml:offline_agent/ui/quick" \
  --add-data "$ROOT/offline_agent/ui/quick/SpeechSurface.qml:offline_agent/ui/quick" \
  --add-data "$ROOT/offline_agent/ui/quick/MascotPose.qml:offline_agent/ui/quick" \
  --add-data "$ROOT/offline_agent/ui/quick/QuietButton.qml:offline_agent/ui/quick" \
  --add-data "$ROOT/offline_agent/ui/quick/DeskIcon.qml:offline_agent/ui/quick" \
  --add-data "$ROOT/offline_agent/ui/quick/KeycapBadge.qml:offline_agent/ui/quick" \
  --collect-data certifi \
  --copy-metadata ctranslate2 --copy-metadata sentencepiece --copy-metadata numpy \
  --collect-data rfc3987_syntax --collect-data lark --collect-data jsonschema_specifications \
  --hidden-import objc --hidden-import Foundation \
  --hidden-import AppKit --hidden-import Quartz --hidden-import ApplicationServices --hidden-import offline_agent.intake.vision --hidden-import offline_agent.intake.pdf \
  --hidden-import ctranslate2 --hidden-import sentencepiece \
  --collect-submodules fastembed --collect-binaries onnxruntime --hidden-import tokenizers \
  --copy-metadata fastembed --copy-metadata huggingface_hub --copy-metadata onnxruntime --copy-metadata tokenizers \
  "${exclude_args[@]}" --paths "$ROOT" "$ROOT/main.py"
export OFFLINE_AGENT_HOTKEY_BINARY="$BUILD_TMP/agent-hotkey"
export OFFLINE_AGENT_BUILT_APP="$DIST_DIR/Offline Agent.app"
# PyInstaller can continue after its Qt discovery subprocess aborts. Never
# publish a bundle missing the platform plugin required to open any window.
if [[ ! -f "$OFFLINE_AGENT_BUILT_APP/Contents/Frameworks/PyQt6/Qt6/plugins/platforms/libqcocoa.dylib" ]]; then
  echo 'Build failed: Qt Cocoa platform plugin was not collected.' >&2
  exit 1
fi
"$PYTHON_BIN" - <<'PY'
import os,plistlib,hashlib,json,subprocess
from pathlib import Path
from offline_agent.engine.version import BUILD, VERSION
p=Path(os.environ['OFFLINE_AGENT_BUILT_APP'])/'Contents/Info.plist'
data=plistlib.loads(p.read_bytes())
data.update(LSUIElement=True,LSMinimumSystemVersion='14.0',CFBundleShortVersionString=VERSION,CFBundleVersion=BUILD,
            NSDocumentsFolderUsageDescription='Offline Agent tìm và mở file trong Documents khi bạn yêu cầu và chọn thư mục này.',
            NSDesktopFolderUsageDescription='Offline Agent tìm file trên Desktop và đọc ảnh chụp màn hình bạn chủ động đưa vào app.',
            NSDownloadsFolderUsageDescription='Offline Agent tìm và mở file trong Downloads khi bạn yêu cầu và chọn thư mục này.',
            NSScreenCaptureUsageDescription='Offline Agent nhận chữ trong vùng màn hình bạn chọn để dịch.',
            NSAppleEventsUsageDescription='Offline Agent sao chép chữ đang chọn khi bạn yêu cầu.')
p.write_bytes(plistlib.dumps(data))
manifest = dict(build=BUILD, version=VERSION, protocol='SELECT2',
    source_revision=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
    source_dirty=bool(subprocess.check_output(['git','status','--porcelain','--','offline_agent','tools'],text=True).strip()),
    helper_sha256=hashlib.sha256(Path(os.environ['OFFLINE_AGENT_HOTKEY_BINARY']).read_bytes()).hexdigest(),
    acceptance='not_run_by_packaging')
(Path(os.environ['OFFLINE_AGENT_BUILT_APP'])/'Contents/Resources/build.json').write_text(json.dumps(manifest,indent=2))

PY
OFFLINE_AGENT_CODESIGN_IDENTITY="${OFFLINE_AGENT_CODESIGN_IDENTITY:--}"
codesign --force --deep --sign "$OFFLINE_AGENT_CODESIGN_IDENTITY" "$OFFLINE_AGENT_BUILT_APP"
rm -rf "$DIST_DIR/Offline Agent" "$DIST_DIR/Offline Agent.zip" "$DIST_DIR/Offline Agent.dmg" 2>/dev/null || true
# One disk image: the app, an Applications shortcut to drag onto, and the guide.
# No helper scripts: a downloaded .command is blocked by Gatekeeper just like the app.
DMG_STAGE="$BUILD_TMP/dmg"
mkdir -p "$DMG_STAGE"
ditto "$OFFLINE_AGENT_BUILT_APP" "$DMG_STAGE/Offline Agent.app"
ln -s /Applications "$DMG_STAGE/Applications"
cp "$ROOT/docs/OFFLINE_AGENT_BAT_DAU.txt" "$DMG_STAGE/ĐỌC TRƯỚC KHI DÙNG.txt"
hdiutil create -quiet -volname "Offline Agent" -srcfolder "$DMG_STAGE" -fs HFS+ -format UDZO -ov "$DIST_DIR/Offline Agent.dmg"
echo "Built: $DIST_DIR/Offline Agent.dmg"
