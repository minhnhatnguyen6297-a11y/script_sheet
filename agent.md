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
- Du lieu nguon ngoai duoc cau hinh qua `NGUON_DU_LIEU`.
- Sheet log/do toc do chi phuc vu chan doan, khong duoc xem la nguon du lieu khach hang.

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
