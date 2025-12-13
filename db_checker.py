import mysql.connector
from dotenv import load_dotenv
import os


# --- Helper Function (Copied from data_importer.py) ---
def get_db_connection():
    """Connects to the MySQL server using credentials from the .env file."""
    load_dotenv()
    host = os.getenv("DB_HOST", "localhost")
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")

    # We must explicitly select the database since we are querying data
    DB_NAME = "taipei_day_trip"

    try:
        connection = mysql.connector.connect(
            host=host,
            user=user,
            password=password,
            database=DB_NAME,  # Specify the database to connect to
        )
        return connection
    except mysql.connector.Error as err:
        print(f"Error connecting to MySQL: {err}")
        print(
            "Please ensure your MySQL server is running and .env credentials are correct."
        )
        return None


def run_verification_query(connection, title, query):
    """Executes a query and prints the results in a readable format."""
    cursor = connection.cursor()
    print("-" * 50)
    print(f"VERIFICATION: {title}")
    print("-" * 50)
    try:
        cursor.execute(query)

        # Print column headers
        headers = [i[0] for i in cursor.description]
        print("| {:<10} | {:<40} |".format(headers[0], headers[1]))

        # Print rows
        for row in cursor.fetchall():
            print("| {:<10} | {:<40} |".format(str(row[0]), str(row[1])))

    except mysql.connector.Error as err:
        print(f"Query failed: {err}")
    finally:
        cursor.close()


def main():
    connection = get_db_connection()
    if connection is None:
        return

    print("--- Starting Database Data Verification ---")

    # 1. Check Attraction Data (Primary Table Integrity)
    # Checks if Attraction Name is linked to an ID (Normalization)
    run_verification_query(
        connection,
        "Attraction Data (Attraction ID and Category ID)",
        "SELECT id, name, category_id FROM attraction LIMIT 5",
    )

    # 2. Check Category Normalization
    # Checks if Categories were correctly inserted and have IDs
    run_verification_query(
        connection,
        "Category List (Name-to-ID Mapping)",
        "SELECT id, name FROM category LIMIT 5",
    )

    # 3. Check MRT Station Normalization
    # Checks if MRT Stations were correctly inserted and have IDs
    run_verification_query(
        connection,
        "MRT Station List (Name-to-ID Mapping)",
        "SELECT id, name FROM mrt_station LIMIT 5",
    )

    # 4. Check Many-to-Many Bridge (MRT Links)
    # Checks the crucial link between Attraction and MRT Station
    run_verification_query(
        connection,
        "Attraction-MRT Bridge (attraction_id and mrt_id)",
        "SELECT attraction_id, mrt_id FROM attraction_mrt LIMIT 5",
    )

    # 5. Check Image Normalization
    # Checks if filtered image URLs were inserted into the separate table
    run_verification_query(
        connection,
        "Image URLs (attraction_id and URL)",
        "SELECT attraction_id, url FROM image LIMIT 5",
    )

    connection.close()
    print("--- Database Verification Complete ---")


if __name__ == "__main__":
    main()
