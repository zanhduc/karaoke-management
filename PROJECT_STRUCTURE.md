# Karaoke Management System - Cấu Trúc Dự Án

## 📋 Tổng Quan Dự Án

**Tên:** Hệ thống Quản Lý Quán Karaoke (Karaoke Management System)
**Công nghệ:** React 18, Google Apps Script, Tailwind CSS
**Ngôn ngữ:** Tiếng Việt

---

## 🏗️ Cấu Trúc Thư Mục

```
karaoke-management/
├── index.html                    # File chính (App entry point)
├── login.html                    # Page đăng nhập
├── dashboardComponent.html       # Dashboard (chỉ admin)
├── createOrderComponent.html     # Soạn hoá đơn
├── orderManagement.html          # Quản lý hoá đơn
├── roomComponent.html            # Quản lý phòng
├── staffComponent.html           # Quản lý tiếp viên
├── productComponent.html         # Quản lý hàng hoá
├── customerManager.html          # Quản lý khách hàng
├── mã.js                         # Backend (Google Apps Script)
└── PROJECT_STRUCTURE.md          # File tài liệu này
```

---

## 🔐 Authentication & Authorization

### **index.html**

**Chức năng chính:** Authentication, Navigation, Main App Container

#### React Contexts:

- `AuthContext` - Lưu trữ user data, login/logout functions

#### Key Components:

- **AuthProvider** - Wrapper component cho auth state management
  - Timeout: 24 giờ (`SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000`)
  - localStorage key: `authUser`

- **MainApp** - Main navigation component
  - Lấy page từ URL parameter: `?page=create-order`
  - Role-based page access

#### Functions:

- `login(username, password)` → Returns: `{ success, role, name }`
- `logout()` → Clears localStorage, calls GAS logout
- `getInitialPage()` → Determine initial page based on role

#### Page Navigation:

```
Routes:
- "dashboard"        → DashboardPage (admin only)
- "create-order"     → OrderPage
- "order-management" → OrderManagementPage
- "customer"         → CustomerPage
- "staff"            → StaffPage
- "product"          → ProductPage
- "room"             → RoomPage
```

#### Sidebar Navigation:

```
Admin Role:
  - 📊 Dashboard
  - 📝 Soạn đơn hàng
  - 📋 Quản lý hoá đơn
  - 🏨 Quản lý phòng
  - 🛍️ Quản lý hàng hoá
  - 👥 Quản lý tiếp viên
  - 💳 Quản lý khách hàng

Staff Role:
  - 📝 Soạn đơn hàng (default)
  - 📋 Quản lý hoá đơn
```

#### Test Credentials:

```
Admin:   username: "admin" | password: "admin123"
Staff:   username: "staff" | password: "123456"
```

#### include() in index.html:

```html
<?!= include('staffComponent'); ?>
<?!= include('productComponent'); ?> <?!= include('roomComponent'); ?> <?!=
include('dashboardComponent'); ?> <?!= include('createOrderComponent.html'); ?>
<?!= include('orderManagement.html'); ?> <?!= include('customerManager.html');
?>
```

---

## 📊 Dashboard Component

### **dashboardComponent.html**

**Chức năng:** Hiển thị thống kê tổng quan (Admin only)

#### Window Output:

```javascript
window.DashboardPage = function DashboardPage() { ... }
```

#### State:

```javascript
- roomStats: { total, available, occupied, cleaning }
- staffStats: { total, available, busy }
- isLoading: boolean
- error: string
```

#### Server Functions (Google Apps Script):

- `getRoomStatistics()` → Returns room stats
- `getStaffStatistics()` → Returns staff stats

#### Display Elements:

1. **Room Statistics Card:**
   - 🏠 Total Rooms
   - ✅ Available Rooms
   - 🎤 Occupied Rooms
   - 🧹 Cleaning Rooms
   - Progress bars

2. **Staff Statistics Card:**
   - 👥 Total Staff
   - 🟢 Available Staff
   - 🔴 Busy Staff
   - Progress bars

#### Data Fetch:

- Runs on component mount: `useEffect(() => { loadData() }, [])`
- Promise.all: Fetch rooms + staff stats in parallel

