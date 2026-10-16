/**
 * ระบบทะเบียนคุมออกหมายจับ 47 และ 47 ทวิ
 * Core Application Logic (app.js)
 */

// --- 1. STATE & CONFIGURATION ---
const CONFIG = {
  SHEET_ID: "1uhvnk1kRMmZRs1ZyKGjDK75s1ZJSekBJWu-IMt_ZdcA",
  DEFAULT_GAS_URL: localStorage.getItem("gas_webapp_url") || "https://script.google.com/macros/s/AKfycby76Jyb1FbNFE29l0a3Rz0QhuoVOaNzJ6jbj0z99ftzfpq6qYnSdfpIqsQpoE_YVLl1nA/exec",
  CURRENT_YEAR_BE: new Date().getFullYear() + 543
};

// Initial default user list if not synced
const DEFAULT_USERS = [
  { username: "admin", password: "caogikojt02", fullName: "ผู้ดูแลระบบ (Admin)", role: "admin", department: "", createdAt: "2026-10-16 12:00:00" },
  { username: "user_officer", password: "user1234", fullName: "ส.ต.ต.มงคลรัตน์ เพ็ญรัตน์", role: "user", department: "ส่วนช่วยพิจารณาคดี", createdAt: "2026-10-16 12:00:00" }
];

// App State
let state = {
  currentUser: null,
  warrants: [],
  users: [],
  dataTables: {
    table47: null,
    table47Bis: null,
    tableAll: null,
    tableUsers: null
  },
  // ข้อ 3: แสดงผลค่าพื้นฐาน แค่ อ, ย, ฝ, ยฝ และไม่ต้องมีจุดต่อท้าย
  prefixHistory: {
    black: ["อ", "ย", "ฝ", "ยฝ"],
    red: ["อ", "ย", "ฝ", "ยฝ"]
  },
  flatpickrInstance: null,
  editFlatpickrInstance: null
};

// --- 2. INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  initStorage();
  populateYearSelects();
  initThaiDatePickers();
  initAutocomplete();
  checkAuthSession();
  setupEventListeners();
});

function initStorage() {
  // Load users from storage or default
  const storedUsers = localStorage.getItem("warrant_users");
  if (!storedUsers) {
    localStorage.setItem("warrant_users", JSON.stringify(DEFAULT_USERS));
    state.users = [...DEFAULT_USERS];
  } else {
    try {
      state.users = JSON.parse(storedUsers);
    } catch(e) {
      state.users = [...DEFAULT_USERS];
    }
  }

  // Load warrants from storage
  const storedWarrants = localStorage.getItem("warrant_data");
  if (!storedWarrants) {
    state.warrants = [];
  } else {
    try {
      const parsed = JSON.parse(storedWarrants);
      state.warrants = (Array.isArray(parsed) ? parsed : []).filter(w => {
        if (!w) return false;
        const wNum = String(w.warrant_number || "").trim();
        const id = String(w.id || "").trim();
        const bNum = String(w.black_number || "").trim();
        if (id === "ID" || wNum === "เลขหมายจับ" || (!wNum && !bNum)) return false;
        return true;
      });
      localStorage.setItem("warrant_data", JSON.stringify(state.warrants));
    } catch (e) {
      state.warrants = [];
    }
  }

  // ข้อ 3: โหลดหรือเซ็ตค่าตัวย่อพื้นฐาน (อ, ย, ฝ, ยฝ)
  state.prefixHistory.black = ["อ", "ย", "ฝ", "ยฝ"];
  state.prefixHistory.red = ["อ", "ย", "ฝ", "ยฝ"];
  const storedPrefixBlack = localStorage.getItem("prefix_history_black");
  if (storedPrefixBlack) {
    try {
      const parsed = JSON.parse(storedPrefixBlack);
      parsed.forEach(item => {
        if (!state.prefixHistory.black.includes(item)) state.prefixHistory.black.push(item);
      });
    } catch(e) {}
  }
  const storedPrefixRed = localStorage.getItem("prefix_history_red");
  if (storedPrefixRed) {
    try {
      const parsed = JSON.parse(storedPrefixRed);
      parsed.forEach(item => {
        if (!state.prefixHistory.red.includes(item)) state.prefixHistory.red.push(item);
      });
    } catch(e) {}
  }
}

// Populate Year Select Option: Current Year BE first, backward 20 years
function populateYearSelects() {
  const currentBE = CONFIG.CURRENT_YEAR_BE;
  const yearSelectIds = [
    "warrant_year", "black_year", "red_year",
    "edit_warrant_year", "edit_black_year", "edit_red_year"
  ];

  yearSelectIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = "";
    for (let i = 0; i <= 20; i++) {
      const year = currentBE - i;
      const opt = document.createElement("option");
      opt.value = year;
      opt.textContent = year;
      if (i === 0) opt.selected = true; // Current year BE first
      el.appendChild(opt);
    }
  });
}

// Thai Datepicker with Buddhist Era
function initThaiDatePickers() {
  const thaiMonths = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];

  const config = {
    locale: {
      firstDayOfWeek: 1,
      weekdays: {
        shorthand: ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"],
        longhand: ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"]
      },
      months: {
        shorthand: thaiMonths,
        longhand: [
          "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
          "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
        ]
      }
    },
    dateFormat: "d M Y",
    defaultDate: new Date(),
    formatDate: (date) => {
      const day = String(date.getDate()).padStart(2, "0");
      const month = thaiMonths[date.getMonth()];
      const yearBE = date.getFullYear() + 543;
      return `${day} ${month} ${yearBE}`;
    }
  };

  if (document.getElementById("issue_date")) {
    state.flatpickrInstance = flatpickr("#issue_date", config);
  }
  if (document.getElementById("edit_issue_date")) {
    state.editFlatpickrInstance = flatpickr("#edit_issue_date", config);
  }
}

// --- 3. AUTOCOMPLETE HISTORY (ข้อ 2 & 3) ---
function initAutocomplete() {
  setupAutocompleteField("black_prefix", "black_prefix_suggestions", "black");
  setupAutocompleteField("red_prefix", "red_prefix_suggestions", "red");
  setupAutocompleteField("edit_black_prefix", "edit_black_prefix_suggestions", "black");
  setupAutocompleteField("edit_red_prefix", "edit_red_prefix_suggestions", "red");
}

function setupAutocompleteField(inputId, dropdownId, type) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  function renderList(filter = "") {
    const list = state.prefixHistory[type] || [];
    const filtered = list.filter(item => item.toLowerCase().includes(filter.toLowerCase()));
    dropdown.innerHTML = "";

    if (filtered.length === 0) {
      dropdown.classList.add("hidden");
      return;
    }

    filtered.forEach(item => {
      const div = document.createElement("div");
      div.className = "autocomplete-item";
      div.innerHTML = `<span>${item}</span><span class="text-xs text-slate-400">ประวัติ</span>`;
      div.onmousedown = (e) => {
        e.preventDefault();
        input.value = item;
        dropdown.classList.add("hidden");
        updatePreview();
      };
      dropdown.appendChild(div);
    });
    dropdown.classList.remove("hidden");
  }

  input.addEventListener("focus", () => renderList(input.value));
  input.addEventListener("click", () => renderList(input.value));
  input.addEventListener("input", (e) => {
    renderList(e.target.value);
    updatePreview();
  });

  input.addEventListener("blur", () => {
    setTimeout(() => dropdown.classList.add("hidden"), 200);
  });
}

