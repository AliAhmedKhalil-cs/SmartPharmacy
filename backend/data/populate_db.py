def get_conn():
    return mysql.connector.connect(
        host="127.0.0.1",
        user="root",
        password="1234",  # تأكد إنها نفس كلمة المرور اللي على MySQL
        database="smart_pharmacy",
        charset='utf8mb4'
    )
