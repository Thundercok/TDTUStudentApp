"""Offline Agent: python main.py (use the repository's Python environment)."""
import sys
import os
import json
from pathlib import Path

if __name__ == '__main__':
    recording = os.environ.get('OFFLINE_AGENT_ACCEPTANCE_DIR')
    if recording:
        directory = Path(recording)
        directory.mkdir(parents=True, exist_ok=True)
        (directory/'launch.json').write_text(json.dumps({'pid':os.getpid(),'entrypoint':'main.py','status':'starting'}))
    if '--check-bundle' in sys.argv:
        from offline_agent.bundle_check import main
    else:
        from offline_agent.ui.desk_app import main
    sys.exit(main())