function savePrefixHistory(prefix, type) {
  if (!prefix || !prefix.trim()) return;
  const clean = prefix.trim();
  if (!state.prefixHistory[type].includes(clean)) {
    state.prefixHistory[type].unshift(clean);
    if (state.prefixHistory[type].length > 15) state.prefixHistory[type].pop();
    localStorage.setItem(`prefix_history_${type}`, JSON.stringify(state.prefixHistory[type]));
  }
}

// Live preview of warrant in the form
function updatePreview() {
  const num = document.getElementById("warrant_number")?.value || "";
  const year = document.getElementById("warrant_year")?.value || "";
  const bPre = document.getElementById("black_prefix")?.value || "";
  const bNum = document.getElementById("black_number")?.value || "";
  const bYear = document.getElementById("black_year")?.value || "";
  const rPre = document.getElementById("red_prefix")?.value || "";
  const rNum = document.getElementById("red_number")?.value || "";
  const rYear = document.getElementById("red_year")?.value || "";
  const dept = document.getElementById("department")?.value || "-";
  const date = document.getElementById("issue_date")?.value || "-";

  const prevWarrant = document.getElementById("preview_warrant");
  const prevBlack = document.getElementById("preview_black");
  const prevRed = document.getElementById("preview_red");
  const prevDept = document.getElementById("preview_dept");
  const prevDate = document.getElementById("preview_date");

  if (prevWarrant) prevWarrant.textContent = num ? `${num}/${year}` : "-";
  if (prevBlack) prevBlack.textContent = bNum ? `${bPre}${bNum}/${bYear}` : "-";
  if (prevRed) prevRed.textContent = rNum ? `${rPre}${rNum}/${rYear}` : "-";
  if (prevDept) prevDept.textContent = dept;
  if (prevDate) prevDate.textContent = date;
}

// --- 4. AUTHENTICATION & SESSIONS (ข้อ 6, 7, 9, 11) ---
function checkAuthSession() {
  const session = sessionStorage.getItem("logged_in_user");
  if (session) {
    state.currentUser = JSON.parse(session);
    showAppLayout();
  } else {
    showLoginLayout();
  }
}

function showLoginLayout() {
  document.getElementById("login_modal").classList.remove("hidden");
  document.getElementById("app_container").classList.add("hidden");
}

function showAppLayout() {
  document.getElementById("login_modal").classList.add("hidden");
  document.getElementById("app_container").classList.remove("hidden");

  // Display user info in navbar & sidebar (ข้อ 1: กะทัดรัด เรียบง่าย ไม่ใหญ่เกินไป)
  document.getElementById("nav_user_fullname").textContent = state.currentUser.fullName || state.currentUser.username;
  document.getElementById("nav_user_username").textContent = `@${state.currentUser.username}`;
  
  const roleBadge = document.getElementById("nav_user_role");
  const adminSection = document.getElementById("menu_admin_section");

  if (state.currentUser.role === "admin") {
    roleBadge.textContent = "Admin";
    roleBadge.className = "text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500 text-white shrink-0";
    if (adminSection) adminSection.classList.remove("hidden");
  } else {
    roleBadge.textContent = "User";
    roleBadge.className = "text-[10px] px-1.5 py-0.5 rounded font-bold bg-blue-600 text-white shrink-0";
    if (adminSection) adminSection.classList.add("hidden");
  }

  // Load and refresh data
  loadDataViaCSV();
  navigateTo("dashboard");
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("login_username").value.trim();
  const password = document.getElementById("login_password").value.trim();

  if (!username || !password) {
    Swal.fire({
      icon: "warning",
      title: "กรุณากรอกข้อมูล",
      text: "โปรดระบุชื่อผู้ใช้งานและรหัสผ่าน",
      confirmButtonColor: "#1E3A8A"
    });
    return;
  }

  // First try local credentials
  const foundUser = state.users.find(u => u.username === username && u.password === password);
  if (foundUser) {
    state.currentUser = foundUser;
    sessionStorage.setItem("logged_in_user", JSON.stringify(foundUser));
    Swal.fire({
      icon: "success",
      title: "เข้าสู่ระบบสำเร็จ",
      text: `ยินดีต้อนรับคุณ ${foundUser.fullName || foundUser.username}`,
      timer: 1500,
      showConfirmButton: false
    });
    showAppLayout();
    return;
  }

  // If not found in local, check if GAS URL is configured and test remote
  const gasUrl = localStorage.getItem("gas_webapp_url") || CONFIG.DEFAULT_GAS_URL;
  if (gasUrl) {
    showLoadingSweetAlert("กำลังตรวจสอบข้อมูลเข้าสู่ระบบ...");
    try {
      const result = await sendToGas("login", { username, password });
      Swal.close();
      if (result && result.success) {
        state.currentUser = result.user;
        sessionStorage.setItem("logged_in_user", JSON.stringify(result.user));
        Swal.fire({
          icon: "success",
          title: "เข้าสู่ระบบสำเร็จ",
          text: `ยินดีต้อนรับคุณ ${result.user.fullName || result.user.username}`,
          timer: 1500,
          showConfirmButton: false
        });
        showAppLayout();
        return;
      }
    } catch (err) {
      console.warn("GAS Login check error:", err);
    }
  }

  Swal.fire({
    icon: "error",
    title: "เข้าสู่ระบบไม่สำเร็จ",
    text: "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง (เริ่มต้นใช้ admin / caogikojt02)",
    confirmButtonColor: "#1E3A8A"
  });
}

function handleLogout() {
  Swal.fire({
    title: "ยืนยันการออกจากระบบ",
    text: "คุณต้องการออกจากระบบใช่หรือไม่?",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#1E3A8A",
    cancelButtonColor: "#64748B",
    confirmButtonText: "ออกจากระบบ",
    cancelButtonText: "ยกเลิก"
  }).then((res) => {
    if (res.isConfirmed) {
      sessionStorage.removeItem("logged_in_user");
      state.currentUser = null;
      showLoginLayout();
    }
  });
}

