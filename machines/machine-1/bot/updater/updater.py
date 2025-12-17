import asyncio
import random
import logging
from datetime import datetime

from sqlalchemy import select
from db.models import GeneratorData
from db.database import create_db_engine, create_session_maker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

engine = create_db_engine()
async_session_maker = create_session_maker(engine)

async def update_generator_data():
    while True:
        try:
            async with async_session_maker() as session:
                result = await session.execute(select(GeneratorData).limit(1))
                gen_data = result.scalar_one_or_none()
                
                if gen_data:
                    gen_data.power_output = max(2000, min(3000, gen_data.power_output + random.uniform(-50, 50)))
                    gen_data.temperature = max(70, min(100, gen_data.temperature + random.uniform(-2, 2)))
                    gen_data.pressure = max(140, min(160, gen_data.pressure + random.uniform(-3, 3)))
                    gen_data.voltage = max(13000, min(14000, gen_data.voltage + random.uniform(-100, 100)))
                    gen_data.frequency = max(49.5, min(50.5, gen_data.frequency + random.uniform(-0.2, 0.2)))
                    gen_data.fuel_level = max(50, min(100, gen_data.fuel_level + random.uniform(-0.5, 0.1)))
                    gen_data.coolant_flow = max(400, min(500, gen_data.coolant_flow + random.uniform(-10, 10)))
                    gen_data.turbine_rpm = max(2900, min(3100, gen_data.turbine_rpm + random.uniform(-20, 20)))
                    gen_data.efficiency = max(90, min(98, gen_data.efficiency + random.uniform(-0.5, 0.5)))
                    gen_data.vibration_level = max(1.5, min(3.0, gen_data.vibration_level + random.uniform(-0.2, 0.2)))
                    
                    await session.commit()
                    logger.info(f"Updated generator data at {datetime.now()}")
                
        except Exception as e:
            logger.error(f"Error updating data: {e}")
        
        await asyncio.sleep(10)

async def main():
    logger.info("Starting updater service...")
    await asyncio.sleep(5)
    await update_generator_data()

if __name__ == "__main__":
    asyncio.run(main())