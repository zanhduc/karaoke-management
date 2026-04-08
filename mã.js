var ACCOUNT_SHEET = "Tài khoản";
var STAFF_SHEET = "Tiếp viên";
var PRODUCT_SHEET = "Hàng hoá";

var ACCOUNT_COL = {
  ID: 1,
  USERNAME: 2,
  PASSWORD: 3,
  ROLE: 4,
  NAME: 5
};

var STAFF_COL = {
  ID: 1,
  NAME: 2,
  PHONE: 3,
  STATUS: 4,
  ROOM_ID: 5,
  PRICE: 6
};
var ROOM_COL = {
  ID: 1,
  NAME: 2,
  TYPE: 3,
  PRICE: 4,
  STATUS: 5
};

var PRODUCT_COL = {
  ID: 1,
  NAME: 2,
  UNIT: 3,
  PRICE: 4,
  QUANTITY: 5
};

var _cachedSpreadsheet = null;

/**
 * Lấy Spreadsheet - cached để tránh gọi nhiều lần
 */
function getSpreadsheet() {
  if (!_cachedSpreadsheet) {
    _cachedSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  }
  return _cachedSpreadsheet;
}

function trimVal(val) {
  return val != null ? String(val).trim() : "";
}

function getSheet(sheetName, createIfNotExist) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);

  // FIX: Nếu không tìm thấy chính xác, thử tìm theo chuẩn hóa Unicode (NFC vs NFD)
  if (!sheet) {
    var sheets = ss.getSheets();
    var target = sheetName.normalize("NFC");
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].getName().normalize("NFC") === target) {
        sheet = sheets[i];
        break;
      }
    }
  }

  if (!sheet && createIfNotExist) {
    sheet = ss.insertSheet(sheetName);
    // Thêm headers nếu có định nghĩa
    // Chuẩn hóa tên sheet để tìm header tương ứng trong object SHEET_HEADERS
    // Lưu ý: SHEET_HEADERS key có thể không khớp nếu tên sheet có dấu đặc biệt
    // Tạm thời dùng tên gốc sheetName
    if (SHEET_HEADERS[sheetName]) {
      sheet.appendRow(SHEET_HEADERS[sheetName]);
    }
  }

  return sheet;
}

function getAccountSheet(createIfNotExist) {
  var sheet = getSheet(ACCOUNT_SHEET, createIfNotExist);
  if (!sheet) return null;
  if (sheet.getLastRow() === 0) {
    sheet
      .getRange(1, 1, 1, 5)
      .setValues([["ID", "Tài khoản", "Mật khẩu", "Role", "Tên"]]);
  }
  return sheet;
}

function normalizeRole(role) {
  var value = String(role || "")
    .trim()
    .toLowerCase();
  return value === "admin" ? "admin" : "staff";
}

function readAccountsFromSheet() {
  var sheet = getAccountSheet(true);
  var lastRow = sheet.getLastRow();
  var rows = [];
  if (lastRow < 2) return rows;

  var data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var id = trimVal(row[ACCOUNT_COL.ID - 1]);
    var username = trimVal(row[ACCOUNT_COL.USERNAME - 1]);
    var password = trimVal(row[ACCOUNT_COL.PASSWORD - 1]);
    var role = normalizeRole(row[ACCOUNT_COL.ROLE - 1]);
    var name = trimVal(row[ACCOUNT_COL.NAME - 1]);

    if (!username || !password) continue;

    rows.push({
      id: id,
      username: username,
      password: password,
      role: role,
      name: name,
      rowIndex: i + 2,
    });
  }
  return rows;
}
/**
 * Đăng nhập - Kiểm tra tài khoản mật khẩu
 */
function login(username, password) {
  var uname = username ? String(username).trim() : "";
  var pwd = password ? String(password).trim() : "";
  var accounts = readAccountsFromSheet();
  var user = null;

  for (var i = 0; i < accounts.length; i++) {
    if (accounts[i].username === uname) {
      user = accounts[i];
      break;
    }
  }

  if (user && user.password === pwd) {
    var userProps = PropertiesService.getUserProperties();
    userProps.setProperty("loggedInUser", user.username);
    userProps.setProperty("userRole", user.role);
    userProps.setProperty("userName", user.name || user.username);
    userProps.setProperty("loginTime", new Date().toISOString());

    Logger.log("Login success: " + user.username + " - Role: " + user.role);
    return {
      success: true,
      role: user.role,
      name: user.name || user.username,
      username: user.username,
    };
  }

  Logger.log("Login failed: " + uname);
  return { success: false, message: "Sai tên đăng nhập hoặc mật khẩu!" };
}

/**
 * Kiểm tra session đăng nhập
 */
