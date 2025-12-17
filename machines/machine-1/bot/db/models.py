from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, BigInteger
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

class GeneratorData(Base):
    __tablename__ = "generator_data"
    id = Column(Integer, primary_key=True)
    power_output = Column(Float, default=0.0)
    temperature = Column(Float, default=0.0)
    pressure = Column(Float, default=0.0)
    voltage = Column(Float, default=0.0)
    frequency = Column(Float, default=0.0)
    fuel_level = Column(Float, default=0.0)
    coolant_flow = Column(Float, default=0.0)
    turbine_rpm = Column(Float, default=0.0)
    efficiency = Column(Float, default=0.0)
    vibration_level = Column(Float, default=0.0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    telegram_id = Column(BigInteger, unique=True)
    username = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False)
    registered_at = Column(DateTime, server_default=func.now())
