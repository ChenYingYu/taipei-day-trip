import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()


def init_booking_db():
    try:
        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "taipei_day_trip"),
        )
        cursor = connection.cursor()

        # Create booking table
        create_booking_table = """
        CREATE TABLE IF NOT EXISTS booking (
            id BIGINT PRIMARY KEY AUTO_INCREMENT,
            user_id BIGINT NOT NULL UNIQUE,
            attraction_id INT NOT NULL,
            date DATE NOT NULL,
            time VARCHAR(20) NOT NULL,
            price INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
            FOREIGN KEY (attraction_id) REFERENCES attraction(id) ON DELETE CASCADE
        );
        """
        cursor.execute(create_booking_table)
        print("Table 'booking' created successfully!")

    except mysql.connector.Error as err:
        print(f"Error: {err}")
    finally:
        if "connection" in locals() and connection.is_connected():
            cursor.close()
            connection.close()


if __name__ == "__main__":
    init_booking_db()