---

## 📝 Create Order Component

### **createOrderComponent.html**

**Chức năng:** Soạn, tạo hoá đơn mới

#### Window Output:

```javascript
window.OrderPage = function OrderPage() { ... }
```

#### Form State:

```javascript
- selectedRoomId: string (required)
- startTime: Date (auto, giờ tạo đơn)
- selectedCustomerId: string (optional, khách quen)
- guestName: string (tên khách hoặc khách vãng lai)
- note: string

// Hàng hoá
- orderItems: [{ id, name, quantity, price }, ...]
- pickProductId: string (selector)
- pickQty: number (default: 1)

// Tiếp viên
- orderStaffs: [{ id, name, price_per_hour }, ...]
- pickStaffId: string (selector)

// Thanh toán
- discountCustomer: number (% hoặc VND)
- adjustment: number (điều chỉnh trực tiếp)
```

#### Data Loading:

```javascript
Promise.all([getRooms(), getProducts(), getStaffs(), getCustomers()]);
```

#### Calculations (useMemo):

```javascript
calc = {
  roomTotal: 0 (sẽ tính lúc thanh toán),
  productTotal: sum(item.price * item.quantity),
  staffTotal: sum(staff.price_per_hour),
  serviceTotal: productTotal + staffTotal,
  discount: từ khách quen hoặc manual input,
  grandTotal: max(0, serviceTotal - discount + adjustment)
}
```

#### Key Functions:

- `addProduct()` → Add product với quantity
- `removeItem(id)` → Remove product
- `updateItemQty(id, qty)` → Update product quantity

- `addStaff()` → Add staff
- `removeStaff(id)` → Remove staff

- `handleCreate()` → Submit order
  - POST to: `createOrder(orderData)`
  - Response: `{ success, orderCode }`
  - Resets form on success

#### UI Sections:

1. Phòng & thời gian
2. Khách hàng
3. Hàng hoá / đồ uống
4. Tiếp viên phục vụ
5. Tổng kết & thanh toán

#### Order Data Structure (sent to GAS):

```javascript
{
  roomId: string,
  roomName: string,
  customerName: string,
  startTime: ISO string,
  endTime: "",
  duration: "",
  serviceTotal: number,
  roomTotal: 0,
  products: [{ id, name, quantity, price }, ...],
  staffs: [{ id, name, price_per_hour }, ...],
  grandTotal: number,
  discountCustomer: number,
  adjustment: number,
  cashPayment: 0,
  bankPayment: 0,
  paymentStatus: "Chưa thanh toán",
  note: string
}
```

#### GAS Functions Called:

- `getRooms()`
- `getProducts()`
- `getStaffs()`
- `getCustomers()`
- `createOrder(orderData)` → Returns: `{ success, orderCode }`

---

## 📋 Order Management Component

### **orderManagement.html**

**Chức năng:** Xem, sửa, thanh toán hoá đơn

#### Window Output:

```javascript
window.OrderManagementPage = function OrderManagementPage() { ... }
```

#### State:

```javascript
- orders: [{ ...order }, ...]
- rooms: [{ ...room }, ...]
- products: [{ ...product }, ...]
- staffs: [{ ...staff }, ...]
- searchQuery: string

- selectedOrder: object (modal detail)
- showDetailModal: boolean

- tempProducts: [{ ...product with id, quantity }, ...]
- tempStaffs: [{ ...staff with hours }, ...]
- tempBankPayment: number
- tempCashPayment: number
- tempNote: string

- activeTab: "active" | "completed"

- selectedRoom: object (room detail modal)
- showRoomDetailModal: boolean
- remainingTime: number

- releasedStaffsRef: Set (track released staff to prevent duplicate notifications)
- notifiedOrdersRef: Set (track 10-min notifications)
```

#### Components:

1. **ElapsedTimer** - Display elapsed time in HH:MM:SS or MM:SS format
   - Props: `{ startTime, small? }`
   - Auto-updates every 1 second

#### Tabs:

- **Active Orders** - Orders with `paymentStatus === "Chưa thanh toán"`
- **Completed Orders** - Orders with `paymentStatus !== "Chưa thanh toán"`

