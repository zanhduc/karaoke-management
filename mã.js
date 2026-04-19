var ACCOUNT_SHEET = "Tài khoản";
var STAFF_SHEET = "Tiếp viên";
var PRODUCT_SHEET = "Hàng hoá";
var ROOM_SHEET = "Phòng";
var ORDER_SHEET = "Đơn hàng";
var CUSTOMER_SHEET = "Khách hàng";
var LOG_SHEET = "Log";

// Map headers for sheets that may be auto-created via getSheet().
// Each getXSheet() also ensures headers exist even if the sheet already existed.
var SHEET_HEADERS = {
  "Tài khoản": ["ID", "Tài khoản", "Mật khẩu", "Role", "Tên"],
  "Tiếp viên": ["ID", "Tên", "SĐT", "Trạng thái", "RoomID", "Giá/giờ"],
  "Hàng hoá": ["ID", "Tên", "Đơn vị", "Giá", "Số lượng"],
  "Khách hàng": ["ID", "Tên khách", "SĐT", "% Giảm giá"],
  Phòng: [
    "ID",
    "Tên phòng",
    "Loại",
    "Giá/giờ",
    "Trạng thái",
    "Thời gian bắt đầu",
    "Order ID hiện tại",
  ],
  "Đơn hàng": [
    "Mã HĐ",
    "Tên hoá đơn",
    "Khách hàng",
    "Giờ bắt đầu",
    "Giờ kết thúc",
    "Thời gian sử dụng",
    "Hoá đơn",
    "Tổng tiền dịch vụ",
    "Tổng tiền giờ",
    "Giảm theo KH",
    "Tăng giảm trực tiếp",
    "Hàng hoá",
    "Tiếp viên",
    "RoomId",
    "Tổng thanh toán",
    "Thanh toán ngân hàng",
    "Thanh toán tiền mặt",
    "Trạng thái thanh toán",
    "Ghi chú",
    "Ngày tạo",
  ],
  Log: ["Ngày giờ", "Người dùng", "Thay đổi", "Trạng thái", "Thông báo lỗi"],
};

/** Cột sheet Log (1-based) — khớp hàng tiêu đề bạn đã tạo */
var LOG_COL = {
  DATETIME: 1,
  USER: 2,
  CHANGE: 3,
  STATUS: 4,
  ERROR: 5,
};

var ACCOUNT_COL = {
  ID: 1,
  USERNAME: 2,
  PASSWORD: 3,
  ROLE: 4,
  NAME: 5,
};

var STAFF_COL = {
  ID: 1,
  NAME: 2,
  PHONE: 3,
  STATUS: 4,
  ROOM_ID: 5,
  PRICE: 6,
};
var ROOM_COL = {
  ID: 1,
  NAME: 2,
  TYPE: 3,
  PRICE: 4,
  STATUS: 5,
  START_TIME: 6,
  CURRENT_ORDER_ID: 7,
};

var PRODUCT_COL = {
  ID: 1,
  NAME: 2,
  UNIT: 3,
  PRICE: 4,
};

var CUSTOMER_COL = {
  ID: 1,
  NAME: 2,
  PHONE: 3,
  DISCOUNT_PERCENT: 4,
};

var ORDER_COL = {
  ORDER_CODE: 1,
  ORDER_NAME: 2,
  CUSTOMER: 3,
  START_TIME: 4,
  END_TIME: 5,
  DURATION: 6,
  INVOICE: 7,
  SERVICE_TOTAL: 8,
  ROOM_TOTAL: 9,
  DISCOUNT_CUSTOMER: 10,
  ADJUSTMENT: 11,
  PRODUCTS: 12,
  STAFFS: 13,
  ROOM_ID: 14,
  GRAND_TOTAL: 15,
  BANK_PAYMENT: 16,
  CASH_PAYMENT: 17,
  PAYMENT_STATUS: 18,
  NOTE: 19,
  CREATED_AT: 20,
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

function toSafeISOString(value, fallback) {
  if (value === null || value === undefined || value === "") {
    return fallback !== undefined ? fallback : "";
  }

  var date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) {
    return fallback !== undefined ? fallback : "";
  }

  return date.toISOString();
}

function stringifyForClient(payload) {
  return JSON.stringify(payload == null ? null : payload);
}

function parseJsonArraySafe(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "string") {
    try {
      var parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
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
    if (typeof SHEET_HEADERS !== "undefined" && SHEET_HEADERS[sheetName]) {
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

function updateOrderWithStaffSync(orderCode, updatedData) {
  if (!orderCode) throw new Error("Mã hoá đơn không hợp lệ");

  try {
    var sheet = getOrderSheet();
    var data = sheet.getDataRange().getValues();
    var found = false;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][ORDER_COL.ORDER_CODE - 1]) === String(orderCode)) {
        var roomId = data[i][ORDER_COL.ROOM_ID - 1];
        var currentStaffs = parseJsonArraySafe(data[i][ORDER_COL.STAFFS - 1]);
        var nextStaffs = parseJsonArraySafe(updatedData.staffs);

        updateOrder(orderCode, updatedData);

        var currentStaffIds = {};
        for (var c = 0; c < currentStaffs.length; c++) {
          if (currentStaffs[c] && currentStaffs[c].id) {
            currentStaffIds[String(currentStaffs[c].id)] = true;
          }
        }

        var nextStaffIds = {};
        for (var n = 0; n < nextStaffs.length; n++) {
          if (nextStaffs[n] && nextStaffs[n].id) {
            nextStaffIds[String(nextStaffs[n].id)] = true;
          }
        }

        for (var currentId in currentStaffIds) {
          if (!nextStaffIds[currentId]) {
            releaseStaff(currentId);
          }
        }

        for (var nextId in nextStaffIds) {
          if (!currentStaffIds[nextId]) {
            assignStaffToRoom(nextId, roomId);
          }
        }

        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error("Không tìm thấy hoá đơn: " + orderCode);
    }

    return { success: true, message: "Cập nhật hoá đơn thành công" };
  } catch (e) {
    auditLog("Cập nhật hoá đơn + staff sync " + orderCode, "FAIL", e.message || e);
    throw e;
  }
}

/**
 * Lấy danh sách tất cả tài khoản
 */
function getAllAccounts() {
  var currentUser = getCurrentUser();
  if (!currentUser.isLoggedIn || currentUser.role !== "admin") {
    throw new Error("Không có quyền truy cập. Yêu cầu quyền admin.");
  }

  var accounts = readAccountsFromSheet();
  return accounts.map(function (acc) {
    return {
      id: acc.id,
      username: acc.username,
      role: acc.role,
      name: acc.name,
    };
  });
}

/**
 * Thêm tài khoản mới
 */
function addNewAccount(accountData) {
  var currentUser = getCurrentUser();
  if (!currentUser.isLoggedIn || currentUser.role !== "admin") {
    throw new Error("Không có quyền truy cập. Yêu cầu quyền admin.");
  }

  if (!accountData.username || !accountData.password) {
    throw new Error("Tên đăng nhập và mật khẩu là bắt buộc.");
  }

  var accounts = readAccountsFromSheet();
  for (var i = 0; i < accounts.length; i++) {
    if (accounts[i].username === accountData.username) {
      throw new Error("Tên đăng nhập đã tồn tại.");
    }
  }

  try {
    var sheet = getAccountSheet(true);
    var id = "ACC" + new Date().getTime().toString(36).toUpperCase();

    sheet.appendRow([
      id,
      accountData.username,
      accountData.password,
      accountData.role || "staff",
      accountData.name || "",
    ]);

    auditLog("Thêm tài khoản mới: " + accountData.username, "SUCCESS", "");
    return { success: true, message: "Thêm tài khoản thành công." };
  } catch (e) {
    auditLog(
      "Lỗi thêm tài khoản: " + accountData.username,
      "FAIL",
      e.message || e,
    );
    throw e;
  }
}

