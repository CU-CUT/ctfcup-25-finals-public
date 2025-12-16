#!/usr/bin/env python3
"""
Системный монитор с возможностью просмотра:
- CPU, MEM, HDD
- Процессы
- Смонтированные устройства
Требует прав root для некоторых функций
"""

import os
import sys
import time
import psutil
import asyncio
import platform
import socket
import pickle
import base64
import subprocess
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional

from textual import on, work
from textual.app import App, ComposeResult
from textual.widgets import (
    Header, Footer, DataTable, Static, Label,
    TabbedContent, TabPane, ListView, ListItem,
    Button, Select, Input, RadioSet, RadioButton
)
from textual.containers import Container, Horizontal, Vertical, ScrollableContainer
from textual.reactive import reactive
from textual.binding import Binding
from textual.screen import Screen, ModalScreen
from textual.message import Message
from textual.events import Key


class HelpScreen(Screen):
    """Экран помощи"""
    
    def compose(self) -> ComposeResult:
        yield Container(
            Label("Справка по системному монитору"),
            Static("""
[bold]Управление приложением:[/bold]

[b]Горячие клавиши:[/b]
• [reverse]q[/reverse] - Выход из приложения
• [reverse]r[/reverse] - Обновить все данные
• [reverse]k[/reverse] - Завершить выбранный процесс
• [reverse]s[/reverse] - Сортировка процессов
• [reverse]F1[/reverse] - Показать эту справку
• [reverse]Tab[/reverse] - Переключение между вкладками
• [reverse]Enter[/reverse] - Детали процесса
• [reverse]C[/reverse] - Настройки конфигурации

[b]Мышь:[/b]
• Клик по процессу - выбор
• Двойной клик по процессу - детали
• Прокрутка - навигация по спискам
            """),
            Button("Закрыть", variant="primary", id="close-help")
        )
    
    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "close-help":
            self.dismiss()