#### Key Functions:

1. **Data Loading:**
   - `loadAllData()` → Fetch orders, rooms, products, staffs
   - Runs every 30 seconds + on mount

2. **Order List Filtering:**
   - `activeOrders` → Filter by payment status
   - `completedOrders` → Filter by payment status
   - `filteredActiveOrders` → Filter + search by room/customer name
   - `filteredCompletedOrders` → Filter + search by room/customer name

3. **Order Management:**
   - `openOrderDetail(order)` → Load order into modal, populate temp state
   - `closeDetailModal()` → Close modal, reset temp state
   - `saveOrderChanges()` → POST to `updateOrder()`
   - `completePayment()` → POST to `completePayment()`, mark as complete

4. **Product Management in Order:**
   - `addProductToCurrentOrder(product)` → Add to tempProducts
   - `removeProductFromOrder(id)` → Remove from tempProducts
   - `updateProductQty(id, qty)` → Update product quantity

5. **Staff Management in Order:**
   - `addStaffToCurrentOrder(staff)` → Add to tempStaffs
   - `removeStaffFromOrder(id)` → Remove from tempStaffs
   - `updateStaffHours(id, hours)` → Update staff hours
   - `availableStaffs` → Filter staffs not yet added

6. **Room Detail Modal:**
   - `openRoomDetailModal(order)` → Display room info + current order
   - `closeRoomDetailModal()` → Close modal
   - Shows products, staffs, total for room

7. **Real-time Calculations:**
   - `elapsedTick` → Updates every second for real-time elapsed time display
   - `estimatedCalc` → Estimate room duration + cost when not yet paid
   - `calc` → Calculate totals in real-time

#### Notification System:

- Tracks released staff via `releasedStaffsRef`
- Tracks 10-minute notifications via `notifiedOrdersRef`
- Resets notifications when active orders change
- Shows toast notification with duration

#### Navigation Event Listener:

```javascript
window.addEventListener("navigateToPage", (e) => {
  if (e.detail.page === "orderManagement") {
    const order = orders.find((o) => o.orderCode === e.detail.orderCode);
    openOrderDetail(order);
  }
});
```

#### GAS Functions Called:

- `getOrders()`
- `getRooms()`
- `getProducts()`
- `getStaffs()`
- `updateOrder(orderData)`
- `completePayment(orderCode, paymentData)`
- `getOrderByCode(orderCode)`

---

## 🏨 Room Component

### **roomComponent.html**

**Chức năng:** Quản lý phòng karaoke (CRUD, status change)

#### Window Output:

```javascript
window.RoomPage = function RoomPage() { ... }
```

#### State:

```javascript
- rooms: [{ id, name, type, price_per_hour, status, start_time, current_order_id }, ...]
- orders: [{ ...order }, ...]
- statusFilter: "all" | "available" | "occupied" | "cleaning"
- typeFilter: "all" | "VIP" | "thường"

// Add room modal
- showAddModal: boolean
- addName: string
- addType: "thường" | "VIP"
- addPrice: string

// Edit room modal
- showEditModal: boolean
- editingRoom: object
- editName: string
- editType: string
- editPrice: string

// Delete confirmation
- showDeleteConfirm: boolean
- deletingId: string

// Status change confirmation
- showStatusConfirm: boolean
- targetRoom: object
- newStatus: string

// Room detail modal
- showRoomDetail: boolean
- selectedRoomDetail: object
- currentOrderDetail: object
```

#### Components:

1. **ElapsedTimer** - Display elapsed time
2. **StatusPill** - Display status badge (🟢 Trống, 🔴 Đang dùng, 🟡 Đang dọn)

#### Status:

```
- "available" → 🟢 Trống
- "occupied" → 🔴 Đang dùng (có khách đang sử dụng)
- "cleaning" → 🟡 Đang dọn
```

#### Key Functions:

1. **CRUD Operations:**
   - `handleAdd()` → POST `addRoom(newRoom)`
   - `handleUpdate()` → POST `updateRoom(patch)`
   - `executeDelete()` → POST `deleteRoom(id)`