/**
 * Đổi mật khẩu
 */
function changePasswordAdmin(username, newPassword) {
  var currentUser = getCurrentUser();
  if (!currentUser.isLoggedIn || currentUser.role !== "admin") {
    throw new Error("Không có quyền truy cập. Yêu cầu quyền admin.");
  }

  if (!username || !newPassword) {
    throw new Error("Tên đăng nhập và mật khẩu mới là bắt buộc.");
  }

  try {
    var sheet = getAccountSheet(true);
    var data = sheet.getDataRange().getValues();
    var found = false;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][ACCOUNT_COL.USERNAME - 1]) === String(username)) {
        sheet.getRange(i + 1, ACCOUNT_COL.PASSWORD).setValue(newPassword);
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error("Không tìm thấy tài khoản.");
    }

    auditLog("Đổi mật khẩu cho tài khoản: " + username, "SUCCESS", "");
    return { success: true, message: "Đổi mật khẩu thành công." };
  } catch (e) {
    auditLog("Lỗi đổi mật khẩu tài khoản: " + username, "FAIL", e.message || e);
    throw e;
  }
}

/**
 * Xoá tài khoản
 */
function deleteAccountAdmin(username) {
  var currentUser = getCurrentUser();
  if (!currentUser.isLoggedIn || currentUser.role !== "admin") {
    throw new Error("Không có quyền truy cập. Yêu cầu quyền admin.");
  }

  if (!username) {
    throw new Error("Tên đăng nhập là bắt buộc.");
  }

  // Không cho phép tài khoản đang đăng nhập tự tự xoá chính nó (tránh lỗi ngớ ngẩn)
  if (currentUser.username === username) {
    throw new Error("Bạn không thể tự xoá tài khoản của chính mình!");
  }

  try {
    var sheet = getAccountSheet(true);
    var data = sheet.getDataRange().getValues();
    var foundIndex = -1;

    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][ACCOUNT_COL.USERNAME - 1]) === String(username)) {
        foundIndex = i + 1;
        break;
      }
    }

    if (foundIndex === -1) {
      throw new Error("Không tìm thấy tài khoản.");
    }

    sheet.deleteRow(foundIndex);
    auditLog("Đã xoá tài khoản: " + username, "SUCCESS", "");
    return { success: true, message: "Xoá tài khoản thành công." };
  } catch (e) {
    auditLog("Lỗi xoá tài khoản: " + username, "FAIL", e.message || e);
    throw e;
  }
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
    auditLog(
      "Đăng nhập thành công — " + user.username + " (" + user.role + ")",
      "SUCCESS",
      "",
    );
    return {
      success: true,
      role: user.role,
      name: user.name || user.username,
      username: user.username,
    };
  }

  Logger.log("Login failed: " + uname);
  auditLog(
    "Đăng nhập thất bại — tài khoản: " + (uname || "(trống)"),
    "FAIL",
    "Sai tên đăng nhập hoặc mật khẩu!",
  );
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
  var who = trimVal(userProps.getProperty("loggedInUser"));
  try {
    userProps.deleteProperty("loggedInUser");
    userProps.deleteProperty("userRole");
    userProps.deleteProperty("userName");
    userProps.deleteProperty("loginTime");
    Logger.log("User logged out");
    auditLog("Đăng xuất" + (who ? " — " + who : ""), "SUCCESS", "");
  } catch (e) {
    auditLog("Đăng xuất", "FAIL", String(e.message || e));
    throw e;
  }
  return { success: true };
}

/**
 * Lấy thông tin user hiện tại
 */
function getCurrentUser() {
  return checkSession();
}

// ============ AUDIT LOG (sheet Log) ============

function getLogSheet() {
  var s = getSheet(LOG_SHEET, true);
  if (s.getLastRow() === 0) {
    s.appendRow(SHEET_HEADERS[LOG_SHEET]);
  }
  return s;
}

/**
 * Ghi một dòng nhật ký. Không throw ra ngoài (tránh làm hỏng CRUD chính).
 * Cột Người dùng: "username (role)" — lấy từ session GAS.
 */
function auditLog(changeDescription, status, errorMessage) {
  try {
    var sheet = getLogSheet();
    var props = PropertiesService.getUserProperties();
    var username = trimVal(props.getProperty("loggedInUser"));
    var role = trimVal(props.getProperty("userRole"));
    var displayUser =
      username || role
        ? (username || "—") + (role ? " (" + role + ")" : "")
        : "Chưa đăng nhập / hệ thống";

    sheet.appendRow([
      new Date(),
      displayUser,
      String(changeDescription || ""),
      status === "FAIL" ? "FAIL" : "SUCCESS",
      errorMessage != null ? String(errorMessage) : "",
    ]);
  } catch (e) {
    Logger.log("auditLog error: " + e);
  }
}

/**
 * Đọc lịch sử (mới nhất trước). Dùng cho UI sau này.
 * @param {number} optLimit số dòng tối đa (mặc định 200)
 */
function getAuditLogs(optLimit) {
  var limit = optLimit != null ? Number(optLimit) : 200;
  if (!isFinite(limit) || limit < 1) limit = 200;

  var sheet = getLogSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var startRow = Math.max(2, lastRow - limit + 1);
  var numRows = lastRow - startRow + 1;
  var data = sheet.getRange(startRow, 1, lastRow, LOG_COL.ERROR).getValues();
  var res = [];

  for (var i = data.length - 1; i >= 0; i--) {
    var row = data[i];
    res.push({
      datetime: row[LOG_COL.DATETIME - 1],
      user: row[LOG_COL.USER - 1],
      change: row[LOG_COL.CHANGE - 1],
      status: row[LOG_COL.STATUS - 1],
      error: row[LOG_COL.ERROR - 1],
    });
  }
  return res;
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
      price_per_hour: data[i][5] || 0,
    });
  }
  return res;
}

function addStaff(s) {
  try {
    getStaffSheet().appendRow([
      s.id,
      s.name,
      s.phone,
      "available",
      "",
      s.price_per_hour || 0,
    ]);
    auditLog(
      "Tiếp viên [CREATE]: Thêm — " +
        (s.name || "(không tên)") +
        " (ID " +
        s.id +
        ")",
      "SUCCESS",
      "",
    );
  } catch (e) {
    auditLog(
      "Tiếp viên [CREATE]: Thêm tiếp viên",
      "FAIL",
      String(e.message || e),
    );
    throw e;
  }
}

function updateStaff(s) {
  try {
    var sheet = getStaffSheet();
    var data = sheet.getDataRange().getValues();
    var found = false;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(s.id)) {
        sheet.getRange(i + 1, 2).setValue(s.name);
        sheet.getRange(i + 1, 3).setValue(s.phone);
        sheet.getRange(i + 1, 6).setValue(s.price_per_hour);
        found = true;
        break;
      }
    }
    if (found) {
      auditLog(
        "Tiếp viên [UPDATE]: Sửa ID " +
          s.id +
          " — " +
          (s.name || "") +
          " / SĐT / giá giờ",
        "SUCCESS",
        "",
      );
    } else {
      auditLog(
        "Tiếp viên [UPDATE]: ID " + s.id,
        "FAIL",
        "Không tìm thấy bản ghi trên sheet",
      );
    }
  } catch (e) {
    auditLog(
      "Tiếp viên [UPDATE]: ID " + (s && s.id),
      "FAIL",
      String(e.message || e),
    );
    throw e;
  }
}

function deleteStaff(id) {
  try {
    var sheet = getStaffSheet();
    var data = sheet.getDataRange().getValues();
    var found = false;

    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        found = true;
        break;
      }
    }
    if (found) {
      auditLog("Tiếp viên [DELETE]: Xoá ID " + id, "SUCCESS", "");
    } else {
      auditLog(
        "Tiếp viên [DELETE]: ID " + id,
        "FAIL",
        "Không tìm thấy bản ghi",
      );
    }
  } catch (e) {
    auditLog("Tiếp viên [DELETE]: ID " + id, "FAIL", String(e.message || e));
    throw e;
  }
}

