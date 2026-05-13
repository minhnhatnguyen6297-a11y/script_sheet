# Ke hoach tiep tuc: hen gio, nhac viec va lich su trang thai

## Hien trang project

- Project la Google Apps Script cho Google Sheet quan ly khach hang va sidebar tra cuu lich su khach hang.
- File chinh:
  - `danh_sach_kh_v4.gs`: logic dong bo, tao `DANH_SACH_KHACH`, sidebar state, profiler.
  - `SidebarTraCuu.html`: giao dien sidebar tra cuu lich su theo ten khach hang.
  - `Bieu do flow cong viec.html`: flow nghiep vu ve nop ho so, thue, tra ho so, dinh chinh, cap so.
  - `tests/perf-profiler.test.js`: static tests de dam bao Apps Script va sidebar JavaScript van parse duoc, dong thoi khoa mot so rang buoc hieu nang.
- `DANH_SACH_KHACH` la raw index dong goc phuc vu tra cuu. Sheet nay dang bi `clear()` va ghi lai khi chay dong bo, nen khong duoc luu du lieu nghiep vu hen gio/nhac viec truc tiep vao day.
- `NGUON_DU_LIEU` cau hinh cac Google Sheet nguon ben ngoai. Cac nguon ngoai hien chi nen duoc quet de tra cuu, khong nen bi sua/xoa dong trong v1.

## Quyet dinh da chot

- Tao sheet nghiep vu moi: `DANH_SACH_CHUNG`.
- Khong tao them vung nhap lieu hoac thao tac moi cho user; user van lam viec ngay tren dong khach hang trong sheet.
- Them/chuẩn hóa 3 cot nhap lieu:
  - `Hẹn giờ`: chi quan ly theo ngay, dung popup lich mac dinh cua Google Sheets.
  - `Công việc hẹn giờ`: dropdown chuan theo dau viec trong flow.
  - `Trạng thái hồ sơ`: dropdown chuan de ghi lich su trang thai.
- Khi user nhap du `Hẹn giờ` + `Công việc hẹn giờ`, script tu tao/cap nhat ban ghi trong `DANH_SACH_CHUNG`.
- Neu dong goc nam o sheet du lieu trong file hien tai va da ghi thanh cong sang `DANH_SACH_CHUNG`, xoa dong do khoi sheet hien tai; chi luu cong viec can theo doi o `DANH_SACH_CHUNG`.
- Lich su can luu tuyen tinh theo thao tac doi `Trạng thái hồ sơ`, gom trang thai va ngay doi trang thai.
- Hien thi lich su chinh trong sidebar dang co bang timeline, khong nhét lich su dai vao mot o.
- Bao viec v1 la bao truc quan bang danh sach, phan loai va mau hang trong sheet; chua them email/popup thong bao rieng.

## Flow nghiep vu can ho tro

Flow trong file HTML gom cac buoc/moc chinh:

- `Nộp hồ sơ chính`
- `Có thông báo nộp thuế`
- `Báo khách nộp thuế`
- `Đã nộp thuế`
- `Có Sổ đỏ`
- `Trả hồ sơ`
- `Đã soạn thủ tục đính chính`
- `Đã nộp hồ sơ đính chính`
- `Đã đính chính xong`
- `Đã trả hồ sơ cho khách`
- `Quay lại bước nộp hồ sơ chính`

Moc thoi gian trong flow:

- 15 ngay tu nop ho so den duyet/tra ho so.
- 10 ngay de khach nop tien.
- 10 ngay de soan ho so dinh chinh.
- 7 ngay, 15 ngay, 1 thang, 3 thang hoac user tuy chon cho giai doan doi cap so.
- 3 ngay de di nop ho so dinh chinh.
- 7 ngay de dinh chinh thanh cong.

## Thiet ke du lieu

Them cau hinh trong Apps Script:

- `SHEET_CONG_VIEC: "DANH_SACH_CHUNG"`.
- `WORKFLOW_INPUT_HEADERS`: `["Hẹn giờ", "Công việc hẹn giờ", "Trạng thái hồ sơ"]`.
- Danh muc `Công việc hẹn giờ` dang dropdown:
  - `Báo khách nộp thuế`
  - `Theo dõi khách nộp tiền`
  - `Đợi cấp sổ đỏ`
  - `Soạn hồ sơ đính chính`
  - `Đi nộp hồ sơ đính chính`
  - `Theo dõi đính chính xong`
  - `Trả hồ sơ cho khách`
  - `Quay lại nộp hồ sơ chính`
- Danh muc `Trạng thái hồ sơ` dang dropdown:
  - `Nộp hồ sơ chính`
  - `Có thông báo nộp thuế`
  - `Đã nộp thuế`
  - `Có Sổ đỏ`
  - `Trả hồ sơ`
  - `Đã soạn đính chính`
  - `Đã nộp hồ sơ đính chính`
  - `Đã đính chính xong`
  - `Đã trả hồ sơ cho khách`

`DANH_SACH_CHUNG` nen co cac cot toi thieu:

