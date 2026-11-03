"""Offline Agent's Qt Quick entry; reuse the main Offline Agent's production QML components."""
from pathlib import Path
import sys
import os
import logging
import time

os.environ.setdefault('QT_QUICK_CONTROLS_STYLE', 'Basic')

from PyQt6.QtCore import QLockFile, QTimer, QUrl, Qt
from PyQt6.QtGui import QAction, QFont, QGuiApplication
from PyQt6.QtQuick import QQuickView, QQuickWindow

from offline_agent.engine.settings import state_directory
from offline_agent.os.native_menu import NativeMenu, NativeStatusItem
from offline_agent.os.hotkey import register_hotkey, close_hotkey_registrations
from offline_agent.ui.desk_controller import AgentQuickController
from offline_agent.ui.diagnostics import BUILD
from offline_agent.ui.instance import AgentInstanceBridge, present_running_mini
from offline_agent.ui.image_drop import ImageDropFilter
from offline_agent.ui.shell import AgentShell
from offline_agent.ui.placement import AGENT_PANEL_WIDTH, AGENT_TEXT_SIZE, FLOAT_HEAD_SIZE, FLOAT_HEAD_OPTICAL

BASE = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parents[2]))


def create_desk(settings=None):
    app = QGuiApplication.instance() or QGuiApplication(sys.argv)
    app.setApplicationName('Offline Agent')
    app.setQuitOnLastWindowClosed(False)
    app.setFont(QFont('Helvetica Neue', 13))
    controller = AgentQuickController(settings)
    QQuickWindow.setDefaultAlphaBuffer(True)
    view = QQuickView()
    fmt = view.format()
    fmt.setAlphaBufferSize(8)
    view.setFormat(fmt)
    view.setTitle('Offline Agent')
    view.setFlags(Qt.WindowType.Window | Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint)
    view.setColor(Qt.GlobalColor.transparent)
    view.setResizeMode(QQuickView.ResizeMode.SizeRootObjectToView)
    # Look sizes its own mascot and speech surface. Normal panels enforce
    # their own width; a window-level minimum must not enlarge passive Look.
    view.setMinimumWidth(1)
    screen = view.screen().availableGeometry()
    reduce_motion = False
    if app.platformName() == 'cocoa':
        from AppKit import NSWorkspace
        workspace = NSWorkspace.sharedWorkspace()
        if hasattr(workspace, 'accessibilityDisplayShouldReduceMotion'):
            reduce_motion = bool(workspace.accessibilityDisplayShouldReduceMotion())
    view.setInitialProperties(dict(liveController=controller, reduceMotion=reduce_motion,
        buildLabel=f'{BUILD} · PID {os.getpid()}',
        sharedPanelWidth=AGENT_PANEL_WIDTH, sharedTextSize=AGENT_TEXT_SIZE,
        floatingHeadSize=FLOAT_HEAD_SIZE, floatingHeadOpticalHeight=FLOAT_HEAD_OPTICAL,
        mascotSource=QUrl.fromLocalFile(str(BASE/'offline_agent/assets/mascot_cutout.png')),
        darkMode=app.styleHints().colorScheme() == Qt.ColorScheme.Dark,
        maxPaperHeight=max(180, min(420, screen.height()-250))))
    view.engine().addImageProvider('mini-input', controller.image_preview)
    from offline_agent.ui.icon_provider import RatIconProvider
    # The engine does not own a Python provider; keep it alive with the view.
    view.icon_provider = RatIconProvider()
    view.engine().addImageProvider('icon', view.icon_provider)
    view.setSource(QUrl.fromLocalFile(str(BASE/'offline_agent/ui/quick/AgentDesk.qml')))
    if view.status() != QQuickView.Status.Ready:
        errors = '\n'.join(e.toString() for e in view.errors())
        raise RuntimeError('Agent QML could not load: '+errors)
    root = view.rootObject()
    image_drop = ImageDropFilter(view, controller, state_directory()/'last-image-drop.json')
    app.aboutToQuit.connect(image_drop.close)
    shell = AgentShell(view, root, controller)
    present = shell.present
    menu = NativeMenu()
    tray = NativeStatusItem()
    tray.setToolTip('Offline Agent')
    tray_actions = {}
    for label, callback in [
        ('Mở Offline Agent', controller.summonMinimal),
        ('Dịch Clipboard', lambda: (present(), controller.translateClipboard())),
        ('Đăng ký lại phím tắt', controller.restartHotkey),
        ('Cài đặt…', lambda: (present(), controller.settingsRequested.emit())),
        ('Thoát Offline Agent', controller.quit)]:
        action = QAction(label, menu)
        action.triggered.connect(lambda _checked=False, fn=callback: fn())
        menu.addAction(action)
        tray_actions[callback] = action
    tray.setContextMenu(menu)
    tray.setPrimaryAction(controller.summonLook)
    def refresh_tray():
        state = controller.snapshot
        shortcut_failed = bool(state['hotkeyStatus'])
        tray.setBadgeText('!' if shortcut_failed else '…' if state['shortcutAck'] or state['busy'] else '')
        tray.setToolTip('Offline Agent · ' + ('Phím tắt chưa sẵn sàng. Mở menu để đăng ký lại.' if shortcut_failed
            else state['shortcutAck'] or ('Đang xử lý yêu cầu.' if state['busy'] else state['lookStatusLabel'])))
        # Only offered when the shortcut actually failed.
        tray_actions[controller.restartHotkey].setVisible(shortcut_failed)
        tray_actions[controller.restartHotkey].setEnabled(not state['hotkeyStarting'])
    controller.changed.connect(refresh_tray)
    refresh_tray()
    tray.menuVisibilityChanged.connect(shell.set_status_menu_open)
    tray.show()
    app.aboutToQuit.connect(tray.hide)
    last_ack = 0.0
    def acknowledge_shortcut(message):
        nonlocal last_ack
        now = time.monotonic()
        if now - last_ack >= 2:
            last_ack = now
            tray.showMessage('Offline Agent', message)
    controller.shortcutAcknowledged.connect(acknowledge_shortcut)
    hotkeys = None
    def restart_hotkey():
        nonlocal hotkeys
        if controller.snapshot['hotkeyStarting'] or app.platformName() != 'cocoa':
            return
        controller.update(hotkeyStarting=True)
        try:
            if not close_hotkey_registrations('reconnect'):
                controller.update(hotkeyStatus='Chưa đóng được bộ nhận phím cũ. Chưa tạo bộ mới.')
                return
            hotkeys = None
            hotkeys = register_hotkey(controller.quickLookSelection, on_state=controller.recordHotkeyState,
                on_error=lambda message: controller.update(hotkeyStatus=message),
                chord_name=controller.settings.get("hotkey_chord", "option_shift_space"),
                on_hold=controller.escalateToVCoTChat)
            controller.update(hotkeyStatus='')
        except OSError as exc:
            controller.recordHotkeyState('registration_failed', state='failed')
            controller.update(hotkeyStatus='Phím tắt chưa sẵn sàng. Đăng ký lại trong menu Offline Agent.')
            logging.getLogger(__name__).warning('hotkey_unavailable %s', exc)
        finally:
            controller.update(hotkeyStarting=False)
    def rebind_hotkey(name):
        nonlocal hotkeys
        from offline_agent.os.hotkey_chords import chord
        chord(name)
        old = controller.settings.get('hotkey_chord', 'option_shift_space')
        if not close_hotkey_registrations('rebind'):
            return 'Bộ nhận cũ chưa đóng; chưa đổi phím tắt.'
        def bind(value):
            return register_hotkey(controller.quickLookSelection,
                on_state=controller.recordHotkeyState,
                on_error=lambda message: controller.update(hotkeyStatus=message), chord_name=value,
                on_hold=controller.escalateToVCoTChat)
        try:
            hotkeys = bind(name)
            controller.update(hotkeyStatus='')
            return ''
        except OSError:
            try:
                hotkeys = bind(old)
                controller.update(hotkeyStatus='')
                return 'Phím mới chưa đăng ký được; đã khôi phục phím cũ.'
            except OSError:
                controller.update(hotkeyStatus='Chưa đăng ký được phím tắt. Chọn Kết nối lại.')
                return 'Cả phím mới và phím cũ chưa sẵn sàng. macOS có thể đang giữ tổ hợp này.'
    controller.rebind_hotkey = rebind_hotkey
    controller.hotkeyRestartRequested.connect(restart_hotkey)
    app.aboutToQuit.connect(lambda: close_hotkey_registrations('shutdown'))
    restart_hotkey()
    view._refs = (controller, tray, menu, shell, image_drop, hotkeys)
    return view, controller