// gán vào phòng
function assignStaffToRoom(staffId, roomId) {
  if (!staffId) throw new Error("staffId không hợp lệ");
  try {
    var sheet = getStaffSheet();
    var data = sheet.getDataRange().getValues();
    var found = false;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(staffId)) {
        // Batch update thay vì 2 lần setValue
        sheet
          .getRange(i + 1, STAFF_COL.STATUS, 1, 2)
          .setValues([["busy", roomId || ""]]);
        found = true;
        break;
      }
    }
    if (found) {
      auditLog(
        "Tiếp viên [ASSIGN]: Gán staff " +
          staffId +
          " → phòng " +
          (roomId || "(trống)"),
        "SUCCESS",
        "",
      );
    } else {
      auditLog(
        "Tiếp viên [ASSIGN]: staff " + staffId,
        "FAIL",
        "Không tìm thấy tiếp viên",
      );
    }
  } catch (e) {
    auditLog(
      "Tiếp viên [ASSIGN]: staff " + staffId,
      "FAIL",
      String(e.message || e),
    );
    throw e;
  }
}

// rời phòng
function releaseStaff(staffId) {
  if (!staffId) throw new Error("staffId không hợp lệ");
  try {
    var sheet = getStaffSheet();
    var data = sheet.getDataRange().getValues();
    var found = false;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(staffId)) {
        // Batch update thay vì 2 lần setValue
        sheet
          .getRange(i + 1, STAFF_COL.STATUS, 1, 2)
          .setValues([["available", ""]]);
        found = true;
        break;
      }
    }
    if (found) {
      auditLog("Tiếp viên [RELEASE]: Nhả staff " + staffId, "SUCCESS", "");
    } else {
      auditLog(
        "Tiếp viên [RELEASE]: staff " + staffId,
        "FAIL",
        "Không tìm thấy tiếp viên",
      );
    }
  } catch (e) {
    auditLog(
      "Tiếp viên [RELEASE]: staff " + staffId,
      "FAIL",
      String(e.message || e),
    );
    throw e;
  }
}

// ================== ROOM ==================

function getRoomSheet() {
  var s = getSheet(ROOM_SHEET, true);
  if (s.getLastRow() === 0) {
    s.appendRow([
      "ID",
      "Tên phòng",
      "Loại",
      "Giá/giờ",
      "Trạng thái",
      "Thời gian bắt đầu",
      "Order ID hiện tại",
    ]);
  }
  return s;
}
function getRoomById(roomId) {
  var data = getRoomSheet().getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[ROOM_COL.ID - 1]) === String(roomId)) {
      return {
        id: row[ROOM_COL.ID - 1],
        name: row[ROOM_COL.NAME - 1],
        type: row[ROOM_COL.TYPE - 1],
        price_per_hour: Number(row[ROOM_COL.PRICE - 1]) || 0,
        status: String(row[ROOM_COL.STATUS - 1] || "available").toLowerCase(),
        start_time: toSafeISOString(row[ROOM_COL.START_TIME - 1], null),
        current_order_id: row[ROOM_COL.CURRENT_ORDER_ID - 1] || "",
      };
    }
  }
  return null;
}

function getRooms() {
  var data = getRoomSheet().getDataRange().getValues();
  var res = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    res.push({
      id: row[ROOM_COL.ID - 1],
      name: row[ROOM_COL.NAME - 1],
      type: row[ROOM_COL.TYPE - 1],
      price_per_hour: Number(row[ROOM_COL.PRICE - 1]) || 0,
      status: String(row[ROOM_COL.STATUS - 1] || "available").toLowerCase(),
      start_time: toSafeISOString(row[ROOM_COL.START_TIME - 1], null),
      current_order_id: row[ROOM_COL.CURRENT_ORDER_ID - 1] || "",
    });
  }
  return res;
}

function addRoom(r) {
  if (!r || !r.id) throw new Error("roomId không hợp lệ");
  try {
    getRoomSheet().appendRow([
      r.id,
      r.name || "",
      r.type || "thường",
      r.price_per_hour != null ? r.price_per_hour : 0,
      r.status || "available",
      r.start_time ? new Date(r.start_time) : "",
      r.current_order_id || "",
    ]);
    auditLog(
      "Phòng [CREATE]: Thêm — " +
        (r.name || "(không tên)") +
        " (ID " +
        r.id +
        ")",
      "SUCCESS",
      "",
    );
  } catch (e) {
    auditLog("Phòng [CREATE]: Thêm phòng", "FAIL", String(e.message || e));
    throw e;
  }
}

function updateRoom(r) {
  if (!r || !r.id) throw new Error("roomId không hợp lệ");

  try {
    var sheet = getRoomSheet();
    var data = sheet.getDataRange().getValues();
    var found = false;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][ROOM_COL.ID - 1]) === String(r.id)) {
        if (r.name !== undefined)
          sheet.getRange(i + 1, ROOM_COL.NAME).setValue(r.name);
        if (r.type !== undefined)
          sheet.getRange(i + 1, ROOM_COL.TYPE).setValue(r.type);
        if (r.price_per_hour !== undefined)
          sheet.getRange(i + 1, ROOM_COL.PRICE).setValue(r.price_per_hour);
        found = true;
        break;
      }
    }
    if (found) {
      auditLog(
        "Phòng [UPDATE]: Sửa ID " + r.id + " — tên/loại/giá",
        "SUCCESS",
        "",
      );
    } else {
      auditLog("Phòng [UPDATE]: ID " + r.id, "FAIL", "Không tìm thấy phòng");
    }
  } catch (e) {
    auditLog("Phòng [UPDATE]: ID " + r.id, "FAIL", String(e.message || e));
    throw e;
  }
}

function deleteRoom(id) {
  if (!id) throw new Error("roomId không hợp lệ");
  try {
    var sheet = getRoomSheet();
    var data = sheet.getDataRange().getValues();
    var found = false;
    var isOccupied = false;

    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][ROOM_COL.ID - 1]) === String(id)) {
        // Kiểm tra xem phòng có đang sử dụng không
        var roomStatus = String(
          data[i][ROOM_COL.STATUS - 1] || "",
        ).toLowerCase();
        if (roomStatus === "occupied" || roomStatus === "cleaning") {
          isOccupied = true;
          break;
        }
        sheet.deleteRow(i + 1);
        found = true;
        break;
      }
    }
    if (isOccupied) {
      throw new Error("Không thể xoá phòng đang được sử dụng!");
    }
    if (found) {
      auditLog("Phòng [DELETE]: Xoá ID " + id, "SUCCESS", "");
    } else {
      auditLog("Phòng [DELETE]: ID " + id, "FAIL", "Không tìm thấy phòng");
    }
  } catch (e) {
    auditLog("Phòng [DELETE]: ID " + id, "FAIL", String(e.message || e));
    throw e;
  }
}

