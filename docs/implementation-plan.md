# Ke hoach trien khai: hen viec, tien do va canh bao ho so

## Muc tieu

- Sidebar la noi thao tac chinh: tra cuu, hen viec, chuyen buoc, xem canh bao.
- Sheet thang la noi luu task chinh: task nam ngay tren dong ho so, sau cac cot nghiep vu dang co.
- `DANH_SACH_KHACH` chi la index tra cuu rebuild duoc, khong phai noi user sua task.
- Khong dung `DANH_SACH_CHUNG`/`QLKH` lam sheet task user phai nhin; neu con sheet cu thi script bo qua va an khi dung workflow.
- Moi task dang theo doi co mau rieng theo tien do. Task da xong/chuyen buoc co dau `✓` va nen trang.
- Co tab canh bao de biet hom nay/tuan nay co bao nhieu task moi chuyen cam/do va danh sach can xu ly truoc.

## Nguyen tac du lieu

- Du lieu goc chi co mot noi: sheet thang.
- Sheet tong hop/index phai rebuild duoc bat cu luc nao.
- Sidebar khong tu y luu task vao nhieu sheet.
- Moi thao tac ghi task di qua `saveWorkflowTask`.
- `getWorkflowSidebarData` chi doc dong dang chon; khong quet/cap nhat mau toan bo nam khi mo sidebar/tab hen viec.
- Quet danh sach lon phai doc/ghi theo block bang `getValues`/`getDisplayValues`/`setValues`, khong doc tung o trong vong lap.
- Du lieu sidebar can tim kiem thi nap mot lan vao browser; du lieu task can chinh xac thi doc lai tu dong goc tren sheet thang.

## Ten buoc chuan

| Ma | Ten hien thi |
| --- | --- |
| `NOP_HS` | Nộp HS |
| `TB_THUE` | TB thuế |
| `DA_NOP_THUE` | Đã nộp thuế |
| `CO_SO` | Có sổ |
| `TRA_HS` | Trả HS |
| `DINH_CHINH` | Đính chính |
| `NOP_DC` | Nộp ĐC |
| `DC_XONG` | ĐC xong |
| `PHAT_SINH` | Phát sinh |

Bo buoc `Trả hồ sơ cho khách` sau khi `Có sổ`.

## Cau truc sheet

Sheet thang giu cac cot nghiep vu hien co, vi du:

```text
Ngày nhận hồ sơ | Tên khách hàng | Địa chỉ | SĐT | Loại hồ sơ | Yêu Cầu | Trạng thái | Thù Lao | Người làm hồ sơ | Người nhận uỷ quyền | Ngày nộp HS | Mã HS | Ghi chú
```

Tu cot tiep theo tro di la lich su/task ngang:

```text
Bản ghi 1 | Bản ghi 2 | Bản ghi 3 | ...
```

Moi o task ghi ngan, du de script parse va to mau:

```text
NOP_HS 01/01-07/01
TB_THUE 07/01-08/01
PHAT_SINH Gọi giấy 14/05-17/05
✓ NOP_HS 01/01-07/01
```

Quy uoc:

- Khong co `✓`: task dang theo doi, co mau.
- Co `✓`: task da xong/chuyen buoc, nen trang.
- User co the sua/xoa truc tiep tung o task ngay tren sheet thang neu nhap nham.

## Rule thoi han

Luong chinh dung tong thoi gian: `15 ngày`, `1 tháng`, `3 tháng`, hoac so ngay tuy chon.

Chia theo ty le:

| Buoc active | Y nghia | Ty le |
| --- | --- | --- |
| `NOP_HS` | Nộp HS -> TB thuế | 40% |
| `TB_THUE` | TB thuế -> Đã nộp thuế | 5% |
| `DA_NOP_THUE` | Đã nộp thuế -> Có sổ | 55% |

Tinh bang moc cong don de tong luon khop:

- Moc 1 = round(tong ngay * 40%).
- Moc 2 = round(tong ngay * 45%).
- Moc 3 = tong ngay.
- Duration tung buoc = chenh lech giua cac moc, toi thieu 1 ngay neu tong ngay du lon.

Vi du goi `15 ngày`:

- `NOP_HS`: 6 ngay.
- `TB_THUE`: 1 ngay.
- `DA_NOP_THUE`: 8 ngay.

Luong tra ho so/dinh chinh dung han cung:

- `DINH_CHINH`: 10 ngay.
- `NOP_DC`: 3 ngay.
- `DC_XONG`: 7 ngay.
- `TRA_HS` la moc lich su; khi chon `Trả HS`, he thong ghi moc `TRA_HS` va tao task `DINH_CHINH`.

## Mau tien do tung o task

Tinh theo ngay bat dau/ket thuc trong tung o task:

- 0-24%: xanh.
- 25-49%: vang.
- 50-99%: cam.
- >=100%: do.
- Sau han: do dam dan moi 50%, toi da 500%.

Vi du `NOP_HS` goi 15 ngay co 6 ngay. Den ngay thu 3 la 50%, o chuyen cam.

## Sidebar

Them tab vao sidebar hien co:

### Tra cuu

- Giu bang tra cuu hien tai tu `DANH_SACH_KHACH`.
- Hien timeline lich su/task doc tu dong ho so trong sheet thang dang chon.
- Co nut `Mở dòng` de nhay toi dong ho so trong sheet thang.

### Hen viec

- Hien khach dang chon.
- Che do `Chuyển bước`: chon buoc chuan, chon/giu goi thoi han.
- Che do `Phát sinh`: nhap noi dung ngan va chon ngay hen.
- Bam `Lưu` moi ghi sheet.
- Khi chuyen buoc, task active truoc do duoc them `✓` va nen trang; task moi ghi vao o trong ke tiep.

### Canh bao

- Hien so luong hom nay/tuan nay moi chuyen cam/do.
- Hien danh sach uu tien:
  - Do qua han lau nhat.
  - Do moi den han.
  - Cam moi chuyen.
  - Cam cu chua xu ly.
- Moi dong co nut `Mở dòng`.

## Sheet log canh bao

Tao sheet ky thuat `CANH_BAO_HAN` voi cac cot:

```text
Ngày ghi nhận | Sheet nguồn | Tên khách | Bước | Mốc cũ | Mốc mới | Ô task | Ngày bắt đầu | Ngày kết thúc
```

Moi lan task doi moc canh bao thi ghi log de tinh hom nay/tuan nay moi chuyen cam/do.

## Cap nhat va pham vi

- Khi mo sidebar: cap nhat mau va canh bao.
- Khi mo tab hen viec: chi doc dong ho so dang chon.
- Khi bam `Lưu` hen viec/chuyen buoc: ghi task vao dong ho so cua sheet thang va cap nhat mau ngay dong do.
- Them menu `Cập nhật cảnh báo` de cap nhat mau/log canh bao toan bo file khi can.
- Khi dong bo `DANH_SACH_KHACH`, chi giu cac cot nghiep vu can tra cuu. Bo qua cot rong, cot sinh tu dong dang `Column ...`/`Cot ...`, cot ke toan `Ngày`/`Thu`/`Chi`, cot phu nhu `ngày dự kiến sang thuế`, va duplicate nhu `Ghi chú (2)`.
- V1 khong gui email/popup nhac viec.
- V1 khong tao dashboard phuc tap.
- V1 khong ep user nhap hen viec truc tiep trong o sheet; thao tac tao task nam trong sidebar, con viec sua/xoa task nhap nham co the lam truc tiep tren o task cua sheet thang.
