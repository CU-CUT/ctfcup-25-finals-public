import logging
import sys
import os
from datetime import datetime
from typing import Callable, Awaitable

from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.client.telegram import TelegramAPIServer
from aiohttp import web

from aiogram import Bot, Dispatcher, Router, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import CommandStart, Command
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, CallbackQuery
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage

from sqlalchemy import select
from db.models import Base, GeneratorData, User
from db.database import create_db_engine, create_session_maker

TOKEN = os.getenv("BOT_TOKEN")
ADMIN_ID = int(os.getenv("ADMIN_ID", "0"))
SSH_USER_PASSWORD = os.getenv("SSH_USER_PASSWORD")
TELEGRAM_BOT_API_URL = os.getenv("TELEGRAM_BOT_API_URL")
WEBHOOK_HOST = os.getenv("WEBHOOK_HOST", "0.0.0.0")
WEBHOOK_PORT = int(os.getenv("WEBHOOK_PORT", "8080"))
WEBHOOK_PATH = os.getenv("WEBHOOK_PATH", "/webhook")
DOCS_PUBLIC_URL = os.getenv("DOCS_PUBLIC_URL")
BASE_WEBHOOK_URL = f"http://{WEBHOOK_HOST}:{WEBHOOK_PORT}"

engine = create_db_engine()
async_session_maker = create_session_maker(engine)

router = Router()
storage = MemoryStorage()

logging.basicConfig(level=logging.INFO, stream=sys.stdout)
logger = logging.getLogger(__name__)

class DiagnosticStates(StatesGroup):
    awaiting_module = State()
    awaiting_calibration = State()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_session_maker() as session:
        result = await session.execute(select(GeneratorData))
        if not result.scalar_one_or_none():
            gen_data = GeneratorData(
                power_output=2500.0,
                temperature=85.3,
                pressure=150.2,
                voltage=13800.0,
                frequency=50.0,
                fuel_level=78.5,
                coolant_flow=450.0,
                turbine_rpm=3000.0,
                efficiency=94.2,
                vibration_level=2.1
            )
            session.add(gen_data)
            await session.commit()
        admin_result = await session.execute(select(User).where(User.telegram_id == ADMIN_ID))
        admin_user = admin_result.scalar_one_or_none()
        if not admin_user:
            admin_user = User(telegram_id=ADMIN_ID, username="admin", is_admin=True)
            session.add(admin_user)
            await session.commit()

async def get_or_create_user(telegram_id: int, username: str = None) -> User:
    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.telegram_id == telegram_id))
        user = result.scalar_one_or_none()
        if not user:
            user = User(telegram_id=telegram_id, username=username, is_admin=(telegram_id == ADMIN_ID))
            session.add(user)
            await session.commit()
            await session.refresh(user)
        return user

async def is_admin(telegram_id: int) -> bool:
    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.telegram_id == telegram_id))
        user = result.scalar_one_or_none()
        return user.is_admin if user else False

def get_main_keyboard():
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📊 Статус системы", callback_data="status")],
        [InlineKeyboardButton(text="⚡ Параметры генератора", callback_data="generator")],
        [InlineKeyboardButton(text="🔧 Диагностика", callback_data="diagnostics")],
        [InlineKeyboardButton(text="📈 Мониторинг", callback_data="monitoring")],
        [InlineKeyboardButton(text="⚙️ Настройки", callback_data="settings")],
        [InlineKeyboardButton(text="Веб-интерфейс", url=DOCS_PUBLIC_URL)]
    ])
    return keyboard

def get_generator_keyboard():
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔋 Мощность", callback_data="gen_power")],
        [InlineKeyboardButton(text="🌡️ Температура", callback_data="gen_temp")],
        [InlineKeyboardButton(text="💨 Охлаждение", callback_data="gen_cooling")],
        [InlineKeyboardButton(text="⚙️ Турбина", callback_data="gen_turbine")],
        [InlineKeyboardButton(text="🔙 Назад", callback_data="back_main")]
    ])
    return keyboard

async def get_generator_data():
    async with async_session_maker() as session:
        result = await session.execute(select(GeneratorData).limit(1))
        return result.scalar_one_or_none()

