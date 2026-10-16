/**
 * ==============================================================================
 * ระบบทะเบียนคุมออกหมายจับ 47 และ 47 ทวิ - Google Apps Script Backend (Code.gs)
 * ==============================================================================
 * 
 * วิธีการติดตั้ง:
 * 1. เปิด Google Sheet: https://docs.google.com/spreadsheets/d/1uhvnk1kRMmZRs1ZyKGjDK75s1ZJSekBJWu-IMt_ZdcA/edit
 * 2. ไปที่เมนู "ส่วนขยาย" (Extensions) > "Apps Script"
 * 3. นำโค้ดทั้งหมดในไฟล์นี้ไปวางแทนที่ Code.gs
 * 4. รันฟังก์ชัน "initialSetup" ครั้งแรก เพื่อสร้างตาราง DATA และ USERS พร้อม User admin อัตโนมัติ
 * 5. กดปุ่ม "ทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้รายการใหม่" (New deployment)
 * 6. เลือกประเภทเป็น "เว็บแอป" (Web app)
 * 7. ตั้งค่า:
 *    - คำอธิบาย: ระบบทะเบียนคุมออกหมายจับ 47 และ 47 ทวิ
 *    - ดำเนินการในฐานะ: ตัวฉัน (Me)
 *    - ผู้ที่มีสิทธิ์เข้าถึง: ทุกคน (Anyone)
 * 8. คัดลอก "URL เว็บแอป" (Web App URL) มาใส่ในหน้าตั้งค่าของระบบเว็บแอป
 */

const SHEET_DATA_NAME = "DATA";
const SHEET_USERS_NAME = "USERS";

/**
 * ติดตั้งและสร้างหัวตารางเริ่มต้น
 */
function initialSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. ตั้งค่าแท็บ DATA
  let dataSheet = ss.getSheetByName(SHEET_DATA_NAME);
  if (!dataSheet) {
    dataSheet = ss.insertSheet(SHEET_DATA_NAME);
  }
  
  if (dataSheet.getLastRow() === 0) {
    const dataHeaders = [
      "ID",
      "ประเภทหมายจับ",
      "เลขหมายจับ",
      "เลขคดีดำ",
      "เลขคดีแดง",
      "ส่วนที่ออกหมายจับ",
      "วันที่ออกหมายจับ",
      "ผู้บันทึกข้อมูล",
      "วันที่บันทึก",
      "วันที่แก้ไขล่าสุด"
    ];
    dataSheet.appendRow(dataHeaders);
    dataSheet.getRange(1, 1, 1, dataHeaders.length)
      .setBackground("#1E3A8A")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold");
    dataSheet.setFrozenRows(1);
  }
  
  // 2. ตั้งค่าแท็บ USERS
  let userSheet = ss.getSheetByName(SHEET_USERS_NAME);
  if (!userSheet) {
    userSheet = ss.insertSheet(SHEET_USERS_NAME);
  }
  
  if (userSheet.getLastRow() === 0) {
    const userHeaders = ["Username", "Password", "FullName", "Role", "Department", "CreatedAt"];
    userSheet.appendRow(userHeaders);
    userSheet.getRange(1, 1, 1, userHeaders.length)
      .setBackground("#0F172A")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold");
    userSheet.setFrozenRows(1);
    
    // สร้างผู้ใช้งานเริ่มต้น user: admin / pass: caogikojt02 ตามที่ระบุ
    userSheet.appendRow([
      "admin",
      "caogikojt02",
      "ผู้ดูแลระบบ (Admin)",
      "admin",
      "",
      new Date().toISOString()
    ]);
  } else {
    // หากมีหัวตารางเดิมอยู่แล้วแต่ยังไม่มีคอลัมน์ Department ให้แทรกคอลัมน์ให้อัตโนมัติ
    const headerVals = userSheet.getRange(1, 1, 1, Math.max(userSheet.getLastColumn(), 5)).getValues()[0];
    if (headerVals[4] !== "Department" && headerVals[3] === "Role") {
      userSheet.insertColumnAfter(4);
      userSheet.getRange(1, 5).setValue("Department")
        .setBackground("#0F172A")
        .setFontColor("#FFFFFF")
        .setFontWeight("bold");
    }
  }
  
  Logger.log("Setup completed successfully!");
  return "Setup completed successfully!";
}