function checkSession() {
  var userProps = PropertiesService.getUserProperties();
  var loggedInUser = userProps.getProperty("loggedInUser");

  if (loggedInUser) {
    return {
      isLoggedIn: true,
      username: loggedInUser,
      role: userProps.getProperty("userRole"),
      name: userProps.getProperty("userName"),
    };
  }
  return { isLoggedIn: false };
}

/**
 * Đăng xuất - Xóa session
 */
function logout() {
  var userProps = PropertiesService.getUserProperties();
  userProps.deleteProperty("loggedInUser");
  userProps.deleteProperty("userRole");
  userProps.deleteProperty("userName");
  userProps.deleteProperty("loginTime");

  Logger.log("User logged out");
  return { success: true };
}

/**
 * Lấy thông tin user hiện tại
 */
function getCurrentUser() {
  return checkSession();
}

// ============ ROUTES ============

function doGet(e) {
  return HtmlService.createTemplateFromFile("index")
    .evaluate()
    .setTitle("Quản Lý Kho")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


// ===== STAFF(tiếp viên) =====

function getStaffSheet() {
  var s = getSheet(STAFF_SHEET, true);
  if (s.getLastRow() === 0) {
    s.appendRow(["ID", "Tên", "SĐT", "Trạng thái", "RoomID", "Giá/giờ"]);
  }
  return s;
}

function getStaffs() {
  var data = getStaffSheet().getDataRange().getValues();
  var res = [];

  for (var i = 1; i < data.length; i++) {
    res.push({
      id: data[i][0],
      name: data[i][1],
      phone: data[i][2],
      status: data[i][3] || "available",
      current_room_id: data[i][4] || "",
      price_per_hour: data[i][5] || 0
    });
  }
  return res;
}

function addStaff(s) {
  getStaffSheet().appendRow([
    s.id,
    s.name,
    s.phone,
    "available",
    "",
    s.price_per_hour || 0
  ]);
}

function updateStaff(s) {
  var sheet = getStaffSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(s.id)) {
      sheet.getRange(i + 1, 2).setValue(s.name);
      sheet.getRange(i + 1, 3).setValue(s.phone);
      sheet.getRange(i + 1, 6).setValue(s.price_per_hour);
      break;
    }
  }
}

function deleteStaff(id) {
  var sheet = getStaffSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

// gán vào phòng
function assignStaffToRoom(staffId, roomId) {
  var sheet = getStaffSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(staffId)) {
      sheet.getRange(i + 1, 4).setValue("busy");
      sheet.getRange(i + 1, 5).setValue(roomId);
      break;
    }
  }
}

// rời phòng
function releaseStaff(staffId) {
  var sheet = getStaffSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(staffId)) {
      sheet.getRange(i + 1, 4).setValue("available");
      sheet.getRange(i + 1, 5).setValue("");
      break;
    }
  }
}

// ================== ROOM ==================

function getRoomSheet() {
  var s = getSheet(ROOM_SHEET, true);
  if (s.getLastRow() === 0) {
    s.appendRow(["ID", "Tên phòng", "Loại", "Giá", "Trạng thái"]);
  }
  return s;
}

function getRooms() {
  var data = getRoomSheet().getDataRange().getValues();
  var res = [];

  for (var i = 1; i < data.length; i++) {
    res.push({
      id: data[i][0],
      name: data[i][1],
      type: data[i][2],
      price: data[i][3],
      status: data[i][4] || "empty"
    });
  }
  return res;
}

function updateRoomStatus(roomId, status) {
  var sheet = getRoomSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(roomId)) {
      sheet.getRange(i + 1, 5).setValue(status);
      break;
    }
  }
}

// ================== PRODUCT ==================

function getProductSheet() {
  var s = getSheet(PRODUCT_SHEET, true);
  if (s.getLastRow() === 0) {
    s.appendRow(["ID", "Tên", "Đơn vị", "Giá", "Số lượng"]);
  }
  return s;
}

function getProducts() {
  var data = getProductSheet().getDataRange().getValues();
  var res = [];

  for (var i = 1; i < data.length; i++) {
    res.push({
      id: data[i][0],
      name: data[i][1],
      unit: data[i][2],
      price: data[i][3],
      quantity: data[i][4]
    });
  }
  return res;
}

function addProduct(p) {
  getProductSheet().appendRow([
    p.id,
    p.name,
    p.unit || "",
    p.price || 0,
    p.quantity || 0
  ]);
}

function updateProduct(p) {
  var sheet = getProductSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(p.id)) {
      sheet.getRange(i + 1, 2).setValue(p.name);
      sheet.getRange(i + 1, 4).setValue(p.price);
      break;
    }
  }
}

function deleteProduct(id) {
  var sheet = getProductSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}