// --- JSONP HELPERS (ปลอด CORS 100% แม้เปิดจาก file://) ---
function fetchGoogleSheetGvizJSONP(sheetId, sheetName, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const callbackName = "gviz_cb_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    const script = document.createElement("script");
    let timer = null;

    window[callbackName] = function(response) {
      cleanup();
      try {
        if (!response || !response.table) {
          reject(new Error("Invalid GViz response structure"));
          return;
        }
        const table = response.table;
        let headers = [];
        let dataRows = table.rows || [];

        // ตรวจสอบว่า table.cols มีชื่อหัวตารางจริงหรือไม่
        const hasMeaningfulColLabels = table.cols.some(c => c.label && c.label.trim() !== "" && !c.label.match(/^[A-Z]$/));

        if (hasMeaningfulColLabels) {
          headers = table.cols.map(c => `"${(c.label || c.id || "").trim().replace(/"/g, '""')}"`);
          // หากแถวแรกของ dataRows ซ้ำกับหัวตาราง (เช่น cell 0 เป็น "ID" หรือ cell 1 เป็น "ประเภทหมายจับ") ให้ข้ามแถวแรก
          if (dataRows.length > 0) {
            const firstCell = String((dataRows[0].c && dataRows[0].c[0] && dataRows[0].c[0].v) || "").trim();
            const secondCell = String((dataRows[0].c && dataRows[0].c[1] && dataRows[0].c[1].v) || "").trim();
            if (firstCell === "ID" || secondCell === "ประเภทหมายจับ") {
              dataRows = dataRows.slice(1);
            }
          }
        } else if (dataRows.length > 0) {
          // ถ้า table.cols ไม่มีชื่อคอลัมน์ ให้ใช้แถวแรกของ dataRows เป็นหัวตาราง และตัดแถวแรกออกจากข้อมูล
          const firstRow = dataRows[0];
          headers = firstRow.c.map(cell => {
            let val = (cell && cell.v !== null && cell.v !== undefined) ? cell.v : "";
            if (cell && cell.f) val = cell.f;
            return `"${String(val).trim().replace(/"/g, '""')}"`;
          });
          dataRows = dataRows.slice(1); // ข้ามแถวที่ 1 ซึ่งเป็นหัวตาราง
        } else {
          headers = table.cols.map(c => `"${(c.label || c.id || "").trim().replace(/"/g, '""')}"`);
        }
        
        const rowLines = dataRows.map(r => {
          if (!r || !r.c) return "";
          return r.c.map(cell => {
            let val = (cell && cell.v !== null && cell.v !== undefined) ? cell.v : "";
            if (cell && cell.f) val = cell.f;
            let str = String(val);
            if (str.includes('"') || str.includes(',') || str.includes('\n')) {
              str = `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          }).join(",");
        }).filter(line => line.trim() !== "");

        const csvString = [headers.join(",")].concat(rowLines).join("\r\n");
        resolve(csvString);
      } catch (err) {
        reject(err);
      }
    };

    function cleanup() {
      if (timer) clearTimeout(timer);
      if (script.parentNode) script.parentNode.removeChild(script);
      delete window[callbackName];
    }

    timer = setTimeout(() => {
      cleanup();
      reject(new Error("GViz JSONP timeout"));
    }, timeoutMs);

    script.onerror = function() {
      cleanup();
      reject(new Error("GViz script load error"));
    };

    script.src = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=responseHandler:${callbackName}&sheet=${encodeURIComponent(sheetName)}`;
    document.body.appendChild(script);
  });
}

function fetchGasJSONP(gasUrl, params = {}, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const callbackName = "gas_cb_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    const script = document.createElement("script");
    let timer = null;

    window[callbackName] = function(response) {
      cleanup();
      resolve(response);
    };

    function cleanup() {
      if (timer) clearTimeout(timer);
      if (script.parentNode) script.parentNode.removeChild(script);
      delete window[callbackName];
    }

    timer = setTimeout(() => {
      cleanup();
      reject(new Error("GAS JSONP timeout"));
    }, timeoutMs);

    script.onerror = function() {
      cleanup();
      reject(new Error("GAS script load error"));
    };

    const query = new URLSearchParams({ ...params, callback: callbackName }).toString();
    const separator = gasUrl.includes("?") ? "&" : "?";
    script.src = `${gasUrl}${separator}${query}`;
    document.body.appendChild(script);
  });
}

// ฟังก์ชันส่งข้อมูลไปยัง Google Apps Script รองรับทั้ง POST และ GET JSONP เมื่อรันจาก file://
async function sendToGas(action, data = {}) {
  const gasUrl = localStorage.getItem("gas_webapp_url") || CONFIG.DEFAULT_GAS_URL;
  if (!gasUrl) return null;

  try {
    const response = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...data })
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (errPost) {
    console.warn("GAS POST fetch blocked (likely file:// origin null), fallback to JSONP:", errPost);
    try {
      return await fetchGasJSONP(gasUrl, { action, ...data });
    } catch (errJsonp) {
      console.warn("GAS JSONP fallback warning:", errJsonp);
    }
  }
  return null;
}

// --- 5. DATA LOADING VIA CSV (ข้อ 8 & ข้อ 10) ---
/**
 * ดึงข้อมูลผ่าน CSV แทนการดึงทั่วไป ตามข้อ 8
 * และใช้ SweetAlert แสดงผลการโหลดข้อมูล
 */
async function loadDataViaCSV(forceShowProgress = false) {
  let isProgressShown = forceShowProgress;
  
  if (isProgressShown) {
    showGradientProgressBarSweetAlert("กำลังดึงข้อมูลหมายจับผ่าน CSV จาก Google Sheet...");
  } else {
    showLoadingSweetAlert("กำลังโหลดข้อมูลหมายจับผ่าน CSV...");
  }

  const directCsvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=DATA`;
  const gasUrl = localStorage.getItem("gas_webapp_url") || CONFIG.DEFAULT_GAS_URL;

  let fetchedData = null;
  let csvText = "";

  try {
    if (isProgressShown) updateProgressBar(20);

    // 1. วิธีที่ 1 (ปลอด CORS 100%): ดึง Google Sheet GViz ผ่าน JSONP แล้วแปลงเป็น CSV
    try {
      csvText = await fetchGoogleSheetGvizJSONP(CONFIG.SHEET_ID, "DATA");
    } catch (errGviz) {
      console.warn("Gviz JSONP warning, trying Apps Script:", errGviz);
    }

    if (isProgressShown) updateProgressBar(50);

    // 2. วิธีที่ 2: ถ้ามี Apps Script URL ให้ลองดึง CSV ผ่าน Apps Script JSONP
    if (!csvText && gasUrl && gasUrl.trim().startsWith("http")) {
      try {
        const gasResult = await fetchGasJSONP(gasUrl, { action: "getCSV", sheet: "DATA" });
        if (gasResult && gasResult.csv) {
          csvText = gasResult.csv;
        }
      } catch (errGas) {
        console.warn("GAS JSONP warning, trying Proxy/Direct:", errGas);
      }
    }

    if (isProgressShown) updateProgressBar(70);

    // 3. วิธีที่ 3: ถ้าเปิดบน Local Web Server (http://) ให้ดึงผ่าน Fetch โดยตรง
    if (!csvText && window.location.protocol !== "file:") {
      try {
        const resDirect = await fetch(directCsvUrl);
        if (resDirect.ok) {
          csvText = await resDirect.text();
        }
      } catch (errDirect) {
        console.warn("Direct CSV fetch warning:", errDirect);
      }
    }

    if (isProgressShown) updateProgressBar(85);

    // แปลง CSV เป็น Object ด้วย PapaParse (ตรงตามข้อ 8)
    if (csvText && csvText.trim().length > 0 && !csvText.includes("<!DOCTYPE html>")) {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          if (results.data && results.data.length > 0) {
            fetchedData = results.data
              .map(row => {
                const id = String(row["ID"] || row["id"] || "").trim();
                const type = String(row["ประเภทหมายจับ"] || row["warrant_type"] || "").trim();
                const wNum = String(row["เลขหมายจับ"] || row["warrant_number"] || "").trim();
                const bNum = String(row["เลขคดีดำ"] || row["black_number"] || "").trim();
                const rNum = String(row["เลขคดีแดง"] || row["red_number"] || "").trim();
                const dept = String(row["ส่วนที่ออกหมายจับ"] || row["department"] || "").trim();
                const date = String(row["วันที่ออกหมายจับ"] || row["issue_date"] || "").trim();
                const user = String(row["ผู้บันทึกข้อมูล"] || row["created_by"] || "").trim();
                const createdAt = String(row["วันที่บันทึก"] || row["created_at"] || "").trim();
                const updatedAt = String(row["วันที่แก้ไขล่าสุด"] || row["updated_at"] || "").trim();

                // ข้ามถ้าเป็นแถวหัวตาราง (Row 1)
                if (id === "ID" || wNum === "เลขหมายจับ" || bNum === "เลขคดีดำ" || type === "ประเภทหมายจับ") {
                  return null;
                }

                // ข้ามถ้าเป็นแถวว่างเปล่า (ไม่มีเลขหมายจับ และไม่มีเลขคดี)
                if (!wNum && !bNum && !rNum) {
                  return null;
                }

                return {
                  id: id || `W-${Date.now()}`,
                  warrant_type: type.includes("ทวิ") ? "47 ทวิ" : "47",
                  warrant_number: wNum,
                  black_number: bNum,
                  red_number: rNum,
                  department: dept,
                  issue_date: date,
                  created_by: user || "admin",
                  created_at: createdAt || new Date().toLocaleString("th-TH"),
                  updated_at: updatedAt || new Date().toLocaleString("th-TH")
                };
              })
              .filter(item => item !== null);
          }
        }
      });
    }

    // ถ้าดึงข้อมูลจาก Sheet ได้สำเร็จ ให้อัปเดตและเก็บลงแคช
    if (fetchedData && fetchedData.length > 0) {
      state.warrants = fetchedData;
      localStorage.setItem("warrant_data", JSON.stringify(state.warrants));
    } else {
      // หากยังดึงไม่ได้ ให้ใช้ข้อมูลที่มีอยู่ในแคช หรือ Mock seed
      const local = localStorage.getItem("warrant_data");
      if (local) state.warrants = JSON.parse(local);
    }

    if (isProgressShown) {
      updateProgressBar(100);
      await new Promise(r => setTimeout(r, 400));
    }

    Swal.close();
    renderAllDashboardTables();
    renderAllWarrantsTable();
    updateDashboardStats();

  } catch (err) {
    console.error("Error loading CSV:", err);
    Swal.close();
    Swal.fire({
      icon: "info",
      title: "โหลดข้อมูลจากระบบแคชภายใน",
      text: "กำลังใช้ข้อมูลจากแคชภายในเครื่อง (เชื่อมต่อ Google Sheet เมื่อพร้อมใช้งาน)",
      confirmButtonColor: "#1E3A8A"
    });
    renderAllDashboardTables();
    renderAllWarrantsTable();
    updateDashboardStats();
  }
}

// SweetAlert with white-to-green gradient progress bar and % label (ข้อ 10)
function showGradientProgressBarSweetAlert(titleText) {
  Swal.fire({
    title: `<span class="text-slate-800 font-bold">${titleText}</span>`,
    html: `
      <p class="text-sm text-slate-500 mb-3">ระบบกำลังประมวลผลและดึงข้อมูลรายการหมายจับ กรุณารอสักครู่</p>
      <div class="custom-swal-progress-container">
        <div id="swal_gradient_progress" class="custom-swal-progress-bar" style="width: 5%;">
          <span id="swal_progress_percent" class="custom-swal-progress-text">5%</span>
        </div>
      </div>
    `,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false
  });
}

function updateProgressBar(percent) {
  const bar = document.getElementById("swal_gradient_progress");
  const label = document.getElementById("swal_progress_percent");
  if (bar && label) {
    bar.style.width = `${percent}%`;
    label.textContent = `${percent}%`;
  }
}

function showLoadingSweetAlert(message) {
  Swal.fire({
    title: message,
    html: '<div class="py-3"><i class="fa-solid fa-spinner fa-spin text-4xl text-blue-800"></i></div>',
    allowOutsideClick: false,
    showConfirmButton: false
  });
}

// --- 6. DATATABLES & DISPLAY RENDERING (ข้อ 10) ---
function renderAllDashboardTables() {
  renderTable47(5);
  renderTable47Bis(5);
}

// ตารางหมายจับ 47
function renderTable47(limit = 5) {
  const container = document.getElementById("table_47_body");
  if (!container) return;

  // Filter 47 warrants sorted newest first
  let list = state.warrants.filter(w => w.warrant_type === "47" || w.warrant_type === "หมายจับ 47");
  list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const displayList = limit ? list.slice(0, limit) : list;

  container.innerHTML = "";
  if (displayList.length === 0) {
    container.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-400">ยังไม่มีข้อมูลหมายจับ 47</td></tr>`;
    return;
  }

  displayList.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition border-b border-slate-100 text-sm";
    tr.innerHTML = `
      <td class="px-4 py-3 text-center text-slate-500">${index + 1}</td>
      <td class="px-4 py-3 font-bold text-blue-900">${escapeHtml(item.warrant_number)}</td>
      <td class="px-4 py-3"><span class="text-case-black font-semibold">${escapeHtml(item.black_number)}</span></td>
      <td class="px-4 py-3"><span class="text-case-red font-semibold">${escapeHtml(item.red_number)}</span></td>
      <td class="px-4 py-3 text-slate-700">${escapeHtml(item.department)}</td>
      <td class="px-4 py-3 text-slate-600">${escapeHtml(item.issue_date)}</td>
      <td class="px-4 py-3 text-center">
        ${renderActionButtons(item)}
      </td>
    `;
    container.appendChild(tr);
  });
}

