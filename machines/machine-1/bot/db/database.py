import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

def get_database_url():
    DB_HOST = os.getenv("DB_HOST", "db")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "postgres")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASS = os.getenv("DB_PASS", "postgres")
    return f"postgresql+asyncpg://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def create_db_engine(echo=False):
    return create_async_engine(get_database_url(), echo=echo)

def create_session_maker(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)