/**
 * รองรับการดึงข้อมูลผ่าน HTTP GET
 * - ดึงเป็น CSV (ตรงตามข้อ 8: ให้มีการดึงข้อมูลเพื่อแสดงผลผ่าน CSV)
 * - หรือดึงเป็น JSON
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getCSV";
    const sheetName = (e && e.parameter && e.parameter.sheet) ? e.parameter.sheet : SHEET_DATA_NAME;
    const callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : null;
    
    // --- ดึงข้อมูล CSV (หรือ JSONP พร้อม CSV) ---
    if (action === "getCSV" || action === "getData") {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        if (callback) {
          return ContentService.createTextOutput(callback + "(" + JSON.stringify({ success: false, error: "Sheet not found" }) + ");")
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
        }
        return ContentService.createTextOutput("Sheet not found").setMimeType(ContentService.MimeType.TEXT);
      }
      
      const values = sheet.getDataRange().getValues();
      const csvString = values.map(row => {
        return row.map(cell => {
          let str = (cell === null || cell === undefined) ? "" : cell.toString();
          if (str.includes('"') || str.includes(',') || str.includes('\n')) {
            str = '"' + str.replace(/"/g, '""') + '"';
          }
          return str;
        }).join(",");
      }).join("\r\n");
      
      // ถ้าส่ง callback มา ให้ส่งกลับเป็น JSONP เพื่อหลบ CORS จาก file:// 100%
      if (callback) {
        const payload = JSON.stringify({ success: true, csv: csvString, rows: values });
        return ContentService.createTextOutput(callback + "(" + payload + ");")
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      
      return ContentService.createTextOutput(csvString)
        .setMimeType(ContentService.MimeType.CSV);
    }
    
    // --- ดึงข้อมูล Users ---
    if (action === "getUsers") {
      const userSheet = ss.getSheetByName(SHEET_USERS_NAME);
      const rows = userSheet.getDataRange().getValues();
      const users = [];
      if (rows.length > 1) {
        const hasDept = rows[0][4] === "Department";
        for (let i = 1; i < rows.length; i++) {
          users.push({
            username: rows[i][0],
            fullName: rows[i][2],
            role: rows[i][3],
            department: hasDept ? (rows[i][4] || "") : "",
            createdAt: hasDept ? (rows[i][5] || "") : (rows[i][4] || "")
          });
        }
      }
      
      if (callback) {
        return ContentService.createTextOutput(callback + "(" + JSON.stringify({ success: true, data: users }) + ");")
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return jsonResponse({ success: true, data: users });
    }
    
    // รองรับการส่ง action บันทึก/ลบ ผ่าน GET JSONP เผื่อกรณีเบราว์เซอร์บล็อก POST
    if (action === "saveWarrant" || action === "updateWarrant" || action === "deleteWarrant" || action === "login") {
      const result = handleAction(action, e.parameter, ss);
      if (callback) {
        return ContentService.createTextOutput(callback + "(" + JSON.stringify(result) + ");")
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return jsonResponse(result);
    }
    
    return jsonResponse({ success: false, message: "Invalid action" });
  } catch (err) {
    if (e && e.parameter && e.parameter.callback) {
      return ContentService.createTextOutput(e.parameter.callback + "(" + JSON.stringify({ success: false, error: err.toString() }) + ");")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return jsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * รองรับการบันทึก/แก้ไข/ลบข้อมูลผ่าน HTTP POST
 */