// ตารางหมายจับ 47 ทวิ
function renderTable47Bis(limit = 5) {
  const container = document.getElementById("table_47_bis_body");
  if (!container) return;

  let list = state.warrants.filter(w => w.warrant_type === "47 ทวิ" || w.warrant_type === "หมายจับ 47 ทวิ");
  list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const displayList = limit ? list.slice(0, limit) : list;

  container.innerHTML = "";
  if (displayList.length === 0) {
    container.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-400">ยังไม่มีข้อมูลหมายจับ 47 ทวิ</td></tr>`;
    return;
  }

  displayList.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition border-b border-slate-100 text-sm";
    tr.innerHTML = `
      <td class="px-4 py-3 text-center text-slate-500">${index + 1}</td>
      <td class="px-4 py-3 font-bold text-indigo-900">${escapeHtml(item.warrant_number)}</td>
      <td class="px-4 py-3"><span class="text-case-black font-semibold">${escapeHtml(item.black_number)}</span></td>
      <td class="px-4 py-3"><span class="text-case-red font-semibold">${escapeHtml(item.red_number)}</span></td>
      <td class="px-4 py-3 text-slate-700">${escapeHtml(item.department)}</td>
      <td class="px-4 py-3 text-slate-600">${escapeHtml(item.issue_date)}</td>
      <td class="px-4 py-3 text-center">
        ${renderActionButtons(item)}
      </td>
    `;
    container.appendChild(tr);
  });
}

