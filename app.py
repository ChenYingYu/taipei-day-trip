from fastapi import *
from fastapi.responses import FileResponse
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta
from fastapi.responses import JSONResponse
import mysql.connector
from contextlib import asynccontextmanager
from mysql.connector import pooling  # For database connection pooling

from dotenv import load_dotenv
import os

from typing import Annotated, Any

from fastapi.staticfiles import StaticFiles

db_pool = None
load_dotenv()


def create_db_pool():
    """Creates a connection pool to the MySQL database."""
    config = {
        "host": os.getenv("DB_HOST", "localhost"),
        "user": os.getenv("DB_USER"),
        "password": os.getenv("DB_PASSWORD"),
        "database": "taipei_day_trip",
        "pool_name": "taipei_pool",
        "pool_size": 5,
    }

    try:
        global db_pool
        db_pool = pooling.MySQLConnectionPool(**config)
        print("Database connection pool created successfully.")
    except mysql.connector.Error as err:
        print(f"Error creating connection pool: {err}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up... Creating database connection pool.")
    create_db_pool()
    yield
    print("Shutting down... Closing database connection pool.")
    global db_pool
    if db_pool is not None:
        db_pool = None
        print("Database connection pool reference cleared.")


app = FastAPI(lifespan=lifespan)

app.mount("/static", StaticFiles(directory="static"), name="static")


def get_connection():
    if db_pool is None:
        raise Exception("Database connection pool is not initialized.")
    return db_pool.get_connection()