function setRoomCleaning(roomId) {
  if (!roomId) throw new Error("roomId không hợp lệ");
  updateRoomStatus(roomId, "cleaning");
}
function startRoom(roomId, orderId) {
  if (!roomId) throw new Error("roomId không hợp lệ");
  if (!orderId) throw new Error("orderId không hợp lệ");
  try {
    var sheet = getRoomSheet();
    var data = sheet.getDataRange().getValues();
    var found = false;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(roomId)) {
        found = true;
        var currentStatus = data[i][ROOM_COL.STATUS - 1] || "available";
        if (String(currentStatus) !== "available") {
          auditLog(
            "Phòng [START]: Phòng " + roomId + ", order " + orderId,
            "FAIL",
            "Phòng đang được sử dụng!",
          );
          throw new Error("Phòng đang được sử dụng!");
        }
        // Batch update thay vì 3 lần setValue
        sheet
          .getRange(i + 1, ROOM_COL.STATUS, 1, 3)
          .setValues([["occupied", new Date(), orderId]]);
        auditLog(
          "Phòng [START]: Mở phòng " + roomId + ", order " + orderId,
          "SUCCESS",
          "",
        );
        break;
      }
    }
    if (!found) {
      auditLog("Phòng [START]: " + roomId, "FAIL", "Không tìm thấy phòng");
      throw new Error("Không tìm thấy phòng");
    }
  } catch (e) {
    var msg = String(e.message || e);
    if (
      msg.indexOf("Phòng đang được sử dụng") === -1 &&
      msg.indexOf("Không tìm thấy phòng") === -1
    ) {
      auditLog("Phòng [START]: " + roomId, "FAIL", msg);
    }
    throw e;
  }
}
function endRoom(roomId) {
  if (!roomId) throw new Error("roomId không hợp lệ");
  try {
    var sheet = getRoomSheet();
    var data = sheet.getDataRange().getValues();
    var found = false;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(roomId)) {
        // Batch update thay vì 3 lần setValue
        sheet
          .getRange(i + 1, ROOM_COL.STATUS, 1, 3)
          .setValues([["available", "", ""]]);
        found = true;
        break;
      }
    }
    if (found) {
      auditLog("Phòng [END]: Kết thúc phòng " + roomId, "SUCCESS", "");
    } else {
      auditLog("Phòng [END]: " + roomId, "FAIL", "Không tìm thấy phòng");
    }
  } catch (e) {
    auditLog("Phòng [END]: " + roomId, "FAIL", String(e.message || e));
    throw e;
  }
}
function updateRoomStatus(roomId, status) {
  if (!roomId) throw new Error("roomId không hợp lệ");
  try {
    var sheet = getRoomSheet();
    var data = sheet.getDataRange().getValues();
    var found = false;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(roomId)) {
        sheet.getRange(i + 1, ROOM_COL.STATUS).setValue(status);
        found = true;
        break;
      }
    }
    if (found) {
      auditLog(
        "Phòng [STATUS]: Phòng " + roomId + " → " + status,
        "SUCCESS",
        "",
      );
    } else {
      auditLog("Phòng [STATUS]: " + roomId, "FAIL", "Không tìm thấy phòng");
    }
  } catch (e) {
    auditLog("Phòng [STATUS]: " + roomId, "FAIL", String(e.message || e));
    throw e;
  }
}

// ================== PRODUCT ==================

function getProductSheet() {
  var s = getSheet(PRODUCT_SHEET, true);
  if (s.getLastRow() === 0) {
    s.appendRow(["ID", "Tên", "Đơn vị", "Giá"]);
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
    });
  }
  return res;
}

function addProduct(p) {
  return runWithLockOrQueue_("ADD_PRODUCT", { payload: p }, function() {
    return addProductInternal_(p);
  });
}

function addProductInternal_(p) {
  try {
    getProductSheet().appendRow([p.id, p.name, p.unit || "", p.price || 0]);
    auditLog(
      "Hàng hoá [CREATE]: Thêm — " +
        (p.name || "(không tên)") +
        " (ID " +
        p.id +
        ")",
      "SUCCESS",
      "",
    );
  } catch (e) {
    auditLog("Hàng hoá [CREATE]: Thêm hàng", "FAIL", String(e.message || e));
    throw e;
  }
}

function updateProduct(p) {
  return runWithLockOrQueue_("UPDATE_PRODUCT", { payload: p }, function() {
    return updateProductInternal_(p);
  });
}

function updateProductInternal_(p) {
  try {
    var sheet = getProductSheet();
    var data = sheet.getDataRange().getValues();
    var found = false;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(p.id)) {
        sheet.getRange(i + 1, 2).setValue(p.name);
        sheet.getRange(i + 1, 4).setValue(p.price);
        found = true;
        break;
      }
    }
    if (found) {
      auditLog(
        "Hàng hoá [UPDATE]: Sửa ID " + p.id + " — " + (p.name || "") + " / giá",
        "SUCCESS",
        "",
      );
    } else {
      auditLog("Hàng hoá [UPDATE]: ID " + p.id, "FAIL", "Không tìm thấy hàng");
    }
  } catch (e) {
    auditLog(
      "Hàng hoá [UPDATE]: ID " + (p && p.id),
      "FAIL",
      String(e.message || e),
    );
    throw e;
  }
}

function deleteProduct(id) {
  return runWithLockOrQueue_("DELETE_PRODUCT", { payload: id }, function() {
    return deleteProductInternal_(id);
  });
}

function deleteProductInternal_(id) {
  try {
    var sheet = getProductSheet();
    var data = sheet.getDataRange().getValues();
    var found = false;

    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        found = true;
        break;
      }
    }
    if (found) {
      auditLog("Hàng hoá [DELETE]: Xoá ID " + id, "SUCCESS", "");
    } else {
      auditLog("Hàng hoá [DELETE]: ID " + id, "FAIL", "Không tìm thấy hàng");
    }
  } catch (e) {
    auditLog("Hàng hoá [DELETE]: ID " + id, "FAIL", String(e.message || e));
    throw e;
  }
}

// ==========================================
// CONCURRENCY GUARD (LOCK + QUEUE)
// ==========================================
function setupQueueInfrastructure() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("QUEUE");
  if (!sheet) {
    sheet = ss.insertSheet("QUEUE");
    sheet.appendRow(["JOB_ID", "TIMESTAMP", "ACTION", "PAYLOAD_JSON", "STATUS", "RESULT_JSON"]);
  }
  
  var triggers = ScriptApp.getProjectTriggers();
  var hasTrigger = false;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "processQueue") {
      hasTrigger = true;
      break;
    }
  }
  if (!hasTrigger) {
    ScriptApp.newTrigger("processQueue").timeBased().everyMinutes(1).create();
  }
}

function processQueue() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("QUEUE");
  if (!sheet) return;
  var lock = LockService.getScriptLock();
  if (lock.tryLock(5000)) {
    try {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][4] === "PENDING") {
          var action = data[i][2];
          var payloadStr = data[i][3];
          var payload = JSON.parse(payloadStr);
          
          try {
            var result = null;
            if (action === "ADD_PRODUCT") result = addProductInternal_(payload.payload);
            else if (action === "UPDATE_PRODUCT") result = updateProductInternal_(payload.payload);
            else if (action === "DELETE_PRODUCT") result = deleteProductInternal_(payload.payload);
            
            sheet.getRange(i + 1, 5).setValue("DONE");
            sheet.getRange(i + 1, 6).setValue(JSON.stringify(result || {}));
          } catch(e) {
            sheet.getRange(i + 1, 5).setValue("ERROR");
            sheet.getRange(i + 1, 6).setValue(e.toString());
          }
        }
      }
    } finally {
      lock.releaseLock();
    }
  }
}

function runWithLockOrQueue_(actionName, context, actionFn) {
  var lock = LockService.getScriptLock();
  if (lock.tryLock(10000)) { // Đợi tối đa 10s
    try {
      return actionFn();
    } finally {
      lock.releaseLock();
    }
  } else {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("QUEUE");
    if (sheet) {
      var jobId = Utilities.getUuid();
      sheet.appendRow([jobId, new Date(), actionName, JSON.stringify(context), "PENDING", ""]);
      return { queued: true, jobId: jobId };
    }
    throw new Error("Hệ thống đang bận và không có QUEUE sheet, vui lòng thử lại sau.");
  }
}

// ================== CUSTOMER (KHÁCH QUEN) ==================

function getCustomerSheet() {
  var s = getSheet(CUSTOMER_SHEET, true);
  if (s.getLastRow() === 0) {
    s.appendRow(["ID", "Tên khách", "SĐT", "% Giảm giá"]);
  }
  return s;
}

