var ACCOUNT_SHEET = "Tài khoản";
var STAFF_SHEET = "Tiếp viên";
var PRODUCT_SHEET = "Hàng hoá";
var ROOM_SHEET = "Phòng";
/** Phải trùng tên tab trong Spreadsheet (của bạn là "Log"). */
var LOG_SHEET = "Log";

// Map headers for sheets that may be auto-created via getSheet().
// Each getXSheet() also ensures headers exist even if the sheet already existed.
var SHEET_HEADERS = {
  "Tài khoản": ["ID", "Tài khoản", "Mật khẩu", "Role", "Tên"],
  "Tiếp viên": ["ID", "Tên", "SĐT", "Trạng thái", "RoomID", "Giá/giờ"],
  "Hàng hoá": ["ID", "Tên", "Đơn vị", "Giá", "Số lượng"],
  Phòng: [
    "ID",
    "Tên phòng",
    "Loại",
    "Giá/giờ",
    "Trạng thái",
    "Thời gian bắt đầu",
    "Order ID hiện tại",
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
        sheet.getRange(i + 1, STAFF_COL.STATUS).setValue("busy");
        sheet.getRange(i + 1, STAFF_COL.ROOM_ID).setValue(roomId || "");
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
        sheet.getRange(i + 1, STAFF_COL.STATUS).setValue("available");
        sheet.getRange(i + 1, STAFF_COL.ROOM_ID).setValue("");
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
      start_time: row[ROOM_COL.START_TIME - 1]
        ? new Date(row[ROOM_COL.START_TIME - 1]).toISOString()
        : null,
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

    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][ROOM_COL.ID - 1]) === String(id)) {
        sheet.deleteRow(i + 1);
        found = true;
        break;
      }
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
        sheet.getRange(i + 1, ROOM_COL.STATUS).setValue("occupied");
        sheet.getRange(i + 1, ROOM_COL.START_TIME).setValue(new Date());
        sheet.getRange(i + 1, ROOM_COL.CURRENT_ORDER_ID).setValue(orderId);
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
        sheet.getRange(i + 1, ROOM_COL.STATUS).setValue("available");
        sheet.getRange(i + 1, ROOM_COL.START_TIME).setValue("");
        sheet.getRange(i + 1, ROOM_COL.CURRENT_ORDER_ID).setValue("");
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
