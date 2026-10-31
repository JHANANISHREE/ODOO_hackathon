import sqlalchemy as sa
from app.db.base import Base
from app.db.session import engine
from app.models import *

def init_database():
    with engine.connect() as conn:
        conn.execute(sa.text("SET FOREIGN_KEY_CHECKS = 0;"))
        # Drop any existing tables in brightloop_db to ensure clean alignment
        result = conn.execute(sa.text("SHOW TABLES;"))
        tables = [row[0] for row in result]
        for tbl in tables:
            conn.execute(sa.text(f"DROP TABLE IF EXISTS `{tbl}`;"))
        conn.execute(sa.text("SET FOREIGN_KEY_CHECKS = 1;"))
        conn.commit()
    
    Base.metadata.create_all(bind=engine)
    print("All backend tables successfully created in brightloop_db!")

if __name__ == "__main__":
    init_database()
