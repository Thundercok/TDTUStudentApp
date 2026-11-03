"""Qt Quick UI exports, loaded only when explicitly requested.

Importing a presentation helper must not initialize the application or Qt.
"""
from __future__ import annotations

__all__ = ["QuickPDFController", "quick_main"]


def __getattr__(name):
    if name == "QuickPDFController":
        from offline_agent.ui.quick_pdf_controller import QuickPDFController
        return QuickPDFController
    if name == "quick_main":
        from offline_agent.ui.quick_app import main
        return main
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