2. **Status Management:**
   - `changeStatus(room)` → Open status change confirmation
   - `confirmChangeStatus()` → Toggle between "available" ↔️ "cleaning"
   - `updateRoomStatus(roomId, status)` → POST to GAS

3. **Filtering:**
   - `filteredRooms` → Filter by statusFilter + typeFilter

4. **Room Detail Modal:**
   - `openRoomDetail(room)` → Show room info + current order
   - Display: products used, staff, customer, total cost
   - Has button to navigate to order management for editing
   - Triggers: `window.dispatchEvent(new CustomEvent('navigateToPage', {...}))`

5. **Data Loading:**
   - `load()` → Fetch rooms + orders
   - Auto-refresh every 30 seconds
   - Manual refresh button

#### Room Data Structure:

```javascript
{
  id: number,
  name: string,
  type: "VIP" | "thường",
  price_per_hour: number,
  status: "available" | "occupied" | "cleaning",
  start_time: ISO string | null,
  current_order_id: string | null
}
```

#### GAS Functions Called:

- `getRooms()`
- `getOrders()`
- `addRoom(roomData)`
- `updateRoom(roomData)`
- `deleteRoom(id)`
- `updateRoomStatus(roomId, status)`

---

## 👥 Staff Component

### **staffComponent.html**

**Chức năng:** Quản lý tiếp viên (CRUD, status toggle)

#### Window Output:

```javascript
window.StaffPage = function StaffPage() { ... }
```

#### State:

```javascript
- staffs: [{ id, name, phone, status, price_per_hour, current_room_id }, ...]
- isLoading: boolean
- error: string

- name: string
- phone: string
- pricePerHour: string
- editingId: string | null

- showDeleteConfirm: boolean
- deletingId: string | null
```

#### Status:

```
- "available" → 🟢 Sẵn sàng
- "busy" → 🔴 Đang bận
```

#### Key Functions:

1. **CRUD Operations:**
   - `onAdd()` → POST `addStaff(newStaff)`
   - `onStartEdit(staff)` → Populate form with staff data
   - `onUpdate()` → POST `updateStaff(patch)`
   - `onDelete(id)` → POST `deleteStaff(id)` (optimistic delete)

2. **Status Management:**
   - `toggleStatus(staff)` → Toggle between "available" ↔️ "busy"
   - Calls: `releaseStaff(id)` or assignment function

3. **Form Validation:**
   - `canSubmit` → name.trim() !== "" && pricePerHour is valid

4. **Data Loading:**
   - `load()` → Fetch staffs on component mount

#### Staff Data Structure:

```javascript
{
  id: number,
  name: string,
  phone: string,
  status: "available" | "busy",
  price_per_hour: number,
  current_room_id: string | null
}
```

#### GAS Functions Called:

- `getStaffs()`
- `addStaff(staffData)`
- `updateStaff(staffData)`
- `deleteStaff(id)`
- `releaseStaff(staffId)`
- `assignStaffToRoom(staffId, roomId)` (if needed)

---

## 🛍️ Product Component

### **productComponent.html**

**Chức năng:** Quản lý hàng hoá / đồ uống (CRUD)

#### Window Output:

```javascript
window.ProductPage = function ProductPage() { ... }
```

#### State:

```javascript
- products: [{ id, name, unit, price }, ...]
- isLoading: boolean
- error: string

- showModal: boolean
- isEditing: boolean
- currentProduct: object | null

- name: string
- unit: string (default: "Cái")
- price: string

- searchTerm: string
- priceFilter: "all" | "<100k" | "100k-500k" | ">500k"

- showDeleteConfirm: boolean
- deletingId: string | null
```

#### Key Functions:

1. **CRUD Operations:**
   - `handleSave()` → POST `addProduct()` or `updateProduct()`
   - `executeDelete()` → POST `deleteProduct(id)`

2. **Forms:**
   - `openAddModal()` → Reset form, set isEditing = false
   - `openEditModal(product)` → Populate form, set isEditing = true
   - `closeModal()` → Close modal, reset form after 300ms

3. **Filtering:**
   - `filteredProducts` → Filter by searchTerm + priceFilter

4. **Validation:**
   - `canSubmit` → name.trim() !== "" && price is valid number