function getCustomers() {
  var data = getCustomerSheet().getDataRange().getValues();
  var res = [];

  for (var i = 1; i < data.length; i++) {
    res.push({
      id: data[i][CUSTOMER_COL.ID - 1],
      name: data[i][CUSTOMER_COL.NAME - 1],
      phone: data[i][CUSTOMER_COL.PHONE - 1],
      discountPercent: Number(data[i][CUSTOMER_COL.DISCOUNT_PERCENT - 1]) || 0,
    });
  }
  return res;
}

function addCustomer(c) {
  try {
    getCustomerSheet().appendRow([
      c.id,
      c.name || "",
      c.phone || "",
      Number(c.discountPercent) || 0,
    ]);
    auditLog(
      "Khách quen [CREATE]: Thêm — " +
        (c.name || "(không tên)") +
        " (ID " +
        c.id +
        ")",
      "SUCCESS",
      "",
    );
  } catch (e) {
    auditLog("Khách quen [CREATE]: Thêm khách", "FAIL", String(e.message || e));
    throw e;
  }
}

function updateCustomer(c) {
  try {
    var sheet = getCustomerSheet();
    var data = sheet.getDataRange().getValues();
    var found = false;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][CUSTOMER_COL.ID - 1]) === String(c.id)) {
        sheet.getRange(i + 1, CUSTOMER_COL.NAME).setValue(c.name || "");
        sheet.getRange(i + 1, CUSTOMER_COL.PHONE).setValue(c.phone || "");
        sheet
          .getRange(i + 1, CUSTOMER_COL.DISCOUNT_PERCENT)
          .setValue(Number(c.discountPercent) || 0);
        found = true;
        break;
      }
    }
    if (found) {
      auditLog(
        "Khách quen [UPDATE]: Sửa ID " + c.id + " — " + (c.name || ""),
        "SUCCESS",
        "",
      );
    } else {
      auditLog(
        "Khách quen [UPDATE]: ID " + c.id,
        "FAIL",
        "Không tìm thấy khách",
      );
    }
  } catch (e) {
    auditLog(
      "Khách quen [UPDATE]: ID " + (c && c.id),
      "FAIL",
      String(e.message || e),
    );
    throw e;
  }
}

function deleteCustomer(id) {
  try {
    var sheet = getCustomerSheet();
    var data = sheet.getDataRange().getValues();
    var found = false;

    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][CUSTOMER_COL.ID - 1]) === String(id)) {
        sheet.deleteRow(i + 1);
        found = true;
        break;
      }
    }
    if (found) {
      auditLog("Khách quen [DELETE]: Xoá ID " + id, "SUCCESS", "");
    } else {
      auditLog("Khách quen [DELETE]: ID " + id, "FAIL", "Không tìm thấy khách");
    }
  } catch (e) {
    auditLog("Khách quen [DELETE]: ID " + id, "FAIL", String(e.message || e));
    throw e;
  }
}

// ================== DASHBOARD STATISTICS ==================

/**
 * Thống kê phòng theo trạng thái
 */
function getRoomStatistics() {
  var rooms = getRooms();
  var stats = {
    total: rooms.length,
    available: 0,
    occupied: 0,
    cleaning: 0,
  };

  for (var i = 0; i < rooms.length; i++) {
    var status = String(rooms[i].status || "available").toLowerCase();
    if (status === "occupied") {
      stats.occupied++;
    } else if (status === "cleaning") {
      stats.cleaning++;
    } else {
      stats.available++;
    }
  }

  return stats;
}

/**
 * Tổng số tiếp viên
 */
function getTotalStaffCount() {
  return getStaffs().length;
}

/**
 * Thống kê tiếp viên theo trạng thái
 */
function getStaffStatistics() {
  var staffs = getStaffs();
  var stats = {
    total: staffs.length,
    available: 0,
    busy: 0,
  };

  for (var i = 0; i < staffs.length; i++) {
    var status = String(staffs[i].status || "available").toLowerCase();
    if (status === "busy") {
      stats.busy++;
    } else {
      stats.available++;
    }
  }

  return stats;
}

// ====================== ORDER FUNCTIONS ======================

function getOrderSheet() {
  try {
    Logger.log("getOrderSheet: Starting...");
    var s = getSheet(ORDER_SHEET, true);
    Logger.log("getOrderSheet: Got sheet, lastRow=" + s.getLastRow());

    if (s.getLastRow() === 0) {
      Logger.log("getOrderSheet: Sheet empty, appending headers");
      s.appendRow(SHEET_HEADERS[ORDER_SHEET]);
    }

    Logger.log("getOrderSheet: Returning sheet with lastRow=" + s.getLastRow());
    return s;
  } catch (e) {
    Logger.log("ERROR in getOrderSheet: " + e.message);
    throw e;
  }
}

/**
 * Sinh mã hoá đơn theo chuẩn Việt Nam
 * Ví dụ: HD20260409-0001
 */
function generateOrderCode() {
  var dateStr = Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd");
  var sheet = getOrderSheet();
  var lastRow = sheet.getLastRow();
  var nextNum = 1;

  if (lastRow >= 2) {
    var lastCode = sheet.getRange(lastRow, ORDER_COL.ORDER_CODE).getValue();
    if (lastCode && lastCode.toString().includes(dateStr)) {
      var num = parseInt(lastCode.toString().split("-")[1]) || 0;
      nextNum = num + 1;
    }
  }

  return `HD${dateStr}-${nextNum.toString().padStart(4, "0")}`;
}

/**
 * Tạo đơn hàng mới
 * - startTime = lúc tạo order
 * - endTime = rỗng (sẽ set lúc thanh toán)
 * - duration = rỗng (sẽ tính lúc thanh toán)
 * - roomTotal = 0 (sẽ tính lúc thanh toán)
 * - staffs = không có hours (tính từ lúc add vào order)
 */
function createOrder(orderData) {
  if (!orderData || !orderData.roomId) {
    throw new Error("Thiếu thông tin phòng (roomId)");
  }

  try {
    var orderCode = generateOrderCode();
    var now = new Date();
    var startTime = orderData.startTime ? new Date(orderData.startTime) : now;

    var row = [
      orderCode,
      orderData.orderName ||
        `Hoá đơn phòng ${orderData.roomName || orderData.roomId}`,
      orderData.customerName || "Khách vãng lai",
      startTime,
      "", // endTime - rỗng, sẽ set lúc thanh toán
      "", // duration - rỗng, sẽ tính lúc thanh toán
      orderCode,
      Number(orderData.serviceTotal) || 0,
      0, // roomTotal = 0, sẽ tính lúc thanh toán
      Number(orderData.discountCustomer) || 0,
      Number(orderData.adjustment) || 0,
      JSON.stringify(orderData.products || []),
      JSON.stringify(orderData.staffs || []), // không có hours
      orderData.roomId,
      Number(orderData.grandTotal) || 0,
      Number(orderData.bankPayment) || 0,
      Number(orderData.cashPayment) || 0,
      orderData.paymentStatus || "Chưa thanh toán",
      orderData.note || "",
      now,
    ];

    getOrderSheet().appendRow(row);

    // Cập nhật trạng thái phòng
    startRoom(orderData.roomId, orderCode);

    // Cập nhật nhân viên thành "đang bận"
    if (orderData.staffs && Array.isArray(orderData.staffs)) {
      orderData.staffs.forEach(function (staff) {
        if (staff.id) {
          try {
            assignStaffToRoom(staff.id, orderData.roomId);
          } catch (e) {
            // Log lỗi nhưng không dừng tạo order
            auditLog(
              `Cập nhật nhân viên ${staff.id} thất bại`,
              "FAIL",
              e.message || e,
            );
          }
        }
      });
    }

    // Ghi log
    auditLog(
      `Tạo hoá đơn ${orderCode} - Phòng ${orderData.roomName || orderData.roomId} - Khách: ${orderData.customerName || "Vãng lai"}`,
      "SUCCESS",
      "",
    );

    // Trả về room data ngay lập tức (đã được cập nhật bởi startRoom)
    var updatedRoom = getRoomById(orderData.roomId);

    return {
      success: true,
      orderCode: orderCode,
      message: "Tạo đơn hàng thành công",
      room: updatedRoom, // Trả về room data để frontend update ngay không cần wait
    };
  } catch (e) {
    auditLog(
      `Tạo hoá đơn thất bại - Phòng ${orderData.roomId}`,
      "FAIL",
      e.message || e,
    );
    throw e;
  }
}