@router.message(CommandStart())
async def command_start_handler(message: Message) -> None:
    user = await get_or_create_user(message.from_user.id, message.from_user.username)

    welcome_text = f"""
🔋 <b>Система управления генератором №1</b>

Добро пожаловать в систему управления энергетическим комплексом!  

<i>Генератор №1 является одним из четырех генераторов системы жизнеобеспечения проекта "Метавселенная".</i>

👤 Оператор: {message.from_user.full_name}
🆔 ID: <code>{message.from_user.id}</code>
🔐 Уровень доступа: {'АДМИНИСТРАТОР' if user.is_admin else 'ОПЕРАТОР'}

⚠️ <b>ВНИМАНИЕ:</b> Все действия в системе регистрируются и сохраняются в журнале событий.

Используйте меню ниже для доступа к функциям системы.
    """

    await message.answer(welcome_text, reply_markup=get_main_keyboard())

@router.message(Command("status"))
async def cmd_status(message: Message):
    user = await get_or_create_user(message.from_user.id, message.from_user.username)
    gen_data = await get_generator_data()

    status_text = f"""
📊 <b>СТАТУС СИСТЕМЫ</b>

⚡ Генератор: <b>АКТИВЕН</b>
🔌 Мощность: <b>{gen_data.power_output:.1f} МВт</b>
🌡️ Температура: <b>{gen_data.temperature:.1f}°C</b>
💨 Давление: <b>{gen_data.pressure:.1f} кПа</b>
📊 Эффективность: <b>{gen_data.efficiency:.1f}%</b>

🔋 Топливо: <b>{gen_data.fuel_level:.1f}%</b>
💧 Охлаждение: <b>{gen_data.coolant_flow:.1f} л/мин</b>
⚙️ Турбина: <b>{gen_data.turbine_rpm:.0f} об/мин</b>

⏱️ Обновлено: {gen_data.updated_at.strftime('%Y-%m-%d %H:%M:%S')}
    """

    await message.answer(status_text, reply_markup=get_main_keyboard())

@router.message(Command("promote"))
async def cmd_promote(message: Message):
    user = await get_or_create_user(message.from_user.id, message.from_user.username)

    if not await is_admin(message.from_user.id):
        await message.answer("❌ <b>ОШИБКА ДОСТУПА</b>\n\nУ вас нет прав для выполнения этой команды.")
        return

    try:
        args = message.text.split()
        if len(args) < 2:
            await message.answer("❌ Использование: /promote <user_id>")
            return

        target_id = int(args[1])

        async with async_session_maker() as session:
            result = await session.execute(select(User).where(User.telegram_id == target_id))
            target_user = result.scalar_one_or_none()

            if not target_user:
                target_user = User(telegram_id=target_id, is_admin=True)
                session.add(target_user)
            else:
                target_user.is_admin = True

            await session.commit()

        await message.answer(f"✅ Пользователь {target_id} получил права администратора.")

    except ValueError:
        await message.answer("❌ Неверный формат ID пользователя.")
    except Exception as e:
        await message.answer(f"❌ Ошибка: {str(e)}")

@router.message(Command("get_remote_pass"))
async def cmd_get_remote_pass(message: Message):
    user = await get_or_create_user(message.from_user.id, message.from_user.username)

    if not await is_admin(message.from_user.id):
        await message.answer("❌ <b>ОШИБКА ДОСТУПА</b>\n\nУ вас нет прав для выполнения этой команды.")
        return

    await message.answer(
        f"🔐 <b>Удаленный доступ</b>\n\n"
        f"Пароль для доступа по <b>защищенному каналу</b>: <code>{SSH_USER_PASSWORD}</code>\n\n"
    )