class ConfigScreen(Screen):
    """Экран настройки конфигурации"""
    
    def compose(self) -> ComposeResult:
        with Container():
            yield Label("🔧 Настройки конфигурации")
            
            with ScrollableContainer():
                # Информация о конфиге
                with Container():
                    config_path = "/tmp/6DF58AF8-E675-4466-85FC-595333EDAC4B.cfg"
                    
                    if os.path.exists(config_path):
                        yield Label("Текущая конфигурация:")
                        yield Static(id="current-config-content")
                    else:
                        yield Static("❌ Файл отсутствует")
                
                # Основные настройки
                with Container():
                    yield Label("Основные настройки:")
                    with Horizontal():
                        yield Button("📤 Экспорт", id="export-config", variant="success")
                        yield Button("📥 Импорт", id="import-config", variant="primary")
                        yield Button("🔄 Обновить", id="refresh-config", variant="default")
                
                # Настройки процесса
                with Container():
                    yield Label("Настройки процессов:")
                    yield Static("Макс. отображаемых процессов:")
                    yield Input(placeholder="100", id="max-processes")
                    yield Static("Интервал обновления (сек):")
                    yield Input(placeholder="3", id="refresh-interval")
                    yield Button("💾 Сохранить", id="save-settings", variant="primary")
                
                # Опасная зона
                with Container():
                    yield Label("⚠️ Расширенные настройки:")
                    yield Static("Введите конфигурацию в base64:")
                    yield Input(placeholder="Base64 конфигурации...", id="raw-config")
                    yield Button("⚡ Загрузить", id="load-raw", variant="error")
                    yield Button("🧪 Тест", id="test-config", variant="warning")
                
                # Отладочная информация
                with Container():
                    yield Label("Отладка:")
                    with Horizontal():
                        yield Button("📄 Данные", id="show-raw", variant="default")
                        yield Button("🗑️ Удалить", id="delete-config", variant="error")
                        yield Button("🔍 Посмотреть", id="view-config", variant="success")
                
                yield Button("❌ Закрыть", variant="primary", id="close-config")
    
    def on_mount(self) -> None:
        """При загрузке экрана показываем текущий конфиг"""
        self.show_current_config()
    
    def show_current_config(self) -> None:
        """Показать текущее содержимое конфига"""
        try:
            config_path = "/tmp/6DF58AF8-E675-4466-85FC-595333EDAC4B.cfg"
            
            if os.path.exists(config_path):
                with open(config_path, 'rb') as f:
                    config_data = f.read()
                
                try:
                    config = pickle.loads(config_data)
                    content_widget = self.query_one("#current-config-content")
                    
                    if isinstance(config, dict):
                        # Форматируем словарь для отображения
                        content = "{\n"
                        for key, value in config.items():
                            content += f"  '{key}': {repr(value)},\n"
                        content += "}"
                        content_widget.update(content)
                    else:
                        content_widget.update(f"Тип: {type(config)}\nЗначение: {repr(config)}")
                        
                except Exception as e:
                    content_widget = self.query_one("#current-config-content")
                    content_widget.update(f"Ошибка чтения: {e}")
            else:
                content_widget = self.query_one("#current-config-content")
                content_widget.update("Файл не существует")
                
        except Exception as e:
            content_widget = self.query_one("#current-config-content")
            content_widget.update(f"Ошибка: {e}")
    
    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "close-config":
            self.dismiss()
        elif event.button.id == "export-config":
            self.export_config()
        elif event.button.id == "import-config":
            self.import_config()
        elif event.button.id == "save-settings":
            self.save_settings()
        elif event.button.id == "load-raw":
            self.load_raw_config()
        elif event.button.id == "show-raw":
            self.show_raw_data()
        elif event.button.id == "delete-config":
            self.delete_config()
        elif event.button.id == "refresh-config":
            self.show_current_config()
            self.app.notify("🔄 Конфиг обновлен", timeout=2)
        elif event.button.id == "view-config":
            self.view_config_details()
        elif event.button.id == "test-config":
            self.test_config_function()
    
    def export_config(self) -> None:
        """Экспорт текущей конфигурации"""
        try:
            config = {
                'max_processes': 100,
                'refresh_interval': 3,
                'user': os.getlogin(),
                'timestamp': datetime.now().isoformat(),
                'message': 'Конфигурация системного монитора',
                'version': '1.0',
                'exported': True
            }
            
            config_data = pickle.dumps(config)
            
            config_path = "/tmp/6DF58AF8-E675-4466-85FC-595333EDAC4B.cfg"
            with open(config_path, 'wb') as f:
                f.write(config_data)
            
            b64_config = base64.b64encode(config_data).decode()
            
            self.app.notify(f"✅ Конфигурация экспортирована", timeout=3)
            self.app.notify(f"Код (первые 50 символов): {b64_config[:50]}...", timeout=5)
            
            # Обновляем отображение
            self.show_current_config()
            
        except Exception as e:
            self.app.notify(f"❌ Ошибка: {e}", severity="error")
    
    def import_config(self) -> None:
        """Импорт конфигурации из файла"""
        try:
            config_path = "/tmp/6DF58AF8-E675-4466-85FC-595333EDAC4B.cfg"
            
            if not os.path.exists(config_path):
                self.app.notify("❌ Файл не найден", severity="error")
                return
            
            with open(config_path, 'rb') as f:
                config_data = f.read()
            
            config = pickle.loads(config_data)
            
            # Показываем что загрузили
            if isinstance(config, dict):
                message = config.get('message', 'Конфигурация загружена')
                user = config.get('user', 'неизвестный')
                self.app.notify(f"✅ {message}", timeout=2)
                self.app.notify(f"👤 Пользователь: {user}", timeout=3)
            else:
                self.app.notify(f"✅ Загружен объект типа: {type(config)}", timeout=2)
            
            # Обновляем отображение
            self.show_current_config()
            
        except Exception as e:
            self.app.notify(f"❌ Ошибка: {str(e)[:100]}", severity="error")
    
    def save_settings(self) -> None:
        """Сохранение настроек из полей ввода"""
        try:
            max_proc_input = self.query_one("#max-processes")
            refresh_input = self.query_one("#refresh-interval")
            
            config = {
                'max_processes': int(max_proc_input.value) if max_proc_input.value else 100,
                'refresh_interval': int(refresh_input.value) if refresh_input.value else 3,
                'user': os.getlogin(),
                'timestamp': datetime.now().isoformat(),
                'note': 'Настройки сохранены через интерфейс'
            }
            
            config_data = pickle.dumps(config)
            config_path = "/tmp/6DF58AF8-E675-4466-85FC-595333EDAC4B.cfg"
            
            with open(config_path, 'wb') as f:
                f.write(config_data)
            
            self.app.notify("✅ Настройки сохранены", timeout=2)
            
            # Обновляем отображение
            self.show_current_config()
            
        except ValueError:
            self.app.notify("❌ Неверные значения", severity="error")
        except Exception as e:
            self.app.notify(f"❌ Ошибка: {e}", severity="error")
    
    def load_raw_config(self) -> None:
        """Загрузка сырой конфигурации из base64"""
        try:
            raw_input = self.query_one("#raw-config")
            if not raw_input.value:
                self.app.notify("❌ Введите конфигурацию", severity="error")
                return
            
            config_data = base64.b64decode(raw_input.value)
            
            config = pickle.loads(config_data)
            
            # Сохраняем в файл
            config_path = "/tmp/6DF58AF8-E675-4466-85FC-595333EDAC4B.cfg"
            with open(config_path, 'wb') as f:
                f.write(config_data)
            
            self.app.notify("⚡ Конфигурация загружена и сохранена", timeout=2)
            
            if isinstance(config, dict):
                # Проверяем специальные поля
                if 'title' in config:
                    self.app.notify(f"📛 Заголовок: {config['title']}", timeout=3)
                if 'command' in config:
                    self.app.notify(f"⚠️ Обнаружена команда в конфиге", timeout=3)
            
            # Обновляем отображение
            self.show_current_config()
            
        except Exception as e:
            self.app.notify(f"❌ Ошибка: {str(e)[:100]}", severity="error")
    
    def show_raw_data(self) -> None:
        """Показать сырые данные конфигурационного файла"""
        try:
            config_path = "/tmp/6DF58AF8-E675-4466-85FC-595333EDAC4B.cfg"
            
            if not os.path.exists(config_path):
                self.app.notify("❌ Файл не найден", severity="error")
                return
            
            with open(config_path, 'rb') as f:
                data = f.read()
            
            hex_preview = data[:50].hex()
            b64_preview = base64.b64encode(data[:50]).decode()
            
            self.app.notify(f"📄 Hex: {hex_preview}", timeout=5)
            self.app.notify(f"📄 Base64: {b64_preview}", timeout=5)
            
        except Exception as e:
            self.app.notify(f"❌ Ошибка: {e}", severity="error")
    
    def delete_config(self) -> None:
        """Удаление конфигурации"""
        try:
            config_path = "/tmp/6DF58AF8-E675-4466-85FC-595333EDAC4B.cfg"
            if os.path.exists(config_path):
                os.remove(config_path)
                self.app.notify("🗑️ Конфигурация удалена", timeout=2)
                self.show_current_config()
            else:
                self.app.notify("❌ Файл не найден", severity="error")
        except Exception as e:
            self.app.notify(f"❌ Ошибка: {e}", severity="error")
    
    def view_config_details(self) -> None:
        """Показать детали конфига в отдельном сообщении"""
        try:
            config_path = "/tmp/6DF58AF8-E675-4466-85FC-595333EDAC4B.cfg"
            
            if not os.path.exists(config_path):
                self.app.notify("❌ Файл не найден", severity="error")
                return
            
            with open(config_path, 'rb') as f:
                config_data = f.read()
            
            config = pickle.loads(config_data)
            
            if isinstance(config, dict):
                details = "Детали конфига:\n"
                for key, value in config.items():
                    details += f"{key}: {value}\n"
                self.app.notify(details, timeout=5)
            else:
                self.app.notify(f"Тип объекта: {type(config)}", timeout=3)
                
        except Exception as e:
            self.app.notify(f"❌ Ошибка: {e}", severity="error")
    
    def test_config_function(self) -> None:
        """Тестовая функция для демонстрации"""
        self.app.notify("🧪 Тестирование конфигурации...", timeout=2)
        
        # Простой тестовый конфиг
        test_config = {
            'test': 'успешно',
            'timestamp': datetime.now().strftime("%H:%M:%S"),
            'message': 'Это тестовый конфиг!'
        }
        
        try:
            config_data = pickle.dumps(test_config)
            config_path = "/tmp/6DF58AF8-E675-4466-85FC-595333EDAC4B.cfg"
            
            with open(config_path, 'wb') as f:
                f.write(config_data)
            
            self.app.notify("✅ Тестовый конфиг создан", timeout=2)
            self.show_current_config()
            
        except Exception as e:
            self.app.notify(f"❌ Ошибка: {e}", severity="error")