- `Tên tra cứu`
- `Tên khách hàng`
- `SĐT`
- `Loại hồ sơ`
- `Địa chỉ đất`
- `Hẹn giờ`
- `Công việc hẹn giờ`
- `Trạng thái hồ sơ`
- `Ngày đổi trạng thái`
- `Ngày bắt đầu hạn`
- `Thời hạn quy định`
- `% hạn`
- `File nguồn`
- `Sheet nguồn`
- `Dòng nguồn`

## Xu ly tu dong trong Apps Script

- Them `onEdit(e)` de xu ly khi user sua 1 trong 3 cot workflow.
- Neu sheet hien tai la sheet he thong (`DANH_SACH_KHACH`, `NGUON_DU_LIEU`, `QLKH_PERF_LOG`) thi bo qua.
- Neu sheet hien tai la `DANH_SACH_CHUNG`:
  - Cho phep user cap nhat tiep `Hẹn giờ`, `Công việc hẹn giờ`, `Trạng thái hồ sơ`.
  - Khi doi `Trạng thái hồ sơ`, cap nhat `Ngày đổi trạng thái` va them mot ban ghi lich su tuyen tinh neu can giu lich su nhieu lan.
  - Khi doi `Hẹn giờ` hoac `Công việc hẹn giờ`, reset `Ngày bắt đầu hạn` ve ngay hien tai va tinh lai mau hang.
- Neu sheet hien tai la sheet du lieu trong file hien tai:
  - Dam bao co 3 cot workflow neu thieu.
  - Ap validation cho 3 cot.
  - Khi co du `Hẹn giờ` va `Công việc hẹn giờ`, copy thong tin dong sang `DANH_SACH_CHUNG`.
  - Sau khi ghi thanh cong, xoa dong nguon trong sheet hien tai.
- Khong sua/xoa dong trong cac spreadsheet ngoai cau hinh qua `NGUON_DU_LIEU` trong v1.

## Mau hang theo tien do han

Mau hang trong `DANH_SACH_CHUNG` doi dan tu xanh la den do dam theo ty le thoi han da troi qua.

- `Ngày bắt đầu hạn`: ngay tao ban ghi hoac ngay user doi dau viec/hen gio.
- `Thời hạn quy định`: so ngay tu `Ngày bắt đầu hạn` den `Hẹn giờ`, toi thieu 1 ngay.
- `% hạn`: so ngay da qua / `Thời hạn quy định`.
- Bac mau moi 50%, toi da den 500%:
  - 0%: xanh la, ho so moi chuyen buoc.
  - 50%: vang.
  - 100%: cam, den han.
  - 150% den 450%: chuyen dan cam do sang do dam.
  - >= 500%: do dam co dinh.
- Cap nhat mau khi:
  - Mo file.
  - Sua dong trong workflow.
  - Chay dong bo/setup.
  - Chay menu bao tri neu them menu `Cập nhật màu nhắc việc`.

## Sidebar timeline

- Giu bang tra cuu lich su hien tai.
- Bo sung mot khoi timeline trong `SidebarTraCuu.html` khi chon ten khach hang.
- Timeline doc tu `DANH_SACH_CHUNG`, loc theo `Tên tra cứu`, sap xep theo `Ngày đổi trạng thái` hoac `Ngày bắt đầu hạn`.
- Hien thi dang tuyen tinh:
  - `Nộp hồ sơ chính (01/01/2026)`
  - `Trả hồ sơ (15/01/2026)`
  - `Đã soạn đính chính (...)`
  - `Trả hồ sơ (...)`
- Neu khong co lich su trong `DANH_SACH_CHUNG`, sidebar van hien bang lich su cu tu `DANH_SACH_KHACH`.

## Test va nghiem thu

Can cap nhat/bo sung test:

- Apps Script va sidebar JavaScript van parse duoc bang `new Function`.
- Co cau hinh `SHEET_CONG_VIEC: "DANH_SACH_CHUNG"`.
- `laSheetLoaiTru_` loai tru sheet moi de khong bi quet vao raw index.
- Co data validation date cho `Hẹn giờ`.
- Co dropdown cho `Công việc hẹn giờ` va `Trạng thái hồ sơ`.
- Co logic tinh mau theo cac moc 0%, 50%, 100%, 150%, 500%.
- Sidebar co timeline va van giu bang tra cuu cu.

Nghiem thu thu cong trong Google Sheets:

- Nhap thieu mot trong hai truong `Hẹn giờ` hoac `Công việc hẹn giờ` thi chua chuyen dong.
- Nhap du hai truong thi ban ghi xuat hien o `DANH_SACH_CHUNG` va dong nguon bi xoa.
- Doi `Trạng thái hồ sơ` thi lich su ghi dung trang thai va ngay doi.
- Cac hang trong `DANH_SACH_CHUNG` doi mau dung theo tien do han.
- Chon ten khach trong sheet thi sidebar hien timeline dung thu tu.

## Viec da lam ve git

Plan nay duoc luu de tiep tuc trien khai sau. Repo can duoc khoi tao va push len:

- Remote: `https://github.com/minhnhatnguyen6297-a11y/script_sheet.git`
- Branch chinh: `main`
- Commit khoi tao: `Initial script sheet project`