/**
 * Lấy danh sách đơn hàng (mới nhất lên trên) - TỐI ƯU: default limit 50
 */
function getOrders(limit = 50, roomMap = null) {
  try {
    var sheet = getOrderSheet();
    if (!sheet) {
      Logger.log("ERROR: getOrderSheet() returned null");
      return [];
    }

    var lastRow = sheet.getLastRow();
    Logger.log("Order sheet lastRow: " + lastRow);

    if (lastRow < 2) {
      Logger.log("getOrders: No data rows (lastRow < 2)");
      return [];
    }

    var data = sheet.getDataRange().getValues();
    Logger.log("Order sheet data length: " + data.length);
    var result = [];

    for (var i = lastRow; i >= 2; i--) {
      if (result.length >= limit) break;
      var row = data[i - 1];
      var orderCode = trimVal(row[ORDER_COL.ORDER_CODE - 1]);

      if (!orderCode) {
        continue;
      }

      // Parse JSON strings for products and staffs
      var productsData = row[ORDER_COL.PRODUCTS - 1];
      var staffsData = row[ORDER_COL.STAFFS - 1];

      try {
        if (typeof productsData === "string" && productsData) {
          productsData = JSON.parse(productsData);
        }
      } catch (e) {
        Logger.log(
          "Warning: Could not parse products for order " +
            row[ORDER_COL.ORDER_CODE - 1] +
            ": " +
            e.message,
        );
        productsData = [];
      }

      try {
        if (typeof staffsData === "string" && staffsData) {
          staffsData = JSON.parse(staffsData);
        }
      } catch (e) {
        Logger.log(
          "Warning: Could not parse staffs for order " +
            row[ORDER_COL.ORDER_CODE - 1] +
            ": " +
            e.message,
        );
        staffsData = [];
      }

      result.push({
        orderCode: orderCode,
        orderName: row[ORDER_COL.ORDER_NAME - 1],
        customerName: row[ORDER_COL.CUSTOMER - 1],
        startTime: toSafeISOString(row[ORDER_COL.START_TIME - 1], ""),
        endTime: toSafeISOString(row[ORDER_COL.END_TIME - 1], ""),
        duration: row[ORDER_COL.DURATION - 1],
        serviceTotal: row[ORDER_COL.SERVICE_TOTAL - 1],
        roomTotal: row[ORDER_COL.ROOM_TOTAL - 1],
        discountCustomer: row[ORDER_COL.DISCOUNT_CUSTOMER - 1],
        adjustment: row[ORDER_COL.ADJUSTMENT - 1],
        products: productsData,
        staffs: staffsData,
        roomId: row[ORDER_COL.ROOM_ID - 1],
        roomName:
          roomMap && roomMap[row[ORDER_COL.ROOM_ID - 1]]
            ? roomMap[row[ORDER_COL.ROOM_ID - 1]]
            : "Phòng " + row[ORDER_COL.ROOM_ID - 1],
        grandTotal: row[ORDER_COL.GRAND_TOTAL - 1],
        bankPayment: row[ORDER_COL.BANK_PAYMENT - 1],
        cashPayment: row[ORDER_COL.CASH_PAYMENT - 1],
        paymentStatus: row[ORDER_COL.PAYMENT_STATUS - 1],
        note: row[ORDER_COL.NOTE - 1],
        createdAt: toSafeISOString(row[ORDER_COL.CREATED_AT - 1], ""),
      });
    }

    Logger.log("✅ getOrders returning " + result.length + " orders");
    return result;
  } catch (e) {
    Logger.log("❌ ERROR in getOrders: " + e.message);
    auditLog("getOrders error", "FAIL", e.message);
    return [];
  }
}

function getOrdersJson(limit) {
  return stringifyForClient(getOrders(limit));
}

/**
 * Get a single order by its code
 */
function getOrderByCode(orderCode) {
  try {
    var sheet = getOrderSheet();
    if (!sheet) {
      Logger.log("ERROR: getOrderSheet() returned null");
      return null;
    }

    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      var row = data[i];

      if (String(row[ORDER_COL.ORDER_CODE - 1]) === String(orderCode)) {
        // Parse JSON strings for products and staffs
        var productsData = row[ORDER_COL.PRODUCTS - 1];
        var staffsData = row[ORDER_COL.STAFFS - 1];

        try {
          if (typeof productsData === "string" && productsData) {
            productsData = JSON.parse(productsData);
          }
        } catch (e) {
          Logger.log(
            "Warning: Could not parse products for order " +
              orderCode +
              ": " +
              e.message,
          );
          productsData = [];
        }

        try {
          if (typeof staffsData === "string" && staffsData) {
            staffsData = JSON.parse(staffsData);
          }
        } catch (e) {
          Logger.log(
            "Warning: Could not parse staffs for order " +
              orderCode +
              ": " +
              e.message,
          );
          staffsData = [];
        }

        return {
          orderCode: row[ORDER_COL.ORDER_CODE - 1],
          orderName: row[ORDER_COL.ORDER_NAME - 1],
          customerName: row[ORDER_COL.CUSTOMER - 1],
          startTime: toSafeISOString(row[ORDER_COL.START_TIME - 1], ""),
          endTime: toSafeISOString(row[ORDER_COL.END_TIME - 1], ""),
          duration: row[ORDER_COL.DURATION - 1],
          serviceTotal: row[ORDER_COL.SERVICE_TOTAL - 1],
          roomTotal: row[ORDER_COL.ROOM_TOTAL - 1],
          discountCustomer: row[ORDER_COL.DISCOUNT_CUSTOMER - 1],
          adjustment: row[ORDER_COL.ADJUSTMENT - 1],
          products: productsData,
          staffs: staffsData,
          roomId: row[ORDER_COL.ROOM_ID - 1],
          roomName: getRoomNameById(row[ORDER_COL.ROOM_ID - 1]),
          grandTotal: row[ORDER_COL.GRAND_TOTAL - 1],
          bankPayment: row[ORDER_COL.BANK_PAYMENT - 1],
          cashPayment: row[ORDER_COL.CASH_PAYMENT - 1],
          paymentStatus: row[ORDER_COL.PAYMENT_STATUS - 1],
          note: row[ORDER_COL.NOTE - 1],
          createdAt: toSafeISOString(row[ORDER_COL.CREATED_AT - 1], ""),
        };
      }
    }

    Logger.log("getOrderByCode: Order not found - " + orderCode);
    return null;
  } catch (e) {
    Logger.log("ERROR in getOrderByCode: " + e.message);
    auditLog("getOrderByCode error", "FAIL", e.message);
    return null;
  }
}

function getOrderByCodeJson(orderCode) {
  return stringifyForClient(getOrderByCode(orderCode));
}

/**
 * Diagnostic function to check sheets and data status
 */
