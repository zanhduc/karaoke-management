var ACCOUNT_SHEET = "Tài khoản";

var ACCOUNT_COL = {
  ID: 1,
  USERNAME: 2,
  PASSWORD: 3,
  ROLE: 4,
  NAME: 5,
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