@router.callback_query(F.data == "status")
async def callback_status(callback: CallbackQuery):
    gen_data = await get_generator_data()

    status_text = f"""
📊 <b>СТАТУС СИСТЕМЫ</b>

⚡ Генератор: <b>АКТИВЕН</b>
🔌 Мощность: <b>{gen_data.power_output:.1f} МВт</b>
🌡️ Температура: <b>{gen_data.temperature:.1f}°C</b>
💨 Давление: <b>{gen_data.pressure:.1f} кПа</b>
📊 Эффективность: <b>{gen_data.efficiency:.1f}%</b>

🔋 Топливо: <b>{gen_data.fuel_level:.1f}%</b>
💧 Охлаждение: <b>{gen_data.coolant_flow:.1f} л/мин</b>
⚙️ Турбина: <b>{gen_data.turbine_rpm:.0f} об/мин</b>

⏱️ Обновлено: {gen_data.updated_at.strftime('%Y-%m-%d %H:%M:%S')}
    """

    await callback.message.edit_text(status_text, reply_markup=get_main_keyboard())
    await callback.answer()

@router.callback_query(F.data == "generator")
async def callback_generator(callback: CallbackQuery):
    text = """
⚡ <b>ПАРАМЕТРЫ ГЕНЕРАТОРА</b>

Выберите параметр для просмотра детальной информации:
    """
    await callback.message.edit_text(text, reply_markup=get_generator_keyboard())
    await callback.answer()

@router.callback_query(F.data == "gen_power")
async def callback_gen_power(callback: CallbackQuery):
    gen_data = await get_generator_data()

    text = f"""
🔋 <b>ПАРАМЕТРЫ МОЩНОСТИ</b>

⚡ Выходная мощность: <b>{gen_data.power_output:.1f} МВт</b>
🔌 Напряжение: <b>{gen_data.voltage:.0f} В</b>
📊 Частота: <b>{gen_data.frequency:.1f} Гц</b>
💡 Эффективность: <b>{gen_data.efficiency:.1f}%</b>

<i>Генератор работает в штатном режиме</i>
    """

    await callback.message.edit_text(text, reply_markup=get_generator_keyboard())
    await callback.answer()

@router.callback_query(F.data == "gen_temp")
async def callback_gen_temp(callback: CallbackQuery):
    gen_data = await get_generator_data()

    text = f"""
🌡️ <b>ТЕМПЕРАТУРНЫЕ ПАРАМЕТРЫ</b>

🌡️ Основная температура: <b>{gen_data.temperature:.1f}°C</b>
📈 Допустимая: <b>120.0°C</b>
⚠️ Критическая: <b>150.0°C</b>

✅ <i>Температурный режим в норме</i>
    """

    await callback.message.edit_text(text, reply_markup=get_generator_keyboard())
    await callback.answer()

@router.callback_query(F.data == "gen_cooling")
async def callback_gen_cooling(callback: CallbackQuery):
    gen_data = await get_generator_data()

    text = f"""
💨 <b>СИСТЕМА ОХЛАЖДЕНИЯ</b>

💧 Поток охлаждающей жидкости: <b>{gen_data.coolant_flow:.1f} л/мин</b>
📊 Давление в системе: <b>{gen_data.pressure:.1f} кПа</b>
🔵 Уровень хладагента: <b>92%</b>

✅ <i>Система охлаждения функционирует нормально</i>
    """

    await callback.message.edit_text(text, reply_markup=get_generator_keyboard())
    await callback.answer()

@router.callback_query(F.data == "gen_turbine")
async def callback_gen_turbine(callback: CallbackQuery):
    gen_data = await get_generator_data()

    text = f"""
⚙️ <b>ТУРБИННЫЙ МОДУЛЬ</b>

🔄 Обороты: <b>{gen_data.turbine_rpm:.0f} об/мин</b>
📊 Вибрация: <b>{gen_data.vibration_level:.1f} мм/с</b>
🔋 Топливо: <b>{gen_data.fuel_level:.1f}%</b>

✅ <i>Турбина работает стабильно</i>
    """

    await callback.message.edit_text(text, reply_markup=get_generator_keyboard())
    await callback.answer()

@router.callback_query(F.data == "diagnostics")
async def callback_diagnostics(callback: CallbackQuery):
    text = f"""
🔧 <b>ДИАГНОСТИЧЕСКАЯ СИСТЕМА</b>

✅ Все системы функционируют нормально

Последняя проверка: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

📝 Модули:
• Энергоблок — OK
• Система охлаждения — OK
• Турбина — OK
• Топливная система — OK
• Датчики — OK

⚠️ <b>ПРЕДУПРЕЖДЕНИЕ:</b> Обнаружена нестабильность в подсистеме синхронизации между генераторами. 

<i>Для подробной информации просмотрите логи на сервере.</i>
    """

    await callback.message.edit_text(text, reply_markup=get_main_keyboard())
    await callback.answer()

