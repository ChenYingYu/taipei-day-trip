import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()


def init_db():
    try:
        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "taipei_day_trip"),
        )
        cursor = connection.cursor()

        # Create user table
        create_user_table = """
        CREATE TABLE IF NOT EXISTS user (
            id BIGINT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL
        );
        """
        cursor.execute(create_user_table)
        print("Table 'user' created successfully!")

    except mysql.connector.Error as err:
        print(f"Error: {err}")
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


if __name__ == "__main__":
    init_db()