# ... (остальной код без изменений: ProcessDetailScreen, ConfirmDialog, SortWidget, DeviceDetailScreen, SystemMonitorApp)

class ProcessDetailScreen(Screen):
    """Экран деталей процесса"""
    
    def __init__(self, pid: int):
        super().__init__()
        self.pid = pid
    
    def compose(self) -> ComposeResult:
        yield Container(
            Label(f"Детали процесса PID: {self.pid}"),
            
            ScrollableContainer(
                Static(self.get_process_info())
            ),
            
            Button("Закрыть", variant="primary", id="close-process")
        )
    
    def get_process_info(self) -> str:
        """Получить информацию о процессе"""
        try:
            proc = psutil.Process(self.pid)
            info = proc.as_dict(attrs=[
                'name', 'status', 'cpu_percent', 'memory_percent',
                'create_time', 'username', 'exe', 'cmdline',
                'num_threads'
            ])
            
            result = f"""
Имя: {info.get('name', 'N/A')}
Статус: {info.get('status', 'N/A')}
Пользователь: {info.get('username', 'N/A')}
CPU: {info.get('cpu_percent', 0):.1f}%
Память: {info.get('memory_percent', 0):.2f}%
Потоки: {info.get('num_threads', 'N/A')}
Запущен: {datetime.fromtimestamp(info.get('create_time', 0)).strftime('%Y-%m-%d %H:%M:%S')}
"""
            
            if info.get('exe'):
                result += f"Путь: {info.get('exe')}\n"
            
            if info.get('cmdline'):
                cmdline = ' '.join(info['cmdline'])
                result += f"Команда: {cmdline[:200]}{'...' if len(cmdline) > 200 else ''}\n"
            
            return result
            
        except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
            return f"Ошибка: {e}"
    
    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "close-process":
            self.dismiss()


class ConfirmDialog(ModalScreen[bool]):
    """Диалог подтверждения"""
    
    def __init__(self, question: str, process_name: str = "", pid: int = 0):
        super().__init__()
        self.question = question
        self.process_name = process_name
        self.pid = pid
    
    def compose(self) -> ComposeResult:
        yield Container(
            Label(self.question),
            Label(f"Процесс: {self.process_name} (PID: {self.pid})") if self.process_name else Static(),
            Horizontal(
                Button("Да", variant="error", id="yes"),
                Button("Нет", variant="primary", id="no"),
            )
        )
    
    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "yes":
            self.dismiss(True)
        else:
            self.dismiss(False)


