#!/bin/bash
# ====================================================================
# สคริปต์เปิดใช้งานระบบทะเบียนคุมออกหมายจับ 47 และ 47 ทวิ (สำหรับ macOS)
# ดับเบิ้ลคลิกไฟล์นี้เพื่อเริ่มเปิดระบบผ่าน Local Web Server
# ====================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

PORT=8000
echo "================================================================="
echo " กำลังเริ่มเปิดระบบทะเบียนคุมออกหมายจับ 47 และ 47 ทวิ..."
echo " Web Server URL: http://localhost:$PORT"
echo "================================================================="

# เปิดเบราว์เซอร์ไปยัง URL
open "http://localhost:$PORT"

# เริ่มต้น Python Web Server
if command -v python3 &>/dev/null; then
    python3 -m http.server $PORT
elif command -v python &>/dev/null; then
    python -m SimpleHTTPServer $PORT
else
    echo "ไม่พบ Python ในเครื่อง กรุณาติดตั้ง Python หรือเปิดผ่าน VS Code Live Server"
fi
