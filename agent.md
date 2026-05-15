# Dinh huong du an Script Sheet

Du an la Google Apps Script cho Google Sheet quan ly khach hang va tra cuu lich su khach hang qua sidebar.

## Lien ket lam viec

- Repo GitHub: https://github.com/minhnhatnguyen6297-a11y/script_sheet.git
- Google Sheet hien tai: https://docs.google.com/spreadsheets/d/10njV-woq_3pVHDpWiStFyhDVIUv4BWDV7KrWf3OzL4I/edit?gid=1003165902#gid=1003165902
- Chrome debug endpoint: http://127.0.0.1:9223
  - Chi dung duoc sau khi mo Chrome voi `--remote-debugging-port=9223`.

## Nguyen tac du lieu

- Không tóm tắt/gộp mất dữ liệu.
- `DANH_SACH_KHACH` la raw index dong goc: moi dong trong sheet nguon hop le duoc ghi thanh mot dong index rieng.
- Task/hen viec duoc luu ngay tren dong ho so cua sheet thang, trong cac cot `Ban ghi ...`; khong luu vao `DANH_SACH_CHUNG`/`QLKH`.
- Du lieu goc chi co mot noi: sheet thang. Moi sheet tong hop/index phai rebuild duoc bat cu luc nao.
- Sidebar khong tu y ghi du lieu vao nhieu sheet. Moi thao tac ghi task di qua `saveWorkflowTask`.
- `getWorkflowSidebarData` chi doc du lieu dong dang chon, khong quet/cap nhat mau toan bo cac sheet thang.
- Doc danh sach lon phai dung batch `getValues`/`getDisplayValues`; khong doc tung o trong vong lap.
- Du lieu can tim kiem trong sidebar thi nap mot lan vao browser; du lieu can chinh xac tuyet doi thi doc lai tu dong goc.
- Du lieu nguon ngoai duoc cau hinh qua `NGUON_DU_LIEU`.
- Sheet log/do toc do chi phuc vu chan doan, khong duoc xem la nguon du lieu khach hang.
- `onOpen()` chi tao menu `Quan ly KH`, khong dong bo, khong quet han, khong mo sidebar.
- Trigger tu dong do `caiTriggerTuDong` quan ly: installable onOpen chi tao menu, trigger hang ngay chi cap nhat mau/canh bao han.

## Nguyen tac sidebar

- Sidebar chi hien bang tra cuu lich su khach hang.
- Khong chon khach thay user.
- Khong dien so dien thoai.
- Khong danh dau khach moi.
- Sidebar nap `DANH_SACH_KHACH` mot lan khi mo, sau do loc trong browser theo `Tên tra cứu`.

## Nguyen tac hieu nang

- Luon do baseline truoc khi toi uu hieu nang.
- Tach ro bottleneck theo nhom: dong bo, doc file ngoai, nap index, build map client-side, polling state, selection trigger, render bang.
- Chi toi uu sau khi co so do trong `QLKH_PERF_LOG`.