5. **Data Loading:**
   - `load()` → Fetch products on mount

#### Product Data Structure:

```javascript
{
  id: number,
  name: string,
  unit: string,
  price: number
}
```

#### GAS Functions Called:

- `getProducts()`
- `addProduct(productData)`
- `updateProduct(productData)`
- `deleteProduct(id)`

---

## 💳 Customer Component

### **customerManager.html**

**Chức năng:** Quản lý khách hàng quen (CRUD)

#### Window Output:

```javascript
window.CustomerPage = function CustomerPage() { ... }
```

#### State:

```javascript
- customers: [{ id, name, phone, discountPercent }, ...]
- isLoading: boolean
- error: string

- showModal: boolean
- isEditing: boolean
- currentCustomer: object | null

- name: string
- phone: string
- discount: string (%)

- searchTerm: string

- showDeleteConfirm: boolean
- deletingId: string | null
```

#### Key Functions:

1. **CRUD Operations:**
   - `handleSave()` → POST `addCustomer()` or `updateCustomer()`
   - `executeDelete()` → POST `deleteCustomer(id)`

2. **Forms:**
   - `openAddModal()` → Reset form, set isEditing = false
   - `openEditModal(customer)` → Populate form, set isEditing = true
   - `closeModal()` → Close modal, reset form

3. **Filtering:**
   - `filtered` → Search by name or phone

4. **Validation:**
   - `canSubmit` → name.trim() !== "" && discount 0-100% (or empty)

5. **Data Loading:**
   - `load()` → Fetch customers on mount

#### Customer Data Structure:

```javascript
{
  id: number,
  name: string,
  phone: string,
  discountPercent: number
}
```

#### GAS Functions Called:

- `getCustomers()`
- `addCustomer(customerData)`
- `updateCustomer(customerData)`
- `deleteCustomer(id)`

---

## 📑 Backend (Google Apps Script)

### **mã.js**

**Chức năng:** Backend logic, Google Sheets integration

#### Sheet Config:

```javascript
ACCOUNT_SHEET = "Tài khoản";
STAFF_SHEET = "Tiếp viên";
PRODUCT_SHEET = "Hàng hoá";
ROOM_SHEET = "Phòng";
ORDER_SHEET = "Đơn hàng";
CUSTOMER_SHEET = "Khách hàng";
LOG_SHEET = "Log";
```

#### Sheet Headers:

```javascript
SHEET_HEADERS = {
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
```

#### Column Mappings:

```javascript
LOG_COL = { DATETIME: 1, USER: 2, CHANGE: 3, STATUS: 4, ERROR: 5 }
ACCOUNT_COL = { ID: 1, USERNAME: 2, PASSWORD: 3, ROLE: 4, NAME: 5 }
STAFF_COL = { ID: 1, NAME: 2, PHONE: 3, STATUS: 4, ROOM_ID: 5, PRICE: 6 }
ROOM_COL = { ID: 1, NAME: 2, TYPE: 3, PRICE: 4, STATUS: 5, START_TIME: 6, CURRENT_ORDER_ID: 7 }
PRODUCT_COL = { ID: 1, NAME: 2, UNIT: 3, PRICE: 4 }
CUSTOMER_COL = { ID: 1, NAME: 2, PHONE: 3, DISCOUNT_PERCENT: 4 }
ORDER_COL = { ORDER_CODE: 1, ... } // needs to be read from file for full mapping
```

#### Expected Functions (to be called from React components):

