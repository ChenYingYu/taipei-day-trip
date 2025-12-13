# Load raw data from taipei-attraction.json and save to MySQL database
import json
import mysql.connector
from dotenv import load_dotenv
import os
import re


def main():
    attractions = load_raw_data("data/taipei-attractions.json")
    connection = get_db_connection()

    try:
        setup_database_and_table(connection)
        categories, mrts = extract_unique_names(attractions)
        cat_map, mrt_map = insert_unique_names(connection, categories, mrts)
        insert_attraction_data(connection, attractions, cat_map, mrt_map)
        connection.commit()
        print("Data import and database setup complete!")

    except Exception as e:
        connection.rollback()
        print(f"Data import failed: {e}")

    finally:
        connection.close()


def load_raw_data(file_path):
    with open(file_path, "r", encoding="utf-8") as file:
        data = json.load(file)
        return data["result"]["results"]


def get_db_connection():
    load_dotenv()
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    host = os.getenv("DB_HOST", "localhost")
    connection = mysql.connector.connect(host=host, user=user, password=password)
    return connection


def setup_database_and_table(connection):
    cursor = connection.cursor()
    cursor.execute("DROP DATABASE IF EXISTS taipei_day_trip")
    cursor.execute("CREATE DATABASE taipei_day_trip")
    cursor.execute("USE taipei_day_trip")
    cursor.execute("DROP TABLE IF EXISTS attraction")
    cursor.execute("DROP TABLE IF EXISTS category")
    cursor.execute("DROP TABLE IF EXISTS image")
    cursor.execute("DROP TABLE IF EXISTS mrt_station")
    cursor.execute(
        """
        CREATE TABLE category (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL
        )
    """
    )
    cursor.execute(
        """
        CREATE TABLE mrt_station (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL
        )
    """
    )
    cursor.execute(
        """
        CREATE TABLE attraction (
            id INT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            category_id INT,
            description TEXT,
            address VARCHAR(500),
            transport TEXT,
            lat DECIMAL(10,7) NOT NULL,
            lng DECIMAL(10,7) NOT NULL,
            FOREIGN KEY (category_id) REFERENCES category(id)
        )
    """
    )
    cursor.execute(
        """
    CREATE TABLE image (
        id INT AUTO_INCREMENT PRIMARY KEY,
        attraction_id INT,
        url TEXT NOT NULL,
        FOREIGN KEY (attraction_id) REFERENCES attraction(id)
    )
    """
    )

    cursor.execute(
        """
        CREATE TABLE attraction_mrt (
            attraction_id INT,
            mrt_id INT,
            PRIMARY KEY (attraction_id, mrt_id),
            FOREIGN KEY (attraction_id) REFERENCES attraction(id),
            FOREIGN KEY (mrt_id) REFERENCES mrt_station(id)
        )
    """
    )

    cursor.close()


def filter_images(image_string):

    if not image_string:
        return []
    valid_urls = re.findall(
        r"(https?://.*?\.jpg|https?://.*?\.png|https?://.*?\.JPG|https?://.*?\.PNG)",
        image_string,
        re.IGNORECASE,
    )

    return valid_urls


def extract_unique_names(attractions):
    categories = set()
    mrts = set()
    for attraction in attractions:
        cat = attraction.get("CAT")
        mrt = attraction.get("MRT")
        if cat and str(cat).strip():
            categories.add(str(cat).strip())
        if mrt and str(mrt).strip():
            mrts.add(str(mrt).strip())
    return categories, mrts


def insert_unique_names(connection, categories, mrts):
    cat_map = {}
    mrt_map = {}
    cursor = connection.cursor()
    for category in categories:
        if not category:
            continue
        cursor.execute("INSERT INTO category (name) VALUES (%s)", (category,))
        cat_map[category] = cursor.lastrowid
    for mrt in mrts:
        if not mrt:
            continue
        cursor.execute("INSERT INTO mrt_station (name) VALUES (%s)", (mrt,))
        mrt_map[mrt] = cursor.lastrowid
    cursor.close()
    connection.commit()
    return cat_map, mrt_map


def insert_attraction_data(connection, attractions, cat_map, mrt_map):
    cursor = connection.cursor()
    image_insert_query = "INSERT INTO image (attraction_id, url) VALUES (%s, %s)"
    mrt_bridge_query = (
        "INSERT INTO attraction_mrt (attraction_id, mrt_id) VALUES (%s, %s)"
    )
    for attraction in attractions:
        name = attraction.get("name")
        if not name:
            print(f"Skipping attraction with missing name (id={attraction.get('_id')})")
            continue
        cursor.execute(
            """
            INSERT INTO attraction (id, name, category_id, description, address, transport, lat, lng)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
            (
                attraction["_id"],
                attraction["name"],
                cat_map[attraction["CAT"]],
                attraction["description"],
                attraction["address"],
                attraction["direction"],
                attraction["latitude"],
                attraction["longitude"],
            ),
        )

        mrt_name = attraction["MRT"]
        mrt_id = mrt_map.get(mrt_name)
        if mrt_id:
            cursor.execute(mrt_bridge_query, (attraction["_id"], mrt_id))

        image_urls = filter_images(attraction["file"])
        for url in image_urls:
            cursor.execute(image_insert_query, (attraction["_id"], url))
    cursor.close()
    connection.commit()


if __name__ == "__main__":
    main()