// Render Action buttons with permission check (ข้อ 12: user แก้ไขได้เฉพาะของตนเอง admin แก้ไขได้ทั้งหมด)
function renderActionButtons(item) {
  const canEdit = state.currentUser && (state.currentUser.role === "admin" || state.currentUser.username === item.created_by);

  if (canEdit) {
    return `
      <div class="flex items-center justify-center space-x-1.5">
        <button onclick="openEditModal('${item.id}')" class="px-2.5 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded font-medium shadow-sm flex items-center gap-1 transition">
          <i class="fa-solid fa-pen-to-square"></i> แก้ไข
        </button>
        <button onclick="deleteWarrantRecord('${item.id}')" class="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded font-medium shadow-sm flex items-center gap-1 transition">
          <i class="fa-solid fa-trash"></i> ลบ
        </button>
      </div>
    `;
  } else {
    return `
      <span class="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded cursor-not-allowed" title="บันทึกโดย: ${item.created_by}">
        <i class="fa-solid fa-lock"></i> ล็อคสิทธิ์
      </span>
    `;
  }
}

// ตารางรายการหมายจับทั้งหมดในหน้า "รายการหมายจับทั้งหมด"
function renderAllWarrantsTable() {
  const table = $('#table_all_warrants');
  if (!table.length) return;

  if ($.fn.DataTable.isDataTable('#table_all_warrants')) {
    $('#table_all_warrants').DataTable().destroy();
  }

  const tbody = document.getElementById("table_all_warrants_body");
  if (!tbody) return;
  tbody.innerHTML = "";

  const list = [...state.warrants];
  list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  list.forEach((item, index) => {
    const is47 = item.warrant_type === "47" || item.warrant_type === "หมายจับ 47";
    const typeBadge = is47 
      ? `<span class="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">หมายจับ 47</span>`
      : `<span class="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-0.5 rounded-full">หมายจับ 47 ทวิ</span>`;

    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition";
    tr.innerHTML = `
      <td class="text-center font-medium text-slate-500">${index + 1}</td>
      <td class="text-center">${typeBadge}</td>
      <td class="font-bold text-slate-900">${escapeHtml(item.warrant_number)}</td>
      <td><span class="text-case-black">${escapeHtml(item.black_number)}</span></td>
      <td><span class="text-case-red">${escapeHtml(item.red_number)}</span></td>
      <td class="text-slate-700">${escapeHtml(item.department)}</td>
      <td class="text-slate-600">${escapeHtml(item.issue_date)}</td>
      <td class="text-slate-500 text-xs"><i class="fa-regular fa-user mr-1"></i>${escapeHtml(item.created_by || "-")}</td>
      <td class="text-center">${renderActionButtons(item)}</td>
    `;
    tbody.appendChild(tr);
  });

  state.dataTables.tableAll = $('#table_all_warrants').DataTable({
    pageLength: 10,
    responsive: true,
    language: {
      search: "ค้นหา:",
      lengthMenu: "แสดง _MENU_ รายการต่อหน้า",
      info: "แสดง _START_ ถึง _END_ จากทั้งหมด _TOTAL_ รายการ",
      infoEmpty: "ไม่มีข้อมูลแสดง",
      infoFiltered: "(กรองจากทั้งหมด _MAX_ รายการ)",
      zeroRecords: "ไม่พบข้อมูลที่ตรงกับการค้นหา",
      paginate: {
        first: "หน้าแรก",
        previous: "ก่อนหน้า",
        next: "ถัดไป",
        last: "หน้าสุดท้าย"
      }
    }
  });
}

function updateDashboardStats() {
  const total = state.warrants.length;
  const count47 = state.warrants.filter(w => w.warrant_type === "47" || w.warrant_type === "หมายจับ 47").length;
  const count47Bis = state.warrants.filter(w => w.warrant_type === "47 ทวิ" || w.warrant_type === "หมายจับ 47 ทวิ").length;

  document.getElementById("stat_total") && (document.getElementById("stat_total").textContent = total);
  document.getElementById("stat_47") && (document.getElementById("stat_47").textContent = count47);
  document.getElementById("stat_47_bis") && (document.getElementById("stat_47_bis").textContent = count47Bis);
}

// ปุ่มเปิดดูรายการทั้งหมดใต้ตาราง พร้อม Progress Bar (ข้อ 10)
async function viewAllWarrantsWithProgress(filterType = null) {
  // ข้อ 10: หากมีมากเกินไปให้แสดง SweetAlert โหลดข้อมูลพร้อมบอกความคืบหน้า Progressbar ไล่ระดับสีจากขาวไปเขียว พร้อมบอกจำนวนตัวเลข %
  showGradientProgressBarSweetAlert("กำลังโหลดรายการหมายจับทั้งหมด...");

  for (let p = 10; p <= 100; p += 15) {
    updateProgressBar(Math.min(p, 100));
    await new Promise(r => setTimeout(r, 70));
  }
  await new Promise(r => setTimeout(r, 200));
  Swal.close();

  // นำทางไปหน้ารายการหมายจับทั้งหมด
  navigateTo("all_warrants");
  if (filterType && state.dataTables.tableAll) {
    state.dataTables.tableAll.search(filterType).draw();
  }
}

