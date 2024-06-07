# TDTUStudentApp

## Setup

1. Create a Google Gemini API key in Google Cloud Console.
2. Create a `.env` file at the project root with:

```
GEMINI_API_KEY=your_api_key_here
# or
GOOGLE_API_KEY=your_api_key_here
```

3. Install dependencies:

```
pip install -r requirements.txt
```

4. Run:

```
python app.py
```

## Notes

- The app checks `GEMINI_API_KEY` first, then `GOOGLE_API_KEY`.
- If no key is set, it raises a `RuntimeError` with guidance.