# --- Authentication Config ---
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_jwt(user_id: int, name: str, email: str):
    payload = {
        "id": user_id,
        "name": name,
        "email": email,
        "exp": datetime.utcnow() + timedelta(days=7),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# Helper function to verify JWT and return user data
async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ")[1]
    try:
        # Decode the token using the secret key from .env
        payload = jwt.decode(token, os.getenv("JWT_SECRET_KEY"), algorithms=["HS256"])
        # Payload usually contains {"id": 1, "name": "...", "email": "..."}
        return payload
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.InvalidTokenError:
        return None  # Token tampered with


@app.post("/api/user")
async def signup(request: Request):
    try:
        data = await request.json()
        name, email, password = (
            data.get("name"),
            data.get("email"),
            data.get("password"),
        )

        if not name or not email or not password:
            return JSONResponse(
                status_code=400,
                content={"error": True, "message": "註冊失敗，欄位不得為空"},
            )

        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        # Check if email exists
        cursor.execute("SELECT id FROM user WHERE email = %s", (email,))
        if cursor.fetchone():
            return JSONResponse(
                status_code=400,
                content={"error": True, "message": "Email 已經註冊帳戶"},
            )

        # Hash and Insert
        hashed_password = pwd_context.hash(password)
        cursor.execute(
            "INSERT INTO user (name, email, password) VALUES (%s, %s, %s)",
            (name, email, hashed_password),
        )
        connection.commit()
        return {"ok": True}

    except Exception as e:
        return JSONResponse(
            status_code=500, content={"error": True, "message": f"伺服器錯誤: {str(e)}"}
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.put("/api/user/auth")
async def signin(request: Request):
    try:
        data = await request.json()
        email, password = data.get("email"), data.get("password")

        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT * FROM user WHERE email = %s", (email,))
        user = cursor.fetchone()

        if not user or not pwd_context.verify(password, user["password"]):
            return JSONResponse(
                status_code=400,
                content={"error": True, "message": "電子郵件或密碼錯誤"},
            )
        token = create_jwt(user["id"], user["name"], user["email"])
        return {"token": token}

    except Exception as e:
        return JSONResponse(
            status_code=500, content={"error": True, "message": "伺服器錯誤"}
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.get("/api/user/auth")
async def get_user_status(request: Request):
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        return {"data": None}

    token = auth_header.split(" ")[1]

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        return {
            "data": {
                "id": payload.get("id"),
                "name": payload.get("name"),
                "email": payload.get("email"),
            }
        }
    except jwt.ExpiredSignatureError:
        return {"data": None}
    except jwt.InvalidTokenError:
        return {"data": None}
    except Exception as e:
        print(f"Auth check error: {e}")
        return {"data": None}


@app.get("/api/attractions")
async def get_attractions(
    page: Annotated[int, Query(ge=0, description="頁碼，從 0 開始，每頁 8 筆資料")] = 0,
    category: Annotated[
        str | None, Query(description="按類別名稱篩選，精確匹配")
    ] = None,
    keyword: Annotated[
        str | None, Query(description="景點名稱包含關鍵字或捷運站名稱完全匹配")
    ] = None,
):
    connection = None
    cursor = None
    LIMIT = 8

    base_query = """
        SELECT
            A.id, A.name, C.name AS category, A.description, A.address, A.transport, A.lat, A.lng,
            GROUP_CONCAT(I.url) AS images,
            GROUP_CONCAT(DISTINCT M.name) AS mrts
        FROM attraction AS A
        LEFT JOIN category AS C ON A.category_id = C.id
        LEFT JOIN image AS I ON A.id = I.attraction_id
        LEFT JOIN attraction_mrt AS AM ON A.id = AM.attraction_id
        LEFT JOIN mrt_station AS M ON AM.mrt_id = M.id
        WHERE 1=1
    """

    where_params: list[Any] = []

    # 1. 類別篩選
    if category:
        base_query += " AND C.name = %s"
        where_params.append(category)

    # 2. 關鍵字篩選 (名稱 LIKE 或 MRT = )
    if keyword:
        base_query += " AND (A.name LIKE %s OR M.name = %s)"
        where_params.extend([f"%{keyword}%", keyword])

    # 3. 結束 GROUP BY, 排序, 和 LIMIT/OFFSET
    final_query = (
        base_query
        + """
        GROUP BY A.id
        ORDER BY A.id
        LIMIT %s OFFSET %s
    """
    )

    query_limit = LIMIT + 1
    query_offset = page * LIMIT

    # 最終參數列表 (WHERE 參數 + LIMIT/OFFSET 參數)
    params = where_params + [query_limit, query_offset]

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(final_query, params)
        results = cursor.fetchall()

        # 檢查是否有下一頁
        if len(results) == query_limit:
            next_page = page + 1
            data = results[:LIMIT]  # 返回前 8 筆
        else:
            next_page = None
            data = results  # 返回所有結果 (<= 8 筆)

        formatted_data = []
        for item in data:
            image_urls = item.pop("images").split(",") if item.get("images") else []

            formatted_data.append(
                {
                    "id": item["id"],
                    "name": item["name"],
                    "category": item["category"],
                    "description": item["description"],
                    "address": item["address"],
                    "transport": item["transport"],
                    "mrt": item.get("mrts").split(",")[0] if item.get("mrts") else None,
                    "lat": float(item["lat"]),
                    "lng": float(item["lng"]),
                    "images": image_urls,
                }
            )

        return {"nextPage": next_page, "data": formatted_data}

    except mysql.connector.Error as e:
        # 處理資料庫錯誤，返回 500
        print(f"Database Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": True, "message": "資料庫查詢錯誤，請稍後再試。"},
        )
    except Exception as e:
        # 處理其他所有錯誤，返回 500
        print(f"Unexpected Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": True, "message": "伺服器發生意外錯誤。"},
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.get("/api/attraction/{id}")
async def get_attraction_by_id(id: int):
    connection = None
    cursor = None

    query = """
		SELECT
			A.id, A.name, C.name AS category, A.description, A.address, A.transport, A.lat, A.lng,
			GROUP_CONCAT(I.url) AS images,
			GROUP_CONCAT(DISTINCT M.name) AS mrts
		FROM attraction AS A
		LEFT JOIN category AS C ON A.category_id = C.id
		LEFT JOIN image AS I ON A.id = I.attraction_id
		LEFT JOIN attraction_mrt AS AM ON A.id = AM.attraction_id
		LEFT JOIN mrt_station AS M ON AM.mrt_id = M.id
		WHERE A.id = %s
		GROUP BY A.id
	"""

    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(query, (id,))
        result = cursor.fetchone()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": True, "message": "景點不存在。"},
            )

        image_urls = result.pop("images").split(",") if result.get("images") else []

        formatted_data = {
            "id": result["id"],
            "name": result["name"],
            "category": result["category"],
            "description": result["description"],
            "address": result["address"],
            "transport": result["transport"],
            "mrt": result.get("mrts").split(",")[0] if result.get("mrts") else None,
            "lat": float(result["lat"]),
            "lng": float(result["lng"]),
            "images": image_urls,
        }

        return {"data": formatted_data}

    except mysql.connector.Error as e:
        print(f"Database Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": True, "message": "資料庫查詢錯誤，請稍後再試。"},
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": True, "message": "伺服器發生意外錯誤。"},
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# POST /api/booking - Create or Replace a booking
@app.post("/api/booking")
async def create_booking(request: Request):
    connection = None
    cursor = None

    user = await get_current_user(request)
    if not user:
        return JSONResponse(
            status_code=403, content={"error": True, "message": "未登入系統，拒絕存取"}
        )

    try:
        data = await request.json()

        required_fields = ["attractionId", "date", "time", "price"]

        # Check for missing fields
        if not all(data.get(field) for field in required_fields):
            return JSONResponse(
                status_code=400,
                content={"error": True, "message": "建立失敗，輸入資料不完整"},
            )

        # Logic check for Price vs Time
        price_rules = {"morning": 2000, "afternoon": 2500}
        if data["price"] != price_rules.get(data["time"]):
            return JSONResponse(
                status_code=400, content={"error": True, "message": "費用與時段不符"}
            )

        connection = get_connection()
        cursor = connection.cursor()

        # UPSERT logic: Insert or Update if user_id already exists
        query = """
            INSERT INTO booking (user_id, attraction_id, date, time, price)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
            attraction_id = VALUES(attraction_id),
            date = VALUES(date),
            time = VALUES(time),
            price = VALUES(price)
        """
        cursor.execute(
            query,
            (
                user["id"],
                data["attractionId"],
                data["date"],
                data["time"],
                data["price"],
            ),
        )
        connection.commit()
        return {"ok": True}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": True, "message": str(e)})
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# GET /api/booking - Get current user's booking
@app.get("/api/booking")
async def get_booking(request: Request):
    connection = None
    cursor = None

    user = await get_current_user(request)
    if not user:
        return JSONResponse(
            status_code=403, content={"error": True, "message": "未登入系統，拒絕存取"}
        )

    connection = None
    cursor = None
    try:
        # Get connection from the global pool
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT 
                b.attraction_id as id, a.name, a.address, (SELECT url FROM image WHERE attraction_id = a.id ORDER BY id ASC LIMIT 1) as image,
                b.date, b.time, b.price
            FROM booking b
            JOIN attraction a ON b.attraction_id = a.id
            JOIN image i ON i.attraction_id = a.id
            WHERE b.user_id = %s
            GROUP BY b.id, a.name, a.address, b.date, b.time, b.price
        """
        cursor.execute(query, (user["id"],))
        result = cursor.fetchone()

        if not result:
            return {"data": None}

        return {
            "data": {
                "attraction": {
                    "id": result["id"],
                    "name": result["name"],
                    "address": result["address"],
                    "image": result["image"],
                },
                "date": result["date"].strftime("%Y-%m-%d"),
                "time": result["time"],
                "price": result["price"],
            }
        }
    except Exception as e:
        print(f"Error: {e}")
        return JSONResponse(
            status_code=500, content={"error": True, "message": "伺服器內部錯誤"}
        )
    finally:
        # Crucial: always return the connection to the pool
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# DELETE /api/booking - Delete the booking
@app.delete("/api/booking")
async def delete_booking(request: Request):
    connection = None
    cursor = None

    user = await get_current_user(request)
    if not user:
        return JSONResponse(
            status_code=403, content={"error": True, "message": "未登入系統，拒絕存取"}
        )

    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("DELETE FROM booking WHERE user_id = %s", (user["id"],))
        connection.commit()
        return {"ok": True}
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.get("/api/categories")
async def get_categories():
    connection = None
    cursor = None

    query = "SELECT name FROM category"

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(query)
        results = cursor.fetchall()

        categories = [row[0] for row in results]

        return {"data": categories}

    except mysql.connector.Error as e:
        print(f"Database Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": True, "message": "資料庫查詢錯誤，請稍後再試。"},
        )
    except Exception as e:
        print(f"Unexpected Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": True, "message": "伺服器發生意外錯誤。"},
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.get("/api/mrts")
async def get_mrts():
    connection = None
    cursor = None

    query = "SELECT name FROM mrt_station"

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(query)
        results = cursor.fetchall()

        mrts = [row[0] for row in results]

        return {"data": mrts}

    except mysql.connector.Error as e:
        print(f"Database Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": True, "message": "資料庫查詢錯誤，請稍後再試。"},
        )
    except Exception as e:
        print(f"Unexpected Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": True, "message": "伺服器發生意外錯誤。"},
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.get("/", include_in_schema=False)
async def index(request: Request):
    return FileResponse("./static/index.html", media_type="text/html")


@app.get("/attraction/{id}", include_in_schema=False)
async def attraction(request: Request, id: int):
    return FileResponse("./static/attraction.html", media_type="text/html")


@app.get("/booking", include_in_schema=False)
async def booking(request: Request):
    return FileResponse("./static/booking.html", media_type="text/html")


@app.get("/thankyou", include_in_schema=False)
async def thankyou(request: Request):
    return FileResponse("./static/thankyou.html", media_type="text/html")