// --- 7. WARRANT FORM SUBMISSION & CRUD (ข้อ 1-5, ข้อ 12) ---
async function handleWarrantSubmit(e) {
  e.preventDefault();

  const type = document.querySelector('input[name="warrant_type"]:checked')?.value || "47";
  
  // 1. เลขหมายจับ: inputfield + select option ปี พ.ศ. (ข้อ 6: ห้ามพิมพ์เลข 0 นำหน้า และไม่มีการเก็บเลข 0 นำหน้า)
  let wNum = document.getElementById("warrant_number").value.trim().replace(/^0+/, '');
  const wYear = document.getElementById("warrant_year").value;
  if (!wNum) {
    Swal.fire({ icon: "warning", title: "กรุณากรอกเลขหมายจับ (ต้องไม่เป็น 0)", confirmButtonColor: "#1E3A8A" });
    return;
  }
  const fullWarrantNumber = `${wNum}/${wYear}`;

  // 2. เลขคดีดำ: inputfield ตัวอักษร + inputfield ตัวเลข + select option ปี พ.ศ.
  const bPre = document.getElementById("black_prefix").value.trim();
  const bNum = document.getElementById("black_number").value.trim();
  const bYear = document.getElementById("black_year").value;
  if (!bNum) {
    Swal.fire({ icon: "warning", title: "กรุณากรอกเลขคดีดำ", confirmButtonColor: "#1E3A8A" });
    return;
  }
  const fullBlackNumber = `${bPre}${bNum}/${bYear}`;

  // 3. เลขคดีแดง: inputfield ตัวอักษร + inputfield ตัวเลข + select option ปี พ.ศ.
  const rPre = document.getElementById("red_prefix").value.trim();
  const rNum = document.getElementById("red_number").value.trim();
  const rYear = document.getElementById("red_year").value;
  if (!rNum) {
    Swal.fire({ icon: "warning", title: "กรุณากรอกเลขคดีแดง", confirmButtonColor: "#1E3A8A" });
    return;
  }
  const fullRedNumber = `${rPre}${rNum}/${rYear}`;

  // 4. ส่วนที่ออกหมายจับ (9 ส่วนงาน)
  const dept = document.getElementById("department").value;
  if (!dept) {
    Swal.fire({ icon: "warning", title: "กรุณาเลือกส่วนที่ออกหมายจับ", confirmButtonColor: "#1E3A8A" });
    return;
  }

  // 5. วันเดือนปี (พ.ศ.) ที่ออกหมายจับ
  const issueDate = document.getElementById("issue_date").value;
  if (!issueDate) {
    Swal.fire({ icon: "warning", title: "กรุณาเลือกวันที่ออกหมายจับ", confirmButtonColor: "#1E3A8A" });
    return;
  }

  // บันทึกประวัติตัวอักษรนำหน้า
  savePrefixHistory(bPre, "black");
  savePrefixHistory(rPre, "red");

  const newRecord = {
    id: `W-${Date.now()}`,
    warrant_type: type,
    warrant_number: fullWarrantNumber,
    black_number: fullBlackNumber,
    red_number: fullRedNumber,
    department: dept,
    issue_date: issueDate,
    created_by: state.currentUser ? state.currentUser.username : "admin",
    created_at: new Date().toLocaleString("th-TH"),
    updated_at: new Date().toLocaleString("th-TH")
  };

  showLoadingSweetAlert("กำลังบันทึกข้อมูลหมายจับ...");

  // Send to GAS
  await sendToGas("saveWarrant", newRecord);

  // Update local memory & storage
  state.warrants.unshift(newRecord);
  localStorage.setItem("warrant_data", JSON.stringify(state.warrants));

  Swal.close();
  Swal.fire({
    icon: "success",
    title: "บันทึกข้อมูลสำเร็จ",
    text: `บันทึกข้อมูลหมายจับ ${type} เลขที่ ${fullWarrantNumber} เรียบร้อยแล้ว`,
    confirmButtonColor: "#1E3A8A"
  }).then(() => {
    resetWarrantForm();
    renderAllDashboardTables();
    renderAllWarrantsTable();
    updateDashboardStats();
    navigateTo("dashboard");
  });
}

function resetWarrantForm() {
  document.getElementById("warrant_form").reset();
  populateYearSelects();
  if (state.flatpickrInstance) state.flatpickrInstance.setDate(new Date());

  // ข้อ 7: ถ้า user ทั่วไป ให้เลือก "ส่วนที่ออกหมายจับ" ตรงกับ user ที่ล็อกอิน แต่ถ้า admin ไม่ต้องเลือกเป็นค่าเริ่มต้น
  const deptSelect = document.getElementById("department");
  if (deptSelect) {
    if (state.currentUser && state.currentUser.role !== "admin" && state.currentUser.department) {
      deptSelect.value = state.currentUser.department;
    } else {
      deptSelect.value = "";
    }
  }

  updatePreview();
}

// Edit Modal Handling
function openEditModal(id) {
  const record = state.warrants.find(w => w.id === id);
  if (!record) return;

  // Check permission: user can only edit their own, admin can edit all
  if (state.currentUser.role !== "admin" && record.created_by !== state.currentUser.username) {
    Swal.fire({
      icon: "error",
      title: "ไม่มีสิทธิ์แก้ไข",
      text: "คุณสามารถแก้ไขได้เฉพาะข้อมูลที่คุณเป็นผู้บันทึกเท่านั้น",
      confirmButtonColor: "#1E3A8A"
    });
    return;
  }

  document.getElementById("edit_warrant_id").value = record.id;
  
  // Set radio type
  const is47 = record.warrant_type === "47" || record.warrant_type === "หมายจับ 47";
  document.getElementById("edit_type_47").checked = is47;
  document.getElementById("edit_type_47_bis").checked = !is47;

  // Split warrant number (number/year)
  const [wNum, wYear] = (record.warrant_number || "").split("/");
  document.getElementById("edit_warrant_number").value = (wNum || "").replace(/^0+/, '');
  if (wYear) document.getElementById("edit_warrant_year").value = wYear;

  // Split black number (prefix + number / year)
  parseCaseString(record.black_number, "edit_black_prefix", "edit_black_number", "edit_black_year");

  // Split red number (prefix + number / year)
  parseCaseString(record.red_number, "edit_red_prefix", "edit_red_number", "edit_red_year");

  // Department & Date
  document.getElementById("edit_department").value = record.department;
  if (state.editFlatpickrInstance && record.issue_date) {
    document.getElementById("edit_issue_date").value = record.issue_date;
  }

  document.getElementById("edit_modal").classList.remove("hidden");
}

function parseCaseString(fullStr, preId, numId, yearId) {
  if (!fullStr) return;
  const parts = fullStr.split("/");
  const year = parts[1] || "";
  const mainPart = parts[0] || "";

  // Extract prefix and digits
  const match = mainPart.match(/^([^\d]+)?(\d+)?$/);
  if (match) {
    document.getElementById(preId).value = match[1] || "";
    document.getElementById(numId).value = match[2] || "";
  } else {
    document.getElementById(preId).value = "";
    document.getElementById(numId).value = mainPart;
  }
  if (year) document.getElementById(yearId).value = year;
}

function closeEditModal() {
  document.getElementById("edit_modal").classList.add("hidden");
}