def main():
    logging.basicConfig(level=logging.INFO,format='%(asctime)s %(name)s %(levelname)s %(message)s')
    # HTTP request URLs can contain snippet text or credentials. Keep stage
    # diagnostics, but never emit request URLs at the app's INFO log level.
    logging.getLogger('httpx').setLevel(logging.WARNING)
    logging.getLogger('httpcore').setLevel(logging.WARNING)
    app = QGuiApplication(sys.argv)
    state_directory().mkdir(parents=True, exist_ok=True)
    requested_presentation = 'look' if '--look' in sys.argv else 'minimal' if '--minimal' in sys.argv else 'show'
    lock = QLockFile(str(state_directory()/'mini.lock'))
    if not lock.tryLock():
        if present_running_mini(state_directory(), requested_presentation):
            return 0
        raise SystemExit('Offline Agent đang chạy. Chọn Hiện Offline Agent trên menu bar.')
    instance_bridge = AgentInstanceBridge(state_directory(), app)
    view, controller = create_desk()
    instance_bridge.showRequested.connect(controller.summonLook)
    instance_bridge.lookRequested.connect(controller.summonLook)
    instance_bridge.minimalRequested.connect(controller.summonMinimal)
    app.aboutToQuit.connect(instance_bridge.close)
    if requested_presentation == 'look':
        controller.summonLook()
    elif requested_presentation == 'minimal':
        controller.summonMinimal()
    else:
        controller.summonLook()
    # Look summons an observation surface. Capture itself still uses explicit
    # macOS screenshot/drop/paste; no global shortcut captures the screen.
    app._refs = (view, controller, lock, instance_bridge)
    return app.exec()