class SortWidget(Container):
    """Виджет для сортировки процессов"""
    
    class SortChanged(Message):
        """Сообщение об изменении сортировки"""
        
        def __init__(self, sort_by: str) -> None:
            super().__init__()
            self.sort_by = sort_by
    
    def compose(self) -> ComposeResult:
        with Horizontal():
            yield Label("Сортировка:")
            with RadioSet(id="sort-radio"):
                yield RadioButton("CPU", value=True, id="cpu")
                yield RadioButton("Память", id="mem")
                yield RadioButton("PID", id="pid")
                yield RadioButton("Имя", id="name")
    
    def on_radio_set_changed(self, event: RadioSet.Changed) -> None:
        """Обработка изменения сортировки"""
        sort_by = event.radio_set.pressed_button.id
        self.post_message(self.SortChanged(sort_by))


class DeviceDetailScreen(Screen):
    """Экран деталей устройства"""
    
    def __init__(self, device_info: Dict[str, Any]):
        super().__init__()
        self.device_info = device_info
    
    def compose(self) -> ComposeResult:
        yield Container(
            Label(f"Детали устройства: {self.device_info.get('device', 'N/A')}"),
            
            ScrollableContainer(
                Static(self.get_device_info())
            ),
            
            Button("Закрыть", variant="primary", id="close-device")
        )
    
    def get_device_info(self) -> str:
        """Получить информацию об устройстве"""
        info = self.device_info
        
        result = f"""
Устройство: {info.get('device', 'N/A')}
Точка монтирования: {info.get('mountpoint', 'N/A')}
Тип файловой системы: {info.get('fstype', 'N/A')}
Опции монтирования: {info.get('opts', 'N/A')}
"""
        
        if 'usage' in info:
            usage = info['usage']
            total_gb = usage.total / (1024**3)
            used_gb = usage.used / (1024**3)
            free_gb = usage.free / (1024**3)
            
            result += f"""
Всего места: {total_gb:.2f} GB
Использовано: {used_gb:.2f} GB ({usage.percent}%)
Свободно: {free_gb:.2f} GB
"""
        
        return result
    
    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "close-device":
            self.dismiss()