async function handleEditWarrantSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("edit_warrant_id").value;
  const target = state.warrants.find(w => w.id === id);
  if (!target) return;

  const type = document.querySelector('input[name="edit_warrant_type"]:checked')?.value || "47";
  let wNum = document.getElementById("edit_warrant_number").value.trim().replace(/^0+/, '');
  if (!wNum) {
    Swal.fire({ icon: "warning", title: "กรุณากรอกเลขหมายจับ (ต้องไม่เป็น 0)", confirmButtonColor: "#1E3A8A" });
    return;
  }
  const wYear = document.getElementById("edit_warrant_year").value;
  const bPre = document.getElementById("edit_black_prefix").value.trim();
  const bNum = document.getElementById("edit_black_number").value.trim();
  const bYear = document.getElementById("edit_black_year").value;
  const rPre = document.getElementById("edit_red_prefix").value.trim();
  const rNum = document.getElementById("edit_red_number").value.trim();
  const rYear = document.getElementById("edit_red_year").value;
  const dept = document.getElementById("edit_department").value;
  const date = document.getElementById("edit_issue_date").value;

  const updatedRecord = {
    ...target,
    warrant_type: type,
    warrant_number: `${wNum}/${wYear}`,
    black_number: `${bPre}${bNum}/${bYear}`,
    red_number: `${rPre}${rNum}/${rYear}`,
    department: dept,
    issue_date: date,
    updated_at: new Date().toLocaleString("th-TH")
  };

  showLoadingSweetAlert("กำลังบันทึกการแก้ไข...");

  await sendToGas("updateWarrant", {
    currentUser: state.currentUser.username,
    currentRole: state.currentUser.role,
    ...updatedRecord
  });

  const idx = state.warrants.findIndex(w => w.id === id);
  if (idx !== -1) {
    state.warrants[idx] = updatedRecord;
    localStorage.setItem("warrant_data", JSON.stringify(state.warrants));
  }

  Swal.close();
  closeEditModal();
  Swal.fire({
    icon: "success",
    title: "แก้ไขข้อมูลสำเร็จ",
    confirmButtonColor: "#1E3A8A",
    timer: 1500
  });

  renderAllDashboardTables();
  renderAllWarrantsTable();
}