@router.callback_query(F.data == "monitoring")
async def callback_monitoring(callback: CallbackQuery):
    gen_data = await get_generator_data()

    text = f"""
📈 <b>МОНИТОРИНГ В РЕАЛЬНОМ ВРЕМЕНИ</b>

📊 <b>Текущие показатели:</b>

⚡ Мощность: {gen_data.power_output:.1f} МВт
🌡️ Температура: {gen_data.temperature:.1f}°C
💨 Давление: {gen_data.pressure:.1f} кПа
⚙️ Турбина: {gen_data.turbine_rpm:.0f} об/мин
🔋 Топливо: {gen_data.fuel_level:.1f}%

🕐 Время работы: 127 дней 14 часов
🔌 Генерация энергии: <b>АКТИВНА</b>

<i>Система функционирует в штатном режиме</i>
    """

    await callback.message.edit_text(text, reply_markup=get_main_keyboard())
    await callback.answer()

@router.callback_query(F.data == "settings")
async def callback_settings(callback: CallbackQuery):
    user = await get_or_create_user(callback.from_user.id, callback.from_user.username)

    text = f"""
⚙️ <b>НАСТРОЙКИ СИСТЕМЫ</b>

👤 Пользователь: {callback.from_user.full_name}
🆔 ID: <code>{callback.from_user.id}</code>
🔐 Уровень доступа: {'АДМИНИСТРАТОР' if user.is_admin else 'ОПЕРАТОР'}

📅 Зарегистрирован: {user.registered_at.strftime('%Y-%m-%d')}

<b>Доступные команды:</b>
/status — показать статус системы
    """

    await callback.message.edit_text(text, reply_markup=get_main_keyboard(), disable_web_page_preview=True)
    await callback.answer()

@router.callback_query(F.data == "back_main")
async def callback_back_main(callback: CallbackQuery):
    text = """
🔋 <b>СИСТЕМА УПРАВЛЕНИЯ ГЕНЕРАТОРОМ №1</b>

Выберите раздел для просмотра:
    """
    await callback.message.edit_text(text, reply_markup=get_main_keyboard())
    await callback.answer()

@router.message()
async def unknown_command(message: Message):
    await message.answer(
        "❓ <b>Неизвестная команда</b>\n\n"
        "Используйте /start для отображения главного меню."
    )

async def on_startup(bot: Bot) -> None:
    await init_db()
    await bot.set_webhook(f"{BASE_WEBHOOK_URL}{WEBHOOK_PATH}")
    logger.info(f"Webhook set to {BASE_WEBHOOK_URL}{WEBHOOK_PATH}")

@web.middleware
async def logger_middleware(request: web.Request, handler: Callable[[web.Request], Awaitable[web.StreamResponse]]):
    body = await request.text()
    logger.info("WEBHOOK REQUEST %s %s", request.method, request.path_qs)
    logger.info("Headers: %s", dict(request.headers))
    logger.info("Body: %s", body.replace("\n", ""))
    return await handler(request)

def main() -> None:
    dp = Dispatcher(storage=storage)
    dp.include_router(router)
    dp.startup.register(on_startup)

    session = AiohttpSession(
        api=TelegramAPIServer.from_base(TELEGRAM_BOT_API_URL)
    )

    bot = Bot(token=TOKEN, session=session, default=DefaultBotProperties(parse_mode=ParseMode.HTML))

    app = web.Application(logger=logging.getLogger())
    app.middlewares.append(logger_middleware)

    webhook_requests_handler = SimpleRequestHandler(
        dispatcher=dp,
        bot=bot,
    )
    webhook_requests_handler.register(app, path=WEBHOOK_PATH)

    setup_application(app, dp, bot=bot)

    web.run_app(app, host=WEBHOOK_HOST, port=WEBHOOK_PORT)

if __name__ == "__main__":
    main()