"""Explicit frozen-bundle smoke, never used as UI/model-quality acceptance."""
import json
from pathlib import Path
import ssl
import sys


def main():
    import certifi
    from offline_agent.session import AgentSession
    settings = dict(roots=[],provider='openai',model='gpt-4.1-mini',translation_provider='apple',
                    free_fallback=False,source_language='auto',target_language='vi',semantic_enabled=False)
    session = AgentSession(settings)
    reply = session.execute('find_files',{'query':'bundle smoke: no filesystem search'})
    assert reply.pending_input_request and not reply.error
    ssl.create_default_context(cafile=certifi.where())
    forbidden = [name for name in ('onnxruntime','torch','fastembed','apsw','sqlite_vec','offline_agent.timetable','offline_agent.crawler.db')
                 if name in sys.modules]
    assert not forbidden, forbidden
    # Meaning-based search must load the bundled model, never a download.
    from offline_agent.engine.embedder import LocalEmbedder
    from offline_agent.engine.semantic_index import MODEL_NAME, find_embedding_directory
    bundled = find_embedding_directory()
    assert bundled, 'embedding_model_missing'
    dimension = LocalEmbedder(MODEL_NAME, cache_dir=bundled, local_files_only=True, threads=2).embed_query('kiểm tra').shape[0]
    report = {'kind':'bundle_smoke_not_ui_acceptance','status':'passed',
        'capabilities':[c.name for c in session.runtime.registry.list_capabilities()],
        'model_tools':[t.name for t in session.runtime.registry.to_tool_definitions()],
        'ca_bundle_present':Path(certifi.where()).is_file(), 'forbidden_imports':forbidden,
        'model_loaded':False,'embedding_dimension':int(dimension),'cloud_calls':session.client.calls}
    print(json.dumps(report,ensure_ascii=False,indent=2),flush=True)