function diagnosticCheckSheets() {
  Logger.log("=== DIAGNOSTIC CHECK ===");

  try {
    var ss = getSpreadsheet();
    var sheets = ss.getSheets();
    Logger.log("Total sheets: " + sheets.length);

    for (var i = 0; i < sheets.length; i++) {
      Logger.log(
        "Sheet " +
          i +
          ": " +
          sheets[i].getName() +
          " (rows: " +
          sheets[i].getLastRow() +
          ")",
      );
    }

    // Check Order sheet specifically
    Logger.log("\n=== Order Sheet Check ===");
    var orderSheet = getSheet(ORDER_SHEET, false);
    if (orderSheet) {
      Logger.log("Order sheet found: " + orderSheet.getName());
      Logger.log("Last row: " + orderSheet.getLastRow());
      if (orderSheet.getLastRow() > 0) {
        var headerRow = orderSheet.getRange(1, 1, 1, 20).getValues()[0];
        Logger.log("Header row: " + headerRow);
      }
      if (orderSheet.getLastRow() > 1) {
        var dataRow = orderSheet.getRange(2, 1, 1, 20).getValues()[0];
        Logger.log("First data row: " + dataRow);
      }
    } else {
      Logger.log("Order sheet NOT found");
    }

    // Try calling getRooms
    Logger.log("\n=== getRooms Test ===");
    var rooms = getRooms();
    Logger.log(
      "getRooms returned: " +
        (rooms ? "Array with " + rooms.length + " items" : "null"),
    );

    // Try calling getOrders
    Logger.log("\n=== getOrders Test ===");
    var orders = getOrders();
    Logger.log(
      "getOrders returned: " +
        (orders ? "Array with " + orders.length + " items" : "null"),
    );
  } catch (e) {
    Logger.log("DIAGNOSTIC ERROR: " + e.message);
  }
}

/**
 * Lấy tên phòng theo ID
 */
function getRoomNameById(roomId) {
  var rooms = getRooms();
  for (var i = 0; i < rooms.length; i++) {
    if (String(rooms[i].id) === String(roomId)) {
      return rooms[i].name;
    }
  }
  return "Phòng " + roomId;
}

/**
 * Xoá hẳn đơn hàng (Delete Order)
 * - Giải phóng nhân viên
 * - Cập nhật trạng thái phòng thành trống (nếu phòng đang gắn với order này)
 * - Xoá dòng trên sheet Đơn hàng
 */
function deleteOrder(orderCode) {
  if (!orderCode) throw new Error("Mã hoá đơn không hợp lệ");

  try {
    var sheet = getOrderSheet();
    var data = sheet.getDataRange().getValues();
    var roomId = null;
    var staffs = null;
    var foundRowIndex = -1;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][ORDER_COL.ORDER_CODE - 1]) === String(orderCode)) {
        roomId = data[i][ORDER_COL.ROOM_ID - 1];

        var staffsData = data[i][ORDER_COL.STAFFS - 1];
        try {
          if (typeof staffsData === "string" && staffsData) {
            staffs = JSON.parse(staffsData);
          }
        } catch (e) {
          staffs = [];
        }

        foundRowIndex = i + 1; // 1-based index (Row in spreadsheet = array index + 1)
        break;
      }
    }

    if (foundRowIndex === -1) {
      throw new Error("Không tìm thấy hoá đơn: " + orderCode);
    }

    // Giải phóng nhân viên
    if (staffs && Array.isArray(staffs)) {
      for (var s = 0; s < staffs.length; s++) {
        if (staffs[s] && staffs[s].id) {
          try {
            releaseStaff(staffs[s].id);
          } catch (e) {
            auditLog(
              `Giải phóng nhân viên ${staffs[s].id} thất bại khi xoá order`,
              "FAIL",
              e.message || e,
            );
          }
        }
      }
    }

    // Lấy thông tin phòng để kiểm tra current_order_id
    if (roomId) {
      try {
        var roomSheet = getSheet(ROOM_SHEET, true);
        var roomData = roomSheet.getDataRange().getValues();
        for (var r = 1; r < roomData.length; r++) {
          if (String(roomData[r][ROOM_COL.ID - 1]) === String(roomId)) {
            // Chỉ giải phóng phòng nếu phòng đó đang gắn với đúng orderCode này
            if (
              String(roomData[r][ROOM_COL.CURRENT_ORDER_ID - 1]) ===
              String(orderCode)
            ) {
              endRoom(roomId);
            }
            break;
          }
        }
      } catch (e) {
        auditLog(
          `Giải phóng phòng ${roomId} thất bại khi xoá order`,
          "FAIL",
          e.message || e,
        );
      }
    }

    // Xoá order khỏi sheet
    sheet.deleteRow(foundRowIndex);

    auditLog(`Đã xoá order ${orderCode}`, "SUCCESS", "");
    return { success: true, message: "Xoá order thành công" };
  } catch (e) {
    auditLog(`Xoá order ${orderCode}`, "FAIL", e.message || e);
    throw e;
  }
}

/**
 * Cập nhật order (sửa sản phẩm, tiếp viên, ghi chú...)
 */
function updateOrder(orderCode, updatedData) {
  if (!orderCode) throw new Error("Mã hoá đơn không hợp lệ");

  try {
    var sheet = getOrderSheet();
    var data = sheet.getDataRange().getValues();
    var found = false;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][ORDER_COL.ORDER_CODE - 1]) === String(orderCode)) {
        // Cập nhật các cột
        if (updatedData.products != null) {
          sheet
            .getRange(i + 1, ORDER_COL.PRODUCTS)
            .setValue(
              typeof updatedData.products === "string"
                ? updatedData.products
                : JSON.stringify(updatedData.products),
            );
        }
        if (updatedData.staffs != null) {
          sheet
            .getRange(i + 1, ORDER_COL.STAFFS)
            .setValue(
              typeof updatedData.staffs === "string"
                ? updatedData.staffs
                : JSON.stringify(updatedData.staffs),
            );
        }
        if (updatedData.note != null) {
          sheet.getRange(i + 1, ORDER_COL.NOTE).setValue(updatedData.note);
        }
        if (updatedData.grandTotal != null) {
          sheet
            .getRange(i + 1, ORDER_COL.GRAND_TOTAL)
            .setValue(updatedData.grandTotal);
        }
        if (updatedData.bankPayment != null) {
          sheet
            .getRange(i + 1, ORDER_COL.BANK_PAYMENT)
            .setValue(updatedData.bankPayment);
        }
        if (updatedData.cashPayment != null) {
          sheet
            .getRange(i + 1, ORDER_COL.CASH_PAYMENT)
            .setValue(updatedData.cashPayment);
        }

        auditLog(`Cập nhật hoá đơn ${orderCode}`, "SUCCESS", "");
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error("Không tìm thấy hoá đơn: " + orderCode);
    }

    return { success: true, message: "Cập nhật hoá đơn thành công" };
  } catch (e) {
    auditLog(`Cập nhật hoá đơn ${orderCode}`, "FAIL", e.message || e);
    throw e;
  }
}

/**
 * Chốt thanh toán cho order
 * - Cập nhật endTime = hiện tại
 * - Tính duration = làm tròn lên theo giờ
 * - Tính roomTotal = roomPrice × duration
 * - Cập nhật grandTotal
 * - Giải phóng nhân viên
 */
