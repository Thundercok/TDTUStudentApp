"""Pure layout policy for a fixed-size Offline Agent and its transient cluster."""
from dataclasses import dataclass
from offline_agent.ui.surface_geometry import Rect
from offline_agent.ui.speech_placement import place_speech

OFFLINE_AGENT_WIDTH, OFFLINE_AGENT_HEIGHT = 176, 176
LOOK_WIDTH, LOOK_HEIGHT = OFFLINE_AGENT_WIDTH, OFFLINE_AGENT_HEIGHT
LOOK_OPTICAL_HEIGHT = 134
AGENT_PANEL_WIDTH, AGENT_TEXT_SIZE = 580, 16
GAP, MARGIN = 8, 16
FLOAT_HEAD_SIZE, FLOAT_HEAD_OPTICAL = 96, 76


@dataclass(frozen=True)
class Placement:
    panel: Rect
    mascot: Rect
    bounds: Rect
    side: str | None


def place_look(available, home, bubble_width=0, bubble_height=0, variant='standby', side=None, *, ink_bounds=None, mouth=None, floating_head=False):
    """Look owns a stable mascot home; shared speech policy places its bubble."""
    width, height = (FLOAT_HEAD_SIZE, FLOAT_HEAD_SIZE) if floating_head else (LOOK_WIDTH, LOOK_HEIGHT)
    left = max(available.x+MARGIN, min(round(home[0])+LOOK_WIDTH-width, available.right-MARGIN-width))
    top = max(available.y+MARGIN, min(round(home[1])+LOOK_HEIGHT-height, available.bottom-MARGIN-height))
    mascot = Rect(left, top, width, height)
    if bubble_width <= 0 or bubble_height <= 0:
        return Placement(Rect(left, top, 0, 0), mascot, mascot, side)
    if ink_bounds is not None and ink_bounds.width > 0 and ink_bounds.height > 0:
        ink = Rect(offline_agent.x + ink_bounds.x, offline_agent.y + ink_bounds.y, ink_bounds.width, ink_bounds.height)
    else:
        ink = (Rect(offline_agent.x+4, offline_agent.y+4, width-8, height-8) if floating_head else
               Rect(offline_agent.x+4, offline_agent.bottom-30-LOOK_OPTICAL_HEIGHT, LOOK_WIDTH-8, LOOK_OPTICAL_HEIGHT))
    anchor_point = (offline_agent.x + mouth[0], offline_agent.y + mouth[1]) if mouth is not None else None
    speech = place_speech(available, ink, bubble_width, bubble_height, preferred_side=side,
                          gap=GAP, margin=MARGIN, anchor_point=anchor_point, align_bottom=(floating_head or mouth is None), preserve_side=True)
    return Placement(speech.body, mascot, speech.body.union(mascot), speech.side)