function doPost(e) {
  try {
    let body = {};
    if (e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (errJson) {
        body = e.parameter;
      }
    } else {
      body = e.parameter;
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const result = handleAction(body.action, body, ss);
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * ฟังก์ชันประมวลผลการทำงานหลัก (ใช้ร่วมกันทั้ง GET JSONP และ POST)
 */
function handleAction(action, body, ss) {
  // --- 1. เข้าสู่ระบบ (Login) ---
  if (action === "login") {
    const userSheet = ss.getSheetByName(SHEET_USERS_NAME);
    const rows = userSheet.getDataRange().getValues();
    const username = (body.username || "").trim();
    const password = (body.password || "").trim();
    const hasDept = rows.length > 0 && rows[0][4] === "Department";
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == username && rows[i][1] == password) {
        return {
          success: true,
          user: {
            username: rows[i][0],
            fullName: rows[i][2],
            role: rows[i][3],
            department: hasDept ? (rows[i][4] || "") : ""
          }
        };
      }
    }
    return { success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
  }
  
  // --- 2. บันทึกหมายจับใหม่ (Save Warrant) ---
  if (action === "saveWarrant") {
    const dataSheet = ss.getSheetByName(SHEET_DATA_NAME);
    const now = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
    const newId = "W-" + new Date().getTime();
    
    const newRow = [
      newId,
      body.warrant_type || "",
      body.warrant_number || "",
      body.black_number || "",
      body.red_number || "",
      body.department || "",
      body.issue_date || "",
      body.created_by || "",
      now,
      now
    ];
    
    dataSheet.appendRow(newRow);
    return { success: true, message: "บันทึกข้อมูลเรียบร้อยแล้ว", id: newId };
  }
  
  // --- 3. แก้ไขข้อมูลหมายจับ (Update Warrant) ---
  if (action === "updateWarrant") {
    const dataSheet = ss.getSheetByName(SHEET_DATA_NAME);
    const rows = dataSheet.getDataRange().getValues();
    const targetId = body.id;
    const currentUser = body.currentUser;
    const currentRole = body.currentRole;
    
    let foundRowIndex = -1;
    let recordCreatedBy = "";
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == targetId) {
        foundRowIndex = i + 1;
        recordCreatedBy = rows[i][7];
        break;
      }
    }
    
    if (foundRowIndex === -1) {
      return { success: false, message: "ไม่พบข้อมูลที่ต้องการแก้ไข" };
    }
    
    if (currentRole !== "admin" && recordCreatedBy !== currentUser) {
      return { success: false, message: "คุณไม่มีสิทธิ์แก้ไขรายการนี้" };
    }
    
    const now = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
    dataSheet.getRange(foundRowIndex, 2).setValue(body.warrant_type || "");
    dataSheet.getRange(foundRowIndex, 3).setValue(body.warrant_number || "");
    dataSheet.getRange(foundRowIndex, 4).setValue(body.black_number || "");
    dataSheet.getRange(foundRowIndex, 5).setValue(body.red_number || "");
    dataSheet.getRange(foundRowIndex, 6).setValue(body.department || "");
    dataSheet.getRange(foundRowIndex, 7).setValue(body.issue_date || "");
    dataSheet.getRange(foundRowIndex, 10).setValue(now);
    
    return { success: true, message: "แก้ไขข้อมูลสำเร็จ" };
  }
  
  // --- 4. ลบข้อมูลหมายจับ (Delete Warrant) ---
  if (action === "deleteWarrant") {
    const dataSheet = ss.getSheetByName(SHEET_DATA_NAME);
    const rows = dataSheet.getDataRange().getValues();
    const targetId = body.id;
    const currentUser = body.currentUser;
    const currentRole = body.currentRole;
    
    let foundRowIndex = -1;
    let recordCreatedBy = "";
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == targetId) {
        foundRowIndex = i + 1;
        recordCreatedBy = rows[i][7];
        break;
      }
    }
    
    if (foundRowIndex <= 1) {
      return { success: false, message: "ไม่อนุญาตให้แก้ไขหรือลบแถวหัวตาราง (แถวที่ 1)" };
    }
    
    dataSheet.deleteRow(foundRowIndex);
    return { success: true, message: "ลบข้อมูลสำเร็จ" };
  }
  
  // --- 5. จัดการผู้ใช้งาน: เพิ่มผู้ใช้งาน (Add User) - Admin Only ---
  if (action === "saveUser") {
    if (body.currentRole !== "admin") {
      return { success: false, message: "เฉพาะผู้ดูแลระบบเท่านั้นที่มีสิทธิ์เพิ่มผู้ใช้งาน" };
    }
    
    const userSheet = ss.getSheetByName(SHEET_USERS_NAME);
    const rows = userSheet.getDataRange().getValues();
    const newUsername = (body.username || "").trim();
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == newUsername) {
        return { success: false, message: "ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว" };
      }
    }
    
    // ตรวจสอบว่ามีคอลัมน์ Department หรือไม่ หากยังไม่มีให้แทรกคอลัมน์
    if (rows.length > 0 && rows[0][4] !== "Department" && rows[0][3] === "Role") {
      userSheet.insertColumnAfter(4);
      userSheet.getRange(1, 5).setValue("Department")
        .setBackground("#0F172A")
        .setFontColor("#FFFFFF")
        .setFontWeight("bold");
    }
    
    const now = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
    userSheet.appendRow([
      newUsername,
      body.password || "",
      body.fullName || newUsername,
      body.role || "user",
      body.department || "",
      now
    ]);
    
    return { success: true, message: "เพิ่มผู้ใช้งานสำเร็จ" };
  }
  
  // --- 6. จัดการผู้ใช้งาน: แก้ไขผู้ใช้งาน (Update User) - Admin Only ---
  if (action === "updateUser") {
    if (body.currentRole !== "admin") {
      return { success: false, message: "เฉพาะผู้ดูแลระบบเท่านั้นที่มีสิทธิ์แก้ไขผู้ใช้งาน" };
    }
    
    const userSheet = ss.getSheetByName(SHEET_USERS_NAME);
    const rows = userSheet.getDataRange().getValues();
    const targetUsername = body.targetUsername;
    
    let foundRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == targetUsername) {
        foundRowIndex = i + 1;
        break;
      }
    }
    
    if (foundRowIndex === -1) {
      return { success: false, message: "ไม่พบชื่อผู้ใช้งาน" };
    }
    
    // ตรวจสอบว่ามีคอลัมน์ Department หรือไม่
    if (rows.length > 0 && rows[0][4] !== "Department" && rows[0][3] === "Role") {
      userSheet.insertColumnAfter(4);
      userSheet.getRange(1, 5).setValue("Department")
        .setBackground("#0F172A")
        .setFontColor("#FFFFFF")
        .setFontWeight("bold");
    }
    
    if (body.password) {
      userSheet.getRange(foundRowIndex, 2).setValue(body.password);
    }
    if (body.fullName) {
      userSheet.getRange(foundRowIndex, 3).setValue(body.fullName);
    }
    if (body.role && targetUsername !== "admin") {
      userSheet.getRange(foundRowIndex, 4).setValue(body.role);
    }
    if (body.department !== undefined) {
      userSheet.getRange(foundRowIndex, 5).setValue(body.department || "");
    }
    
    return { success: true, message: "แก้ไขผู้ใช้งานสำเร็จ" };
  }
  
  // --- 7. จัดการผู้ใช้งาน: ลบผู้ใช้งาน (Delete User) - Admin Only ---
  if (action === "deleteUser") {
    if (body.currentRole !== "admin") {
      return { success: false, message: "เฉพาะผู้ดูแลระบบเท่านั้นที่มีสิทธิ์ลบผู้ใช้งาน" };
    }
    
    const targetUsername = body.targetUsername;
    
    if (targetUsername === "admin") {
      return { success: false, message: "ไม่สามารถลบผู้ใช้งานระบบที่เป็น 'admin' ได้" };
    }
    
    const userSheet = ss.getSheetByName(SHEET_USERS_NAME);
    const rows = userSheet.getDataRange().getValues();
    let foundRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == targetUsername) {
        foundRowIndex = i + 1;
        break;
      }
    }
    
    if (foundRowIndex === -1) {
      return { success: false, message: "ไม่พบผู้ใช้งานที่ต้องการลบ" };
    }
    
    userSheet.deleteRow(foundRowIndex);
    return { success: true, message: "ลบผู้ใช้งานสำเร็จ" };
  }
  
  return { success: false, message: "Invalid action" };
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