```javascript
// Auth
-login(username, password) -
  logout() -
  // Room
  getRooms() -
  addRoom(roomData) -
  updateRoom(roomData) -
  deleteRoom(id) -
  updateRoomStatus(roomId, status) -
  // Staff
  getStaffs() -
  addStaff(staffData) -
  updateStaff(staffData) -
  deleteStaff(id) -
  releaseStaff(staffId) -
  assignStaffToRoom(staffId, roomId) -
  // Product
  getProducts() -
  addProduct(productData) -
  updateProduct(productData) -
  deleteProduct(id) -
  // Customer
  getCustomers() -
  addCustomer(customerData) -
  updateCustomer(customerData) -
  deleteCustomer(id) -
  // Order
  createOrder(orderData) -
  getOrders() -
  updateOrder(orderData) -
  completePayment(orderCode, paymentData) -
  getOrderByCode(orderCode) -
  // Dashboard
  getRoomStatistics() -
  getStaffStatistics() -
  getTotalStaffCount();
```

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│           LOGIN (index.html + login.html)           │
│  AuthServer.login() → localStorage.setItem('authUser')
└────────────────┬────────────────────────────────────┘
                 │
        ┌────────▼──────────┐
        │ MainApp Router    │
        │ (URL-based nav)   │
        └────┬──┬──┬──┬──┬──┬──────────┘
            │  │  │  │  │  │
     ┌──────▼──▼──▼──▼──▼──▼──────────┐
     │     Dashboard (admin)           │
     │     CreateOrder (staff+admin)   │
     │     OrderManagement             │
     │     Room, Staff, Product        │
     │     Customer                    │
     └────────────┬────────────────────┘
                  │
        ┌─────────▼─────────┐
        │  Google Apps      │
        │  Script (mã.js)   │
        │                   │
        │ ↓ Read/Write      │
        │                   │
        │ Google Sheets:    │
        │ - Tài khoản       │
        │ - Tiếp viên       │
        │ - Hàng hoá        │
        │ - Phòng           │
        │ - Đơn hàng        │
        │ - Khách hàng      │
        │ - Log             │
        └───────────────────┘
```

---

## 📊 Database Schema (Google Sheets)

### **Tài khoản** Sheet

| ID  | Tài khoản | Mật khẩu | Role  | Tên           |
| --- | --------- | -------- | ----- | ------------- |
| 1   | admin     | admin123 | admin | Quản trị viên |
| 2   | staff     | 123456   | staff | Nhân viên     |

### **Tiếp viên** Sheet

| ID  | Tên   | SĐT     | Trạng thái | RoomID | Giá/giờ |
| --- | ----- | ------- | ---------- | ------ | ------- |
| 1   | Thanh | 0912345 | available  |        | 120000  |
| ... | ...   | ...     | ...        | ...    | ...     |

### **Hàng hoá** Sheet

| ID  | Tên       | Đơn vị | Giá   | Số lượng |
| --- | --------- | ------ | ----- | -------- |
| 1   | Bia Tiger | Lon    | 20000 | 100      |
| ... | ...       | ...    | ...   | ...      |

### **Phòng** Sheet

| ID  | Tên phòng | Loại | Giá/giờ | Trạng thái | Thời gian bắt đầu | Order ID hiện tại |
| --- | --------- | ---- | ------- | ---------- | ----------------- | ----------------- |
| 101 | Phòng 101 | VIP  | 300000  | available  |                   |                   |
| ... | ...       | ...  | ...     | ...        | ...               | ...               |

### **Khách hàng** Sheet

| ID  | Tên khách    | SĐT     | % Giảm giá |
| --- | ------------ | ------- | ---------- |
| 1   | Nguyễn Văn A | 0988888 | 10         |
| ... | ...          | ...     | ...        |

### **Đơn hàng** Sheet (Complex)

| Mã HĐ | Tên hoá đơn | Khách hàng | Giờ bắt đầu | Giờ kết thúc | Thời gian sử dụng | Hoá đơn | Tổng tiền dịch vụ | Tổng tiền giờ | Giảm theo KH | Tăng giảm trực tiếp | Hàng hoá | Tiếp viên | RoomId | Tổng thanh toán | Thanh toán ngân hàng | Thanh toán tiền mặt | Trạng thái thanh toán | Ghi chú | Ngày tạo |
| ----- | ----------- | ---------- | ----------- | ------------ | ----------------- | ------- | ----------------- | ------------- | ------------ | ------------------- | -------- | --------- | ------ | --------------- | -------------------- | ------------------- | --------------------- | ------- | -------- |
| ...   | ...         | ...        | ...         | ...          | ...               | ...     | ...               | ...           | ...          | ...                 | JSON     | JSON      | ...    | ...             | ...                  | ...                 | ...                   | ...     | ...      |

### **Log** Sheet

| Ngày giờ | Người dùng | Thay đổi | Trạng thái | Thông báo lỗi |
| -------- | ---------- | -------- | ---------- | ------------- |
| ...      | ...        | ...      | ...        | ...           |

---

## 🔗 Function Dependency Map

```
login.html → AuthServer.login()
index.html → AuthContext, MainApp, Navigation