function markOrderAsPaid(orderCode, paymentData) {
  if (!orderCode) throw new Error("Mã hoá đơn không hợp lệ");

  try {
    var sheet = getOrderSheet();
    var data = sheet.getDataRange().getValues();
    var roomId = null;
    var startTime = null;
    var staffs = null;
    var found = false;
    var now = new Date();
    var endTime = now;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][ORDER_COL.ORDER_CODE - 1]) === String(orderCode)) {
        startTime = new Date(data[i][ORDER_COL.START_TIME - 1]);
        roomId = data[i][ORDER_COL.ROOM_ID - 1];

        // Parse staffs
        var staffsData = data[i][ORDER_COL.STAFFS - 1];
        try {
          if (typeof staffsData === "string" && staffsData) {
            staffs = JSON.parse(staffsData);
          }
        } catch (e) {
          staffs = [];
        }

        // Tính duration theo phút và giờ
        var durationMs = endTime.getTime() - startTime.getTime();
        var durationMinutes = durationMs / (1000 * 60);
        var durationHours = durationMinutes / 60;
        var duration = durationHours.toFixed(2); // Lưu định dạng "x.xx"

        // Lấy giá phòng và tính roomTotal theo phút
        var room = null;
        var rooms = getRooms();
        for (var j = 0; j < rooms.length; j++) {
          if (String(rooms[j].id) === String(roomId)) {
            room = rooms[j];
            break;
          }
        }

        var roomPrice = room ? Number(room.price_per_hour) || 0 : 0;
        var rawRoomTotal = (roomPrice / 60) * durationMinutes;
        var roomTotal = Math.round(rawRoomTotal / 1000) * 1000;

        // Tính tổng tiếp viên (tính theo phút: price_per_hour / 60 * staffDurationMinutes)
        var staffTotal = 0;
        if (staffs && Array.isArray(staffs)) {
          for (var k = 0; k < staffs.length; k++) {
            var staffStart = staffs[k].startTime
              ? new Date(staffs[k].startTime)
              : startTime;
            var staffDurationMs = endTime.getTime() - staffStart.getTime();
            if (staffDurationMs < 0) staffDurationMs = 0;
            var staffDurationMinutes = staffDurationMs / (1000 * 60);

            staffTotal +=
              ((Number(staffs[k].price_per_hour) || 0) / 60) *
              staffDurationMinutes;
          }
        }

        // Tính lại grandTotal
        var serviceTotal = data[i][ORDER_COL.SERVICE_TOTAL - 1] || 0;
        var discountCustomer = data[i][ORDER_COL.DISCOUNT_CUSTOMER - 1] || 0;
        var adjustment = data[i][ORDER_COL.ADJUSTMENT - 1] || 0;
        var productTotal = data[i][ORDER_COL.PRODUCTS - 1]
          ? (function () {
              try {
                var prods =
                  typeof data[i][ORDER_COL.PRODUCTS - 1] === "string"
                    ? JSON.parse(data[i][ORDER_COL.PRODUCTS - 1])
                    : data[i][ORDER_COL.PRODUCTS - 1];
                var sum = 0;
                if (Array.isArray(prods)) {
                  for (var p = 0; p < prods.length; p++) {
                    sum +=
                      (Number(prods[p].price) || 0) *
                      (Number(prods[p].quantity) || 1);
                  }
                }
                return sum;
              } catch (e) {
                return 0;
              }
            })()
          : 0;

        var newServiceTotal = productTotal + staffTotal;
        var subtotal = roomTotal + newServiceTotal;
        var rawGrandTotal = Math.max(
          0,
          subtotal - Number(discountCustomer) + Number(adjustment),
        );
        var grandTotal = Math.round(rawGrandTotal / 1000) * 1000;

        // Cập nhật các cột
        sheet.getRange(i + 1, ORDER_COL.END_TIME).setValue(endTime);
        sheet.getRange(i + 1, ORDER_COL.DURATION).setValue(duration);
        sheet.getRange(i + 1, ORDER_COL.ROOM_TOTAL).setValue(roomTotal);
        sheet
          .getRange(i + 1, ORDER_COL.SERVICE_TOTAL)
          .setValue(newServiceTotal);
        sheet.getRange(i + 1, ORDER_COL.GRAND_TOTAL).setValue(grandTotal);

        // Cập nhật thanh toán
        sheet
          .getRange(i + 1, ORDER_COL.BANK_PAYMENT)
          .setValue(paymentData.bankPayment || 0);
        sheet
          .getRange(i + 1, ORDER_COL.CASH_PAYMENT)
          .setValue(paymentData.cashPayment || 0);
        sheet
          .getRange(i + 1, ORDER_COL.PAYMENT_STATUS)
          .setValue("Đã thanh toán");

        auditLog(
          `Chốt thanh toán hoá đơn ${orderCode} - Duration: ${duration}h`,
          "SUCCESS",
          "",
        );
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error("Không tìm thấy hoá đơn: " + orderCode);
    }

    // Giải phóng nhân viên
    if (staffs && Array.isArray(staffs)) {
      for (var s = 0; s < staffs.length; s++) {
        if (staffs[s].id) {
          try {
            releaseStaff(staffs[s].id);
          } catch (e) {
            auditLog(
              `Giải phóng nhân viên ${staffs[s].id} thất bại`,
              "FAIL",
              e.message || e,
            );
          }
        }
      }
    }

    // Cập nhật trạng thái phòng thành trống
    if (roomId) {
      endRoom(roomId);
    }

    return { success: true, message: "Chốt thanh toán thành công" };
  } catch (e) {
    auditLog(`Chốt thanh toán ${orderCode}`, "FAIL", e.message || e);
    throw e;
  }
}

/**
 * Kiểm tra các đơn hàng gần kết thúc (thêm thông báo)
 * Khi phòng còn 10 phút nữa kết thúc
 */
function checkOrdersNearingEnd() {
  var sheet = getOrderSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var data = sheet.getDataRange().getValues();
  var result = [];
  var now = new Date();

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var paymentStatus = row[ORDER_COL.PAYMENT_STATUS - 1];
    var endTime = row[ORDER_COL.END_TIME - 1];

    // Chỉ check order chưa thanh toán
    if (paymentStatus !== "Đã thanh toán" && endTime) {
      var end = new Date(endTime);
      var timeDiff = end.getTime() - now.getTime();
      var minutesLeft = Math.floor(timeDiff / 60000);

      // Nếu còn 10 phút hoặc ít hơn nhưng > 0
      if (minutesLeft >= 0 && minutesLeft <= 10) {
        result.push({
          orderCode: row[ORDER_COL.ORDER_CODE - 1],
          roomId: row[ORDER_COL.ROOM_ID - 1],
          roomName: getRoomNameById(row[ORDER_COL.ROOM_ID - 1]),
          customerName: row[ORDER_COL.CUSTOMER - 1],
          minutesLeft: minutesLeft,
        });
      }
    }
  }

  return result;
}

/**
 * Lấy toàn bộ dữ liệu (Room, Order, Product, Staff, Customer) trong 1 lần
 * TỐI ƯU: Gọi một lần thay vì 5 lần
 */
function getUnifiedRoomData() {
  try {
    return {
      rooms: getRooms() || [],
      orders: getOrders(50) || [],
      products: getProducts() || [],
      staffs: getStaffs() || [],
      customers: getCustomers() || [],
    };
  } catch (e) {
    Logger.log("ERROR in getUnifiedRoomData: " + e.message);
    auditLog("getUnifiedRoomData error", "FAIL", e.message);
    return {
      rooms: [],
      orders: [],
      products: [],
      staffs: [],
      customers: [],
    };
  }
}

function getUnifiedRoomDataJson() {
  return stringifyForClient(getUnifiedRoomData());
}

/**
 * Lấy dữ liệu rút gọn (chỉ Room và Order) - dùng cho refresh nhanh
 * TỐI ƯU: Chỉ load 2 sheet thay vì 5 sheets
 */
function getRoomAndOrderData() {
  try {
    // Build room map once instead of calling getRooms for each order
    var rooms = getRooms() || [];
    var roomMap = {};
    for (var i = 0; i < rooms.length; i++) {
      roomMap[rooms[i].id] = rooms[i].name;
    }

    var orders = getOrders(50, roomMap) || [];
    return {
      rooms: rooms,
      orders: orders,
    };
  } catch (e) {
    Logger.log("ERROR in getRoomAndOrderData: " + e.message);
    auditLog("getRoomAndOrderData error", "FAIL", e.message);
    return {
      rooms: [],
      orders: [],
    };
  }
}

function getRoomAndOrderDataJson() {
  return stringifyForClient(getRoomAndOrderData());
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
