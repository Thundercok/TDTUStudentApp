# Fix Summary & Setup

## Bugs fixed
1. `index.html` must live inside a `templates/` subfolder — Flask's `render_template()` requires this.
2. Model name corrected: `claude-opus-4-5` → `claude-sonnet-4-6`
3. `anthropic` library bumped to >=0.40.0 (0.34.2 is outdated)

## Folder structure required
```
your-project/
├── app.py
├── requirements.txt
├── .env
└── templates/
    └── index.html    ← must be here, not next to app.py
```

## Steps to run
```bash
# 1. Create .env with your key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env

# 2. Install deps
pip install -r requirements.txt

# 3. Move index.html into templates/
mkdir -p templates
mv index.html templates/

# 4. Run
python app.py
```