dashboardComponent.html
  ├── getRoomStatistics()
  └── getStaffStatistics()

createOrderComponent.html
  ├── getRooms()
  ├── getProducts()
  ├── getStaffs()
  ├── getCustomers()
  └── createOrder(orderData)

orderManagement.html
  ├── getOrders()
  ├── getRooms()
  ├── getProducts()
  ├── getStaffs()
  ├── getOrderByCode(orderCode)
  ├── updateOrder(orderData)
  └── completePayment(orderCode, paymentData)

roomComponent.html
  ├── getRooms()
  ├── getOrders()
  ├── addRoom(roomData)
  ├── updateRoom(roomData)
  ├── deleteRoom(id)
  └── updateRoomStatus(roomId, status)

staffComponent.html
  ├── getStaffs()
  ├── addStaff(staffData)
  ├── updateStaff(staffData)
  ├── deleteStaff(id)
  ├── releaseStaff(staffId)
  └── assignStaffToRoom(staffId, roomId)

productComponent.html
  ├── getProducts()
  ├── addProduct(productData)
  ├── updateProduct(productData)
  └── deleteProduct(id)

customerManager.html
  ├── getCustomers()
  ├── addCustomer(customerData)
  ├── updateCustomer(customerData)
  └── deleteCustomer(id)
```

---

## 🎯 Common Issues & Solutions

### Local Testing

- `AuthServer.isLocal` checks if Google Apps Script is available
- Localhost mode: Returns mock data, skips GAS calls
- Credentials: admin/admin123 or staff/123456

### Real-time Updates

- Room component: Auto-refresh every 30 seconds
- Order management: Auto-load every 30 seconds
- ElapsedTimer: Updates every 1 second

### Modal Management

- Close modal → Reset form after 300ms timeout (avoid flickering)
- Delete confirmation → Optimistic delete (remove from UI first)

### Session Management

- Session expires after 24 hours
- Session checked every 60 seconds
- localStorage key: "authUser"

---

## ✅ Quick Reference: What Gets Called Where

| Trang                | Get                                            | Create        | Update                           | Delete           | Status                    |
| -------------------- | ---------------------------------------------- | ------------- | -------------------------------- | ---------------- | ------------------------- |
| **Dashboard**        | getRoomStatistics, getStaffStatistics          | -             | -                                | -                | -                         |
| **Create Order**     | getRooms, getProducts, getStaffs, getCustomers | ✓ createOrder | -                                | -                | -                         |
| **Order Management** | getOrders, getRooms, getProducts, getStaffs    | -             | ✓ updateOrder, ✓ completePayment | -                | ✓ Payment                 |
| **Room**             | getRooms, getOrders                            | ✓ addRoom     | ✓ updateRoom                     | ✓ deleteRoom     | ✓ updateRoomStatus        |
| **Staff**            | getStaffs                                      | ✓ addStaff    | ✓ updateStaff                    | ✓ deleteStaff    | ✓ Toggle (busy/available) |
| **Product**          | getProducts                                    | ✓ addProduct  | ✓ updateProduct                  | ✓ deleteProduct  | -                         |
| **Customer**         | getCustomers                                   | ✓ addCustomer | ✓ updateCustomer                 | ✓ deleteCustomer | -                         |

---

## 📝 Notes for Future Maintenance

1. **When modifying field names:** Update both React state and GAS sheet headers
2. **When adding new features:** Remember to call the corresponding GAS function
3. **Session timeout:** 24 hours - update `SESSION_EXPIRY_MS` if needed
4. **Auto-refresh rate:** Most pages refresh every 30 seconds - modify intervals if needed
5. **Local testing:** Keep `isLocal` checks for easier development
6. **Error handling:** Always wrap GAS calls in try-catch or use withFailureHandler