class SystemMonitorApp(App):
    """Главное приложение системного монитора"""
    
    CSS = """
    Screen {
        background: $surface;
    }
    
    #stats-container {
        height: 30;
        border: solid $primary;
        margin: 1 0;
    }
    
    .stat-box {
        height: 100%;
        border: solid $primary;
        margin: 1;
        padding: 1;
    }
    
    .stat-title {
        text-style: bold;
        color: $text;
        margin-bottom: 1;
    }
    
    .stat-value {
        color: $success;
        margin-top: 1;
    }
    
    .warning {
        color: $warning;
    }
    
    .critical {
        color: $error;
    }
    
    DataTable {
        height: 1fr;
    }
    
    #process-table {
        height: 1fr;
    }
    
    #devices-table {
        height: 1fr;
    }
    
    .tab-content {
        height: 1fr;
    }
    
    .info-label {
        text-style: italic;
        color: $text-muted;
        margin: 1;
    }
    
    .button-bar {
        height: 3;
        margin: 1 0;
        align: center middle;
    }
    
    #filter-input {
        width: 30;
        margin-right: 1;
    }
    
    .sort-container {
        height: 3;
        margin: 0 1;
    }
    
    .sort-label {
        margin-right: 1;
    }
    
    #process-toolbar {
        height: 5;
        margin-bottom: 1;
    }
    
    .toolbar-section {
        margin-right: 2;
    }
    
    .device-info {
        margin-bottom: 1;
    }
    
    ConfigScreen {
        align: center middle;
    }
    
    ConfigScreen Container {
        width: 90%;
        height: 90%;
        border: double $primary;
        padding: 2;
        background: $surface;
        overflow-y: auto;
    }
    
    ConfigScreen Label {
        text-style: bold;
        color: $primary;
        margin: 1 0;
    }
    
    ConfigScreen Button {
        margin: 1;
    }
    
    ConfigScreen Input {
        width: 60;
        margin: 1 0;
    }
    
    ConfigScreen Horizontal {
        margin: 1 0;
    }
    
    #current-config-content {
        background: $panel;
        padding: 1;
        border: solid $primary;
        margin: 1 0;
        max-height: 10;
        overflow-y: auto;
    }
    
    HelpScreen Container {
        width: 80%;
        height: 80%;
        border: double $primary;
        padding: 2;
        background: $surface;
    }
    
    ProcessDetailScreen Container {
        width: 90%;
        height: 90%;
        border: double $primary;
        padding: 2;
        background: $surface;
    }
    
    DeviceDetailScreen Container {
        width: 90%;
        height: 90%;
        border: double $primary;
        padding: 2;
        background: $surface;
    }
    
    ConfirmDialog Container {
        width: 60;
        border: thick $primary;
        background: $surface;
        padding: 2;
    }
    """
    
    BINDINGS = [
        Binding("q", "quit", "Выход"),
        Binding("r", "refresh", "Обновить"),
        Binding("k", "kill_process", "Убить процесс"),
        Binding("s", "toggle_sort", "Сортировка"),
        Binding("f1", "show_help", "Помощь"),
        Binding("enter", "show_process_details", "Детали"),
        Binding("c", "show_config", "Конфигурация"),
        Binding("d", "show_device_details", "Детали устройства"),
    ]
    
    # Реактивные переменные
    cpu_percent = reactive(0.0)
    memory_percent = reactive(0.0)
    disk_percent = reactive(0.0)
    process_sort_by = reactive("cpu")  # cpu, mem, pid, name
    process_filter = reactive("")
    
    def __init__(self):
        super().__init__()
        self.mounted_devices = []
        self.config_path = "/tmp/6DF58AF8-E675-4466-85FC-595333EDAC4B.cfg"
        self.load_config_on_start()
    
    def compose(self) -> ComposeResult:
        """Создание интерфейса"""
        yield Header()
        
        with TabbedContent(initial="system"):
            with TabPane("Система", id="system"):
                yield Container(
                    Horizontal(
                        Container(
                            Label("Загрузка CPU", classes="stat-title"),
                            Label("", id="cpu-stat", classes="stat-value"),
                            classes="stat-box",
                        ),
                        Container(
                            Label("Память", classes="stat-title"),
                            Label("", id="mem-stat", classes="stat-value"),
                            classes="stat-box",
                        ),
                        Container(
                            Label("Диск (/)", classes="stat-title"),
                            Label("", id="disk-stat", classes="stat-value"),
                            classes="stat-box",
                        ),
                        Container(
                            Label("Время работы", classes="stat-title"),
                            Label("", id="uptime-stat", classes="stat-value"),
                            classes="stat-box",
                        ),
                        id="stats-container",
                    ),
                    Label("Системная информация", classes="info-label"),
                    DataTable(id="system-info-table"),
                )
            
            with TabPane("Процессы", id="processes"):
                yield Container(
                    Horizontal(
                        Container(
                            Label(f"Всего процессов: ", id="process-count"),
                            classes="toolbar-section"
                        ),
                        Container(
                            Input(placeholder="Фильтр по имени...", id="filter-input"),
                            classes="toolbar-section"
                        ),
                        Container(
                            SortWidget(),
                            classes="toolbar-section"
                        ),
                        Container(
                            Button("🔄 Обновить", id="refresh-processes", variant="primary"),
                            classes="toolbar-section"
                        ),
                        id="process-toolbar"
                    ),
                    DataTable(id="process-table"),
                )
            
            with TabPane("Устройства", id="devices"):
                yield Container(
                    Horizontal(
                        Label("Смонтированные файловые системы", classes="stat-title"),
                        Button("🔄 Обновить", id="refresh-devices", variant="primary"),
                        Button("🔍 Детали", id="show-device-details", variant="default"),
                        classes="button-bar",
                    ),
                    Label("Общая информация о устройствах:", classes="device-info"),
                    Horizontal(
                        Container(
                            Label("Всего устройств:", classes="stat-title"),
                            Label("", id="total-devices", classes="stat-value"),
                            classes="stat-box",
                        ),
                        Container(
                            Label("Общий объём:", classes="stat-title"),
                            Label("", id="total-space", classes="stat-value"),
                            classes="stat-box",
                        ),
                        Container(
                            Label("Общий свободно:", classes="stat-title"),
                            Label("", id="total-free", classes="stat-value"),
                            classes="stat-box",
                        ),
                        id="devices-stats",
                    ),
                    DataTable(id="devices-table"),
                )
            
            with TabPane("Сеть", id="network"):
                yield Container(
                    Horizontal(
                        Container(
                            Label("Отправлено", classes="stat-title"),
                            Label("", id="net-sent", classes="stat-value"),
                            classes="stat-box",
                        ),
                        Container(
                            Label("Получено", classes="stat-title"),
                            Label("", id="net-recv", classes="stat-value"),
                            classes="stat-box",
                        ),
                    ),
                    DataTable(id="network-table"),
                )
        
        yield Footer()
    
    def on_mount(self) -> None:
        """Инициализация при загрузке"""
        self.title = "System Monitor (Root)"
        self.sub_title = f"Пользователь: {os.getlogin()} | PID: {os.getpid()}"
        
        # Настройка таблиц
        process_table = self.query_one("#process-table")
        process_table.cursor_type = "row"
        process_table.zebra_stripes = True
        process_table.add_columns(
            "PID", "Имя", "Пользователь", "CPU %", "Память %", "Потоки", "Состояние"
        )
        
        system_table = self.query_one("#system-info-table")
        system_table.add_columns("Параметр", "Значение")
        
        network_table = self.query_one("#network-table")
        network_table.add_columns("Интерфейс", "IP адрес", "Статус", "Скорость")
        
        devices_table = self.query_one("#devices-table")
        devices_table.cursor_type = "row"
        devices_table.zebra_stripes = True
        devices_table.add_columns(
            "Устройство", "Точка монтирования", "Тип ФС", 
            "Общий объём", "Использовано", "Свободно", "Использование %"
        )
        
        # Запуск периодического обновления
        self.set_interval(2, self.update_stats)
        self.set_interval(3, self.update_processes)
        self.set_interval(5, self.update_devices)
        self.set_interval(10, self.update_network_info)
        
        # Первоначальное обновление
        self.update_stats()
        self.update_system_info()
        self.update_processes()
        self.update_devices()
        self.update_network_info()
    
    def load_config_on_start(self) -> None:
        """Загрузка конфигурации при старте"""
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, 'rb') as f:
                    config_data = f.read()
                
                config = pickle.loads(config_data)
                
                # Если в конфиге есть заголовок - меняем
                if isinstance(config, dict) and 'title' in config:
                    self.title = config['title']
                
        except Exception as e:
            # Создаем дефолтный конфиг если его нет
            default_config = {
                'message': 'Добро пожаловать в System Monitor',
                'version': '1.0',
                'user': os.getlogin()
            }
            with open(self.config_path, 'wb') as f:
                f.write(pickle.dumps(default_config))
    
    def update_stats(self) -> None:
        """Обновление статистики CPU, памяти и диска"""
        try:
            # CPU
            self.cpu_percent = psutil.cpu_percent(interval=0.1)
            cpu_label = self.query_one("#cpu-stat")
            cpu_label.update(f"{self.cpu_percent:.1f}%")
            
            # Память
            mem = psutil.virtual_memory()
            self.memory_percent = mem.percent
            mem_label = self.query_one("#mem-stat")
            mem_label.update(f"{self.memory_percent:.1f}% ({mem.used//(1024**3)}/{mem.total//(1024**3)} GB)")
            
            # Диск
            try:
                disk = psutil.disk_usage('/')
                self.disk_percent = disk.percent
                disk_label = self.query_one("#disk-stat")
                disk_label.update(f"{self.disk_percent:.1f}% ({disk.used//(1024**3)}/{disk.total//(1024**3)} GB)")
            except Exception as e:
                disk_label = self.query_one("#disk-stat")
                disk_label.update(f"Ошибка: {e}")
            
            # Время работы
            uptime = time.time() - psutil.boot_time()
            uptime_label = self.query_one("#uptime-stat")
            uptime_label.update(self.format_uptime(uptime))
            
        except Exception as e:
            self.notify(f"Ошибка обновления статистики: {e}", severity="error")
    
    def update_system_info(self) -> None:
        """Обновление системной информации"""
        try:
            table = self.query_one("#system-info-table")
            table.clear()
            
            # Получаем системную информацию
            system_info = [
                ("Система", f"{platform.system()} {platform.release()}"),
                ("Версия", platform.version()),
                ("Архитектура", platform.machine()),
                ("Процессор", platform.processor() or "N/A"),
                ("Ядра (физ/лог)", f"{psutil.cpu_count(logical=False)}/{psutil.cpu_count(logical=True)}"),
                ("Общая память", f"{psutil.virtual_memory().total // (1024**3)} GB"),
                ("Доступно памяти", f"{psutil.virtual_memory().available // (1024**3)} GB"),
                ("Загрузка памяти", f"{psutil.virtual_memory().percent}%"),
                ("Диск / всего", f"{psutil.disk_usage('/').total // (1024**3)} GB"),
                ("Диск свободно", f"{psutil.disk_usage('/').free // (1024**3)} GB"),
                ("Загрузка диска /", f"{psutil.disk_usage('/').percent}%"),
                ("Время загрузки", datetime.fromtimestamp(psutil.boot_time()).strftime("%Y-%m-%d %H:%M:%S")),
                ("Хостнейм", socket.gethostname()),
                ("Python", f"{platform.python_version()}"),
            ]
            
            for key, value in system_info:
                table.add_row(key, value)
                
        except Exception as e:
            self.notify(f"Ошибка обновления системной информации: {e}", severity="error")
    
    def update_processes(self) -> None:
        """Обновление списка процессов"""
        try:
            table = self.query_one("#process-table")
            current_cursor = table.cursor_row
            
            table.clear()
            
            processes = []
            for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_percent', 'status', 'num_threads']):
                try:
                    info = proc.info
                    process_name = info['name'] or 'N/A'
                    
                    # Применяем фильтр
                    if self.process_filter and self.process_filter.lower() not in process_name.lower():
                        continue
                    
                    processes.append((
                        info['pid'],
                        process_name[:25],
                        (info['username'] or 'N/A')[:15],
                        f"{info['cpu_percent'] or 0:.1f}",
                        f"{info['memory_percent'] or 0:.2f}",
                        str(info.get('num_threads', 'N/A')),
                        info['status'] or 'N/A'
                    ))
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            
            # Сортировка
            if self.process_sort_by == "cpu":
                processes.sort(key=lambda x: float(x[3]), reverse=True)
            elif self.process_sort_by == "mem":
                processes.sort(key=lambda x: float(x[4]), reverse=True)
            elif self.process_sort_by == "pid":
                processes.sort(key=lambda x: int(x[0]))
            elif self.process_sort_by == "name":
                processes.sort(key=lambda x: x[1].lower())
            
            for proc in processes[:100]:
                table.add_row(*proc)
            
            # Восстанавливаем позицию курсора
            if current_cursor is not None and current_cursor < len(processes):
                table.move_cursor(row=min(current_cursor, len(processes)-1))
            
            # Обновление счетчика процессов
            count_label = self.query_one("#process-count")
            total_processes = len(psutil.pids())
            count_label.update(f"Всего процессов: {total_processes} (показано: {min(len(processes), 100)})")
            
        except Exception as e:
            self.notify(f"Ошибка обновления процессов: {e}", severity="error")
    
    @on(Input.Changed, "#filter-input")
    def on_filter_changed(self, event: Input.Changed) -> None:
        """Обработка изменения фильтра"""
        self.process_filter = event.value
        self.update_processes()
    
    @on(SortWidget.SortChanged)
    def on_sort_changed(self, event: SortWidget.SortChanged) -> None:
        """Обработка изменения сортировки"""
        self.process_sort_by = event.sort_by
        self.update_processes()
    
    @on(Button.Pressed, "#refresh-processes")
    def on_refresh_processes(self) -> None:
        """Обновление списка процессов"""
        self.update_processes()
        self.notify("✅ Список процессов обновлен", timeout=1)
    
    def update_devices(self) -> None:
        """Обновление списка смонтированных устройств"""
        try:
            table = self.query_one("#devices-table")
            current_cursor = table.cursor_row
            
            table.clear()
            
            devices = []
            total_space = 0
            total_free = 0
            
            for part in psutil.disk_partitions(all=False):
                try:
                    device_info = {
                        'device': part.device,
                        'mountpoint': part.mountpoint,
                        'fstype': part.fstype,
                        'opts': part.opts
                    }
                    
                    usage = psutil.disk_usage(part.mountpoint)
                    device_info['usage'] = usage
                    
                    total_gb = usage.total / (1024**3)
                    used_gb = usage.used / (1024**3)
                    free_gb = usage.free / (1024**3)
                    
                    total_space += total_gb
                    total_free += free_gb
                    
                    devices.append([
                        part.device[:20],
                        part.mountpoint[:30],
                        part.fstype[:10],
                        f"{total_gb:.1f} GB",
                        f"{used_gb:.1f} GB",
                        f"{free_gb:.1f} GB",
                        f"{usage.percent}%"
                    ])
                    
                    self.mounted_devices = [device_info] + self.mounted_devices[:20]
                    
                except (PermissionError, OSError) as e:
                    devices.append([
                        part.device[:20],
                        part.mountpoint[:30],
                        part.fstype[:10],
                        "N/A",
                        "N/A",
                        "N/A",
                        "N/A"
                    ])
                    continue
            
            devices.sort(key=lambda x: x[1])
            
            for device in devices:
                table.add_row(*device)
            
            if current_cursor is not None and current_cursor < len(devices):
                table.move_cursor(row=min(current_cursor, len(devices)-1))
            
            total_devices_label = self.query_one("#total-devices")
            total_devices_label.update(f"{len(devices)}")
            
            total_space_label = self.query_one("#total-space")
            total_space_label.update(f"{total_space:.1f} GB")
            
            total_free_label = self.query_one("#total-free")
            total_free_label.update(f"{total_free:.1f} GB")
            
        except Exception as e:
            self.notify(f"❌ Ошибка обновления устройств: {e}", severity="error")
    
    @on(Button.Pressed, "#refresh-devices")
    def on_refresh_devices(self) -> None:
        """Обновление списка устройств"""
        self.update_devices()
        self.notify("✅ Список устройств обновлен", timeout=1)
    
    def update_network_info(self) -> None:
        """Обновление сетевой информации"""
        try:
            net_sent = self.query_one("#net-sent")
            net_recv = self.query_one("#net-recv")
            
            net_io = psutil.net_io_counters()
            sent_mb = net_io.bytes_sent / (1024 * 1024)
            recv_mb = net_io.bytes_recv / (1024 * 1024)
            
            if sent_mb >= 1024:
                net_sent.update(f"{sent_mb/1024:.1f} GB")
            else:
                net_sent.update(f"{sent_mb:.1f} MB")
                
            if recv_mb >= 1024:
                net_recv.update(f"{recv_mb/1024:.1f} GB")
            else:
                net_recv.update(f"{recv_mb:.1f} MB")
            
            table = self.query_one("#network-table")
            table.clear()
            
            for name, stats in psutil.net_if_stats().items():
                try:
                    addrs = psutil.net_if_addrs().get(name, [])
                    ipv4_addrs = [addr.address for addr in addrs if addr.family == socket.AF_INET]
                    ip_addr = ipv4_addrs[0] if ipv4_addrs else "N/A"
                    
                    speed = f"{stats.speed} Mbps" if stats.speed > 0 else "N/A"
                    status = "✅ Up" if stats.isup else "❌ Down"
                    
                    table.add_row(
                        name[:20],
                        ip_addr,
                        status,
                        speed
                    )
                except Exception:
                    continue
                    
        except Exception as e:
            self.notify(f"❌ Ошибка обновления сетевой информации: {e}", severity="error")
    
    def format_uptime(self, seconds: float) -> str:
        """Форматирование времени работы"""
        days = int(seconds // 86400)
        hours = int((seconds % 86400) // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        
        if days > 0:
            return f"{days}д {hours:02d}:{minutes:02d}:{secs:02d}"
        elif hours > 0:
            return f"{hours:02d}:{minutes:02d}:{secs:02d}"
        else:
            return f"{minutes:02d}:{secs:02d}"
    
    def action_refresh(self) -> None:
        """Ручное обновление всех данных"""
        self.update_stats()
        self.update_processes()
        self.update_system_info()
        self.update_devices()
        self.update_network_info()
        self.notify("🔄 Все данные обновлены", timeout=1)
    
    async def action_kill_process(self) -> None:
        """Убить выбранный процесс"""
        table = self.query_one("#process-table")
        if table.cursor_row is not None:
            try:
                row = table.get_row_at(table.cursor_row)
                pid = int(row[0])
                process_name = row[1]
                
                def check_answer(answer: bool) -> None:
                    if answer:
                        try:
                            proc = psutil.Process(pid)
                            proc.terminate()
                            self.notify(f"✅ Процесс {pid} завершен", timeout=2)
                            self.update_processes()
                        except psutil.NoSuchProcess:
                            self.notify(f"⚠️ Процесс {pid} не найден", severity="warning")
                        except psutil.AccessDenied:
                            self.notify(f"❌ Нет прав для завершения процесса {pid}", severity="error")
                        except Exception as e:
                            self.notify(f"❌ Ошибка: {e}", severity="error")
                
                question = f"Завершить процесс {pid} ({process_name})?"
                await self.push_screen_wait(ConfirmDialog(question, process_name, pid), check_answer)
                
            except Exception as e:
                self.notify(f"❌ Ошибка: {e}", severity="error")
    
    def action_show_help(self) -> None:
        """Показать справку"""
        self.push_screen(HelpScreen())
    
    def action_show_config(self) -> None:
        """Показать экран конфигурации"""
        self.push_screen(ConfigScreen())
    
    def action_show_process_details(self) -> None:
        """Показать детали выбранного процесса"""
        table = self.query_one("#process-table")
        if table.cursor_row is not None:
            try:
                row = table.get_row_at(table.cursor_row)
                pid = int(row[0])
                self.push_screen(ProcessDetailScreen(pid))
            except Exception as e:
                self.notify(f"❌ Ошибка: {e}", severity="error")
    
    @on(Button.Pressed, "#show-device-details")
    def action_show_device_details(self) -> None:
        """Показать детали выбранного устройства"""
        table = self.query_one("#devices-table")
        if table.cursor_row is not None and self.mounted_devices:
            try:
                row = table.get_row_at(table.cursor_row)
                device_name = row[0].strip()
                mountpoint = row[1].strip()
                
                for device_info in self.mounted_devices:
                    if (device_info['device'].strip() == device_name and 
                        device_info['mountpoint'].strip() == mountpoint):
                        self.push_screen(DeviceDetailScreen(device_info))
                        return
                
                self.notify("❌ Информация об устройстве не найдена", severity="error")
                
            except Exception as e:
                self.notify(f"❌ Ошибка: {e}", severity="error")
    
    def action_toggle_sort(self) -> None:
        """Переключение сортировки"""
        sort_options = ["cpu", "mem", "pid", "name"]
        current_index = sort_options.index(self.process_sort_by)
        next_index = (current_index + 1) % len(sort_options)
        self.process_sort_by = sort_options[next_index]
        
        sort_widget = self.query_one(SortWidget)
        radio_set = sort_widget.query_one(RadioSet)
        for button in radio_set.query(RadioButton):
            if button.id == self.process_sort_by:
                button.value = True
                break
        
        self.update_processes()
        self.notify(f"📊 Сортировка: {self.process_sort_by.upper()}", timeout=1)
    
    def action_quit(self) -> None:
        """Выход из приложения"""
        self.exit()


def check_root() -> bool:
    """Проверка прав root"""
    return os.geteuid() == 0


def main() -> None:
    """Основная функция запуска"""
    if not check_root():
        print("❌ Это приложение требует прав root!")
        print("💡 Запустите: sudo python system_monitor.py")
        sys.exit(1)
    
    try:
        import psutil
    except ImportError:
        print("❌ Установите psutil: pip install psutil")
        sys.exit(1)
    
    try:
        import textual
    except ImportError:
        print("❌ Установите textual: pip install textual")
        sys.exit(1)
    
    print("🚀 Запуск System Monitor...")
    print("ℹ️  Для справки нажмите F1")
    print("⏳ Загрузка данных...")
    
    app = SystemMonitorApp()
    app.run()


if __name__ == "__main__":
    main()