function deleteWarrantRecord(id) {
  const target = state.warrants.find(w => w.id === id);
  if (!target) return;

  if (state.currentUser.role !== "admin" && target.created_by !== state.currentUser.username) {
    Swal.fire({
      icon: "error",
      title: "ไม่มีสิทธิ์ลบข้อมูล",
      text: "คุณสามารถลบได้เฉพาะข้อมูลที่คุณเป็นผู้บันทึกเท่านั้น",
      confirmButtonColor: "#1E3A8A"
    });
    return;
  }

  Swal.fire({
    title: "ยืนยันการลบข้อมูล?",
    text: `คุณต้องการลบหมายจับเลขที่ ${target.warrant_number} ใช่หรือไม่?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#DC2626",
    cancelButtonColor: "#64748B",
    confirmButtonText: "ลบข้อมูล",
    cancelButtonText: "ยกเลิก"
  }).then(async (res) => {
    if (res.isConfirmed) {
      showLoadingSweetAlert("กำลังลบข้อมูล...");

      await sendToGas("deleteWarrant", {
        id: id,
        currentUser: state.currentUser.username,
        currentRole: state.currentUser.role
      });

      state.warrants = state.warrants.filter(w => w.id !== id);
      localStorage.setItem("warrant_data", JSON.stringify(state.warrants));

      Swal.close();
      Swal.fire({
        icon: "success",
        title: "ลบข้อมูลสำเร็จ",
        timer: 1500,
        showConfirmButton: false
      });

      renderAllDashboardTables();
      renderAllWarrantsTable();
      updateDashboardStats();
    }
  });
}

// --- 8. USER MANAGEMENT (ข้อ 6, 9, 11, 13) - ADMIN ONLY ---
function renderUsersTable() {
  const tbody = document.getElementById("table_users_body");
  if (!tbody) return;
  tbody.innerHTML = "";

  state.users.forEach((u, idx) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition border-b border-slate-100 text-sm";
    
    const roleBadge = u.role === "admin"
      ? `<span class="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full text-xs">Admin</span>`
      : `<span class="bg-blue-100 text-blue-800 font-medium px-2.5 py-0.5 rounded-full text-xs">User</span>`;

    // ข้อ 11: ลบชื่อผู้ใช้งานที่เป็น user : admin ไม่ได้
    const deleteBtn = u.username === "admin"
      ? `<span class="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded" title="ระบบไม่อนุญาตให้ลบ admin หลัก"><i class="fa-solid fa-shield"></i> ผู้ใช้หลัก</span>`
      : `<button onclick="deleteUser('${u.username}')" class="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded font-medium shadow-sm transition"><i class="fa-solid fa-trash"></i> ลบ</button>`;

    tr.innerHTML = `
      <td class="px-4 py-3 text-center text-slate-500">${idx + 1}</td>
      <td class="px-4 py-3 font-semibold text-slate-900">${escapeHtml(u.username)}</td>
      <td class="px-4 py-3 text-slate-700">${escapeHtml(u.fullName || "-")}</td>
      <td class="px-4 py-3 text-slate-600">${escapeHtml(u.department || "-")}</td>
      <td class="px-4 py-3 text-center">${roleBadge}</td>
      <td class="px-4 py-3 text-slate-500 text-xs">${escapeHtml(u.createdAt || "-")}</td>
      <td class="px-4 py-3 text-center">
        <div class="flex items-center justify-center space-x-2">
          <button onclick="openEditUserModal('${u.username}')" class="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium shadow-sm transition"><i class="fa-solid fa-key"></i> แก้ไข</button>
          ${deleteBtn}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAddUserModal() {
  document.getElementById("user_modal_title").textContent = "เพิ่มผู้ใช้งานใหม่";
  document.getElementById("user_form").reset();
  document.getElementById("user_form_mode").value = "add";
  document.getElementById("user_username").disabled = false;
  document.getElementById("user_department").value = "";
  document.getElementById("user_role").disabled = false;
  document.getElementById("user_modal").classList.remove("hidden");
}

function openEditUserModal(username) {
  const user = state.users.find(u => u.username === username);
  if (!user) return;

  document.getElementById("user_modal_title").textContent = `แก้ไขผู้ใช้งาน: ${username}`;
  document.getElementById("user_form_mode").value = "edit";
  document.getElementById("user_username").value = user.username;
  document.getElementById("user_username").disabled = true;
  document.getElementById("user_fullname").value = user.fullName || "";
  document.getElementById("user_department").value = user.department || "";
  document.getElementById("user_password").value = "";
  document.getElementById("user_password").placeholder = "เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน";
  document.getElementById("user_role").value = user.role;
  
  // ป้องกันไม่ให้เปลี่ยน role ของ admin หลัก
  document.getElementById("user_role").disabled = (username === "admin");

  document.getElementById("user_modal").classList.remove("hidden");
}

function closeUserModal() {
  document.getElementById("user_modal").classList.add("hidden");
}

async function handleUserFormSubmit(e) {
  e.preventDefault();
  const mode = document.getElementById("user_form_mode").value;
  const username = document.getElementById("user_username").value.trim();
  const fullName = document.getElementById("user_fullname").value.trim();
  const department = document.getElementById("user_department").value;
  const password = document.getElementById("user_password").value.trim();
  const role = document.getElementById("user_role").value;

  if (mode === "add") {
    if (!username || !password) {
      Swal.fire({ icon: "warning", title: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน", confirmButtonColor: "#1E3A8A" });
      return;
    }
    if (state.users.some(u => u.username === username)) {
      Swal.fire({ icon: "error", title: "ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว", confirmButtonColor: "#1E3A8A" });
      return;
    }

    const newUser = {
      username,
      password,
      fullName: fullName || username,
      department: department || "",
      role,
      createdAt: new Date().toLocaleString("th-TH")
    };

    showLoadingSweetAlert("กำลังเพิ่มผู้ใช้งาน...");
    await sendToGas("saveUser", {
      currentRole: state.currentUser.role,
      ...newUser
    });

    state.users.push(newUser);
    localStorage.setItem("warrant_users", JSON.stringify(state.users));
    Swal.close();
    closeUserModal();
    Swal.fire({ icon: "success", title: "เพิ่มผู้ใช้งานสำเร็จ", timer: 1500 });
    renderUsersTable();

  } else {
    // Edit mode
    const idx = state.users.findIndex(u => u.username === username);
    if (idx === -1) return;

    const updated = { ...state.users[idx] };
    if (fullName) updated.fullName = fullName;
    updated.department = department || "";
    if (password) updated.password = password;
    if (username !== "admin") updated.role = role;

    showLoadingSweetAlert("กำลังแก้ไขข้อมูลผู้ใช้งาน...");
    await sendToGas("updateUser", {
      currentRole: state.currentUser.role,
      targetUsername: username,
      fullName,
      department: department || "",
      password: password || undefined,
      role: username !== "admin" ? role : undefined
    });

    state.users[idx] = updated;
    localStorage.setItem("warrant_users", JSON.stringify(state.users));
    Swal.close();
    closeUserModal();
    Swal.fire({ icon: "success", title: "แก้ไขข้อมูลผู้ใช้งานสำเร็จ", timer: 1500 });
    renderUsersTable();
  }
}

function deleteUser(username) {
  // ข้อ 11: แต่ลบชื่อผู้ใช้งานที่เป็น user : admin ไม่ได้
  if (username === "admin") {
    Swal.fire({
      icon: "error",
      title: "ไม่อนุญาตให้ลบ",
      text: "ระบบไม่อนุญาตให้ลบผู้ใช้งาน 'admin' ซึ่งเป็นผู้ดูแลระบบหลัก",
      confirmButtonColor: "#1E3A8A"
    });
    return;
  }

  Swal.fire({
    title: "ยืนยันการลบผู้ใช้งาน?",
    text: `คุณต้องการลบผู้ใช้งาน "${username}" ออกจากระบบใช่หรือไม่?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#DC2626",
    cancelButtonColor: "#64748B",
    confirmButtonText: "ลบผู้ใช้",
    cancelButtonText: "ยกเลิก"
  }).then(async (res) => {
    if (res.isConfirmed) {
      showLoadingSweetAlert("กำลังลบผู้ใช้งาน...");
      await sendToGas("deleteUser", {
        currentRole: state.currentUser.role,
        targetUsername: username
      });

      state.users = state.users.filter(u => u.username !== username);
      localStorage.setItem("warrant_users", JSON.stringify(state.users));
      Swal.close();
      Swal.fire({ icon: "success", title: "ลบผู้ใช้งานเรียบร้อยแล้ว", timer: 1500, showConfirmButton: false });
      renderUsersTable();
    }
  });
}

// --- 9. NAVIGATION & ROUTING ---
function navigateTo(viewId) {
  const views = ["dashboard", "form_warrant", "all_warrants", "users_management", "settings"];
  views.forEach(v => {
    const el = document.getElementById(`view_${v}`);
    if (el) el.classList.add("hidden");
    const menuEl = document.getElementById(`nav_menu_${v}`);
    if (menuEl) menuEl.classList.remove("bg-blue-900", "text-amber-400", "font-bold");
  });

  const activeView = document.getElementById(`view_${viewId}`);
  if (activeView) activeView.classList.remove("hidden");

  const activeMenu = document.getElementById(`nav_menu_${viewId}`);
  if (activeMenu) activeMenu.classList.add("bg-blue-900", "text-amber-400", "font-bold");

  if (viewId === "dashboard") {
    renderAllDashboardTables();
    updateDashboardStats();
  } else if (viewId === "all_warrants") {
    renderAllWarrantsTable();
  } else if (viewId === "users_management") {
    renderUsersTable();
  }

  // Close sidebar on mobile after navigate
  if (window.innerWidth < 768) {
    toggleSidebar(false);
  }
}

function toggleSidebar(forceState) {
  const sidebar = document.getElementById("main_sidebar");
  if (!sidebar) return;
  if (forceState !== undefined) {
    if (forceState) sidebar.classList.remove("-translate-x-full");
    else sidebar.classList.add("-translate-x-full");
  } else {
    sidebar.classList.toggle("-translate-x-full");
  }
}

// Quick form navigation with type preset (ข้อ 7: เลือกส่วนที่ออกหมายจับตาม user อัตโนมัติ แต่ admin ไม่เลือก)
function navigateToForm(type = "47") {
  navigateTo("form_warrant");
  if (type === "47") {
    document.getElementById("type_47").checked = true;
  } else {
    document.getElementById("type_47_bis").checked = true;
  }

  const deptSelect = document.getElementById("department");
  if (deptSelect) {
    if (state.currentUser && state.currentUser.role !== "admin" && state.currentUser.department) {
      deptSelect.value = state.currentUser.department;
    } else {
      deptSelect.value = "";
    }
  }
  updatePreview();
}

// --- 10. SETTINGS & EVENT LISTENERS ---
function setupEventListeners() {
  // Login form
  const loginForm = document.getElementById("login_form");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  // Warrant submit
  const warrantForm = document.getElementById("warrant_form");
  if (warrantForm) warrantForm.addEventListener("submit", handleWarrantSubmit);

  // Edit warrant form
  const editWarrantForm = document.getElementById("edit_warrant_form");
  if (editWarrantForm) editWarrantForm.addEventListener("submit", handleEditWarrantSubmit);

  // User form
  const userForm = document.getElementById("user_form");
  if (userForm) userForm.addEventListener("submit", handleUserFormSubmit);

  // Input listeners for preview
  const previewInputs = [
    "warrant_number", "warrant_year",
    "black_prefix", "black_number", "black_year",
    "red_prefix", "red_number", "red_year",
    "department"
  ];
  previewInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", updatePreview);
      el.addEventListener("change", updatePreview);
    }
  });

  // Settings: WebApp URL
  const settingsInput = document.getElementById("settings_gas_url");
  if (settingsInput) {
    settingsInput.value = localStorage.getItem("gas_webapp_url") || "";
  }
}

function saveGasUrl() {
  const url = document.getElementById("settings_gas_url").value.trim();
  localStorage.setItem("gas_webapp_url", url);
  Swal.fire({
    icon: "success",
    title: "บันทึกการตั้งค่าแล้ว",
    text: "ระบบจะใช้ Google Apps Script Web App นี้ในการดึงและบันทึกข้อมูล",
    confirmButtonColor: "#1E3A8A"
  });
}

function syncNow() {
  loadDataViaCSV(true);
}

function escapeHtml(text) {
  if (!text) return "";
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}
