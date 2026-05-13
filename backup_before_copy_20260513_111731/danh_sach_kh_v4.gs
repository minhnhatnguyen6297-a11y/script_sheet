/*****************************************************************************
 * DANH_SACH_KHACH RAW INDEX + FAST LOOKUP SIDEBAR
 * - DANH_SACH_KHACH la index dong goc, khong tom tat/gop mat du lieu.
 * - Sidebar tra cuu bang onSelectionChange(e) tren cot Ten khach hang.
 *****************************************************************************/

const CONFIG = {
  HEADER_ROW: 1,
  SHEET_DS: "DANH_SACH_KHACH",
  SHEET_NGUON: "NGUON_DU_LIEU",
  HEADERS_NGUON: ["Tên nguồn", "URL hoặc ID Google Sheet", "Bật/Tắt"],
  TECH_HEADERS: ["Tên tra cứu", "Tên gốc", "File nguồn", "Sheet nguồn", "Dòng nguồn"],
  HEADERS: {
    ten: {
      bat_buoc: true,
      bien_the: [
        "tên khách hàng",
        "tên khách",
        "ten khach hang",
        "ten khach",
        "họ tên",
        "ho ten",
        "tên kh",
        "ten kh",
        "khách hàng"
      ]
    },
    ngay: {
      bat_buoc: false,
      bien_the: ["ngày nhận hồ sơ", "ngày nhận", "ngay nhan", "ngày", "ngay"]
    },
    sdt: {
      bat_buoc: false,
      bien_the: ["sđt", "sdt", "số điện thoại", "so dien thoai", "phone", "điện thoại", "dien thoai"]
    },
    loaiHS: {
      bat_buoc: false,
      bien_the: ["loại hồ sơ", "loại hs", "loai ho so", "loai hs", "loại"]
    },
    dcDat: {
      bat_buoc: false,
      bien_the: ["địa chỉ đất", "dia chi dat", "địa chỉ tài sản", "thửa đất", "địa chỉ", "dia chi"]
    }
  }
};

const REALTIME_CONFIG = {
  STATE_KEY: "QLKH_LOOKUP_STATE_V1",
  TRIGGER_OPEN: "moSidebarRealtimeKhiMoFile_",
  TRIGGER_EDIT: "batEditRealtime_",
  SIDEBAR_FILE: "SidebarTraCuu",
  STATE_TTL_MS: 2 * 60 * 60 * 1000,
  MAX_RESULTS: 100
};

// =============== MENU ===============
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Quản lý KH")
    .addItem("⚙️ Bật tự mở sidebar", "batRealtimeSidebar")
    .addItem("📌 Mở sidebar tra cứu", "moSidebarRealtime")
    .addSeparator()
    .addItem("🔄 Đồng bộ DANH_SACH_KHACH", "dongBoDanhSachKH")
    .addItem("🔍 Xem sheet & cột được phát hiện", "xemPhatHien")
    .addToUi();
}

// =============== HAM CHINH ===============
function dongBoDanhSachKH() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const t0 = Date.now();

  const ketQua = taoDanhSachKhachIndex_(ss);
  ghiSheetDanhSach_(ss, ketQua.records, ketQua.headers);
  luuRealtimeState_({
    status: "idle",
    message: "Đã đồng bộ DANH_SACH_KHACH. Chọn một ô Tên khách hàng để tra cứu.",
    timestamp: Date.now()
  });

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  let msg = "Ghi " + ketQua.records.length + " dòng gốc vào DANH_SACH_KHACH\n";
  msg += "Nguồn đã quét: " + ketQua.sourcesScanned + "\n";
  msg += "Thời gian: " + elapsed + "s";
  if (ketQua.errors.length) {
    msg += "\n\nNguồn bị bỏ qua:\n- " + ketQua.errors.join("\n- ");
  }

  ui.alert("✅ Đồng bộ xong", msg, ui.ButtonSet.OK);
}

function taoDanhSachKhachIndex_(ss) {
  const allHeaders = new Map();
  const records = [];
  const errors = [];
  const sources = layTatCaNguonDuLieu_(ss, errors);

  sources.forEach(function (source) {
    try {
      thuThapDongGocTuSpreadsheet_(source, allHeaders, records);
    } catch (err) {
      errors.push(source.name + ": " + layThongBaoLoi_(err));
    }
  });

  records.sort(function (a, b) {
    const byName = a.tenKey.localeCompare(b.tenKey, "vi");
    if (byName !== 0) return byName;
    const byFile = a.fileName.localeCompare(b.fileName, "vi");
    if (byFile !== 0) return byFile;
    const bySheet = a.sheetName.localeCompare(b.sheetName, "vi");
    if (bySheet !== 0) return bySheet;
    return a.rowNum - b.rowNum;
  });

  return {
    records: records,
    headers: Array.from(allHeaders.values()),
    errors: errors,
    sourcesScanned: sources.length
  };
}

function layTatCaNguonDuLieu_(ss, errors) {
  const sources = [{
    id: ss.getId(),
    name: ss.getName(),
    spreadsheet: ss
  }];

  const sh = damBaoSheetNguonDuLieu_(ss);
  const lastRow = sh.getLastRow();
  if (lastRow <= CONFIG.HEADER_ROW) return sources;

  const values = sh.getRange(CONFIG.HEADER_ROW + 1, 1, lastRow - CONFIG.HEADER_ROW, CONFIG.HEADERS_NGUON.length).getDisplayValues();
  values.forEach(function (row, idx) {
    const tenNguon = cleanCellText_(row[0]);
    const rawId = cleanCellText_(row[1]);
    const enabled = laGiaTriBat_(row[2]);
    if (!rawId || !enabled) return;

    const id = trichXuatSpreadsheetId_(rawId);
    const label = tenNguon || ("Nguồn dòng " + (idx + CONFIG.HEADER_ROW + 1));
    if (!id) {
      errors.push(label + ": không tách được ID Google Sheet");
      return;
    }
    if (id === ss.getId()) return;

    try {
      const external = SpreadsheetApp.openById(id);
      sources.push({
        id: id,
        name: tenNguon || external.getName(),
        spreadsheet: external
      });
    } catch (err) {
      errors.push(label + ": " + layThongBaoLoi_(err));
    }
  });

  return sources;
}

function damBaoSheetNguonDuLieu_(ss) {
  let sh = ss.getSheetByName(CONFIG.SHEET_NGUON);
  if (!sh) {
    sh = ss.insertSheet(CONFIG.SHEET_NGUON);
  }

  sh.getRange(1, 1, 1, CONFIG.HEADERS_NGUON.length)
    .setValues([CONFIG.HEADERS_NGUON])
    .setFontWeight("bold")
    .setBackground("#fbbc04")
    .setHorizontalAlignment("center");
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 180);
  sh.setColumnWidth(2, 360);
  sh.setColumnWidth(3, 90);

  return sh;
}

function thuThapDongGocTuSpreadsheet_(source, allHeaders, records) {
  const sheets = source.spreadsheet.getSheets();
  sheets.forEach(function (sh) {
    const sheetName = sh.getName();
    if (laSheetLoaiTru_(sheetName)) return;
    if (sh.isSheetHidden()) return;
    if (sh.getLastRow() <= CONFIG.HEADER_ROW || sh.getLastColumn() === 0) return;

    const colMap = timColTheoHeader_(sh);
    if (!laSheetDuLieuTraCuu_(colMap)) return;

    const lastCol = sh.getLastColumn();
    const headerRow = sh.getRange(CONFIG.HEADER_ROW, 1, 1, lastCol).getDisplayValues()[0];
    const descriptors = taoHeaderDescriptors_(headerRow);
    descriptors.forEach(function (descriptor) {
      if (!allHeaders.has(descriptor.key)) {
        allHeaders.set(descriptor.key, descriptor);
      }
    });

    const numRows = sh.getLastRow() - CONFIG.HEADER_ROW;
    const rows = sh.getRange(CONFIG.HEADER_ROW + 1, 1, numRows, lastCol).getDisplayValues();
    rows.forEach(function (row, idx) {
      const tenGoc = cleanCellText_(row[colMap.ten - 1]);
      if (!tenGoc || laDongMau_(tenGoc)) return;

      const tenKey = chuanHoaTimKiem_(tenGoc, true);
      if (!tenKey) return;

      const valuesByKey = {};
      descriptors.forEach(function (descriptor, colIdx) {
        valuesByKey[descriptor.key] = cleanCellText_(row[colIdx]);
      });

      records.push({
        tenKey: tenKey,
        tenGoc: tenGoc,
        fileName: source.name,
        sheetName: sheetName,
        rowNum: CONFIG.HEADER_ROW + 1 + idx,
        valuesByKey: valuesByKey
      });
    });
  });
}

function ghiSheetDanhSach_(ss, records, dataHeaders) {
  let sh = ss.getSheetByName(CONFIG.SHEET_DS);
  if (sh) {
    sh.clear();
  } else {
    sh = ss.insertSheet(CONFIG.SHEET_DS, 0);
  }

  const headers = CONFIG.TECH_HEADERS.concat(dataHeaders.map(function (h) { return h.label; }));
  const rows = records.map(function (record) {
    return CONFIG.TECH_HEADERS.map(function (header) {
      if (header === "Tên tra cứu") return record.tenKey;
      if (header === "Tên gốc") return record.tenGoc;
      if (header === "File nguồn") return record.fileName;
      if (header === "Sheet nguồn") return record.sheetName;
      if (header === "Dòng nguồn") return record.rowNum;
      return "";
    }).concat(dataHeaders.map(function (header) {
      return record.valuesByKey[header.key] || "";
    }));
  });

  const totalRows = Math.max(rows.length + 1, 1);
  const totalCols = Math.max(headers.length, 1);
  damBaoKichThuocSheet_(sh, totalRows, totalCols);
  sh.getRange(1, 1, totalRows, totalCols).setNumberFormat("@");
  sh.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight("bold")
    .setBackground("#4a86e8")
    .setFontColor("white")
    .setHorizontalAlignment("center");

  if (rows.length) {
    sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  sh.setFrozenRows(1);
  sh.setFrozenColumns(CONFIG.TECH_HEADERS.length);
  sh.setColumnWidth(1, 180);
  sh.setColumnWidth(2, 180);
  sh.setColumnWidth(3, 180);
  sh.setColumnWidth(4, 160);
  sh.setColumnWidth(5, 90);
  for (let c = 6; c <= Math.min(headers.length, 20); c++) {
    sh.setColumnWidth(c, 150);
  }

  ss.setActiveSheet(sh);
  ss.moveActiveSheet(1);
}

function damBaoKichThuocSheet_(sh, rows, cols) {
  const maxRows = sh.getMaxRows();
  const maxCols = sh.getMaxColumns();
  if (maxRows < rows) {
    sh.insertRowsAfter(maxRows, rows - maxRows);
  }
  if (maxCols < cols) {
    sh.insertColumnsAfter(maxCols, cols - maxCols);
  }
}

// =============== CHAN DOAN ===============
function xemPhatHien() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  damBaoSheetNguonDuLieu_(ss);
  const allSheets = ss.getSheets();

  let msg = allSheets.length + " sheet trong file hiện tại:\n\n";
  allSheets.forEach(function (sh) {
    const name = sh.getName();

    if (laSheetLoaiTru_(name)) {
      msg += "⛔ \"" + name + "\" — loại trừ\n\n";
      return;
    }
    if (sh.isSheetHidden()) {
      msg += "👁️ \"" + name + "\" — sheet ẩn\n\n";
      return;
    }

    const colMap = timColTheoHeader_(sh);
    if (!laSheetDuLieuTraCuu_(colMap)) {
      msg += "❌ \"" + name + "\" — bỏ qua (không có cột Tên khách hàng)\n\n";
      return;
    }

    msg += "✅ \"" + name + "\" sẽ được quét (" + sh.getLastRow() + " dòng):\n";
    msg += "   • ten: cột " + colLetter_(colMap.ten) + " (\"" + sh.getRange(CONFIG.HEADER_ROW, colMap.ten).getDisplayValue() + "\")\n\n";
  });

  SpreadsheetApp.getUi().alert("Chẩn đoán phát hiện", msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

// =============== TIM COT THEO HEADER ===============
function timColTheoHeader_(sheet) {
  const result = {};
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return result;

  const headerRow = sheet.getRange(CONFIG.HEADER_ROW, 1, 1, lastCol).getDisplayValues()[0];
  const headersNorm = headerRow.map(function (h) { return chuanHoaText_(h); });
  const headersSearch = headerRow.map(function (h) { return chuanHoaTimKiem_(h, false); });

  Object.keys(CONFIG.HEADERS).forEach(function (field) {
    const bienThe = CONFIG.HEADERS[field].bien_the;
    for (let i = 0; i < headersNorm.length; i++) {
      const hNorm = headersNorm[i];
      const hSearch = headersSearch[i];
      if (!hNorm && !hSearch) continue;
      const khop = bienThe.some(function (b) {
        const bNorm = chuanHoaText_(b);
        const bSearch = chuanHoaTimKiem_(b, false);
        return (hNorm && bNorm && hNorm.indexOf(bNorm) !== -1) ||
          (hSearch && bSearch && hSearch.indexOf(bSearch) !== -1);
      });
      if (khop) {
        result[field] = i + 1;
        break;
      }
    }
  });

  return result;
}

function laSheetDuLieuTraCuu_(colMap) {
  return !!colMap.ten;
}

function laSheetLoaiTru_(sheetName) {
  return sheetName === CONFIG.SHEET_DS || sheetName === CONFIG.SHEET_NGUON;
}

function taoHeaderDescriptors_(headerRow) {
  const seen = {};
  return headerRow.map(function (raw, idx) {
    const baseLabel = cleanCellText_(raw) || ("Cột " + (idx + 1));
    const baseKey = chuanHoaHeaderKey_(baseLabel) || ("cot_" + (idx + 1));
    seen[baseKey] = (seen[baseKey] || 0) + 1;

    if (seen[baseKey] === 1) {
      return { key: baseKey, label: baseLabel };
    }

    return {
      key: baseKey + "__" + seen[baseKey],
      label: baseLabel + " (" + seen[baseKey] + ")"
    };
  });
}

function chuanHoaHeaderKey_(text) {
  return chuanHoaTimKiem_(text, false).replace(/\s+/g, "_");
}

// =============== REALTIME SIDEBAR ===============
function batRealtimeSidebar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  damBaoSheetNguonDuLieu_(ss);

  xoaRealtimeTriggers_();
  ScriptApp.newTrigger(REALTIME_CONFIG.TRIGGER_OPEN)
    .forSpreadsheet(ss)
    .onOpen()
    .create();

  moSidebarRealtime();

  SpreadsheetApp.getUi().alert(
    "Đã bật tự mở sidebar",
    "Từ lần mở file sau, sidebar sẽ tự mở.\n\nTra cứu khi chọn ô Tên khách hàng dùng onSelectionChange(e), không cần bật trigger riêng.",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function moSidebarRealtimeKhiMoFile_() {
  onOpen();
  moSidebarRealtime();
}

function batEditRealtime_(e) {
  xuLyRangeTraCuu_(e && e.range ? e.range : null);
}

function onSelectionChange(e) {
  xuLyRangeTraCuu_(e && e.range ? e.range : null);
}

function moSidebarRealtime() {
  const html = HtmlService.createHtmlOutputFromFile(REALTIME_CONFIG.SIDEBAR_FILE)
    .setTitle("Tra cứu KH");
  SpreadsheetApp.getUi().showSidebar(html);
}

function xoaRealtimeTriggers_() {
  const handlers = [REALTIME_CONFIG.TRIGGER_OPEN, REALTIME_CONFIG.TRIGGER_EDIT];
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (handlers.indexOf(trigger.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function xuLyRangeTraCuu_(range) {
  try {
    if (!range) return;
    if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;

    const sheet = range.getSheet();
    const sheetName = sheet.getName();
    if (laSheetLoaiTru_(sheetName) || sheet.isSheetHidden()) return;

    const colMap = timColTheoHeader_(sheet);
    if (!laSheetDuLieuTraCuu_(colMap)) return;
    if (range.getColumn() !== colMap.ten) return;

    const ten = cleanCellText_(range.getDisplayValue());
    if (!ten || laDongMau_(ten)) {
      luuRealtimeState_({
        status: "idle",
        message: "Chọn một ô có tên khách hàng để tra cứu.",
        timestamp: Date.now()
      });
      return;
    }

    const selectionKey = sheetName + "!" + range.getA1Notation() + "|" + ten + "|" + Date.now();
    luuRealtimeState_({
      status: "loading",
      ten: ten,
      tenKey: chuanHoaTimKiem_(ten, true),
      sheetName: sheetName,
      rowNum: range.getRow(),
      editedA1: range.getA1Notation(),
      selectionKey: selectionKey,
      timestamp: Date.now()
    });
  } catch (err) {
    luuRealtimeState_({
      status: "error",
      message: layThongBaoLoi_(err),
      timestamp: Date.now()
    });
  }
}

function getRealtimeSidebarState() {
  const raw = PropertiesService.getDocumentProperties().getProperty(REALTIME_CONFIG.STATE_KEY);
  if (!raw) {
    return {
      status: "idle",
      message: "Chạy Đồng bộ DANH_SACH_KHACH, sau đó chọn một ô Tên khách hàng để tra cứu.",
      timestamp: Date.now()
    };
  }

  const state = JSON.parse(raw);
  if (state.timestamp && Date.now() - state.timestamp > REALTIME_CONFIG.STATE_TTL_MS) {
    return {
      status: "idle",
      message: "Chọn một ô Tên khách hàng để tra cứu.",
      timestamp: Date.now()
    };
  }

  return state;
}

function getLookupResults(selectionKey) {
  const state = getRealtimeSidebarState();
  if (!state || !state.selectionKey || state.selectionKey !== selectionKey) {
    throw new Error("Trạng thái tra cứu đã thay đổi. Hãy chọn lại ô tên khách hàng.");
  }
  if (!state.ten) {
    throw new Error("Không có tên khách hàng để tra cứu.");
  }

  const lookup = timLichSuTheoTen_(state.ten);
  const readyState = {
    status: "ready",
    ten: state.ten,
    tenKey: chuanHoaTimKiem_(state.ten, true),
    sheetName: state.sheetName,
    rowNum: state.rowNum,
    editedA1: state.editedA1,
    selectionKey: state.selectionKey,
    headers: lookup.headers,
    rows: lookup.rows,
    total: lookup.total,
    truncated: lookup.truncated,
    timestamp: Date.now()
  };

  luuRealtimeState_({
    status: "ready_meta",
    ten: readyState.ten,
    tenKey: readyState.tenKey,
    sheetName: readyState.sheetName,
    rowNum: readyState.rowNum,
    editedA1: readyState.editedA1,
    selectionKey: readyState.selectionKey,
    total: readyState.total,
    truncated: readyState.truncated,
    timestamp: readyState.timestamp
  });

  return readyState;
}

function timLichSuTheoTen_(ten) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(CONFIG.SHEET_DS);
  if (!sh || sh.getLastRow() < 2) {
    return {
      headers: [],
      rows: [],
      total: 0,
      truncated: false
    };
  }

  const key = chuanHoaTimKiem_(ten, true);
  if (!key) {
    return {
      headers: [],
      rows: [],
      total: 0,
      truncated: false
    };
  }

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  const headers = sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  const keyRange = sh.getRange(2, 1, lastRow - 1, 1);
  const matches = keyRange.createTextFinder(key).matchEntireCell(true).findAll();
  if (!matches.length) {
    return {
      headers: headers,
      rows: [],
      total: 0,
      truncated: false
    };
  }

  const rowNums = matches.map(function (range) { return range.getRow(); }).sort(function (a, b) { return a - b; });
  const minRow = rowNums[0];
  const maxRow = rowNums[rowNums.length - 1];
  const block = sh.getRange(minRow, 1, maxRow - minRow + 1, lastCol).getDisplayValues();
  const rows = [];
  block.forEach(function (row) {
    if (row[0] === key) rows.push(row);
  });

  const total = rows.length;
  const truncated = rows.length > REALTIME_CONFIG.MAX_RESULTS;
  return {
    headers: headers,
    rows: truncated ? rows.slice(0, REALTIME_CONFIG.MAX_RESULTS) : rows,
    total: total,
    truncated: truncated
  };
}

function luuRealtimeState_(state) {
  PropertiesService.getDocumentProperties().setProperty(
    REALTIME_CONFIG.STATE_KEY,
    JSON.stringify(state)
  );
}

// =============== TIEN ICH ===============
function laGiaTriBat_(value) {
  const v = chuanHoaTimKiem_(value, false);
  return v === "true" || v === "co" || v === "yes" || v === "1" || v === "bat";
}

function trichXuatSpreadsheetId_(value) {
  const text = cleanCellText_(value);
  if (!text) return "";

  const urlMatch = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (urlMatch) return urlMatch[1];

  const idMatch = text.match(/[a-zA-Z0-9_-]{25,}/);
  return idMatch ? idMatch[0] : "";
}

function laDongMau_(ten) {
  const t = chuanHoaTimKiem_(ten, false);
  return t === "ten khach hang" || /^cot \d+$/.test(t);
}

function cleanCellText_(text) {
  return (text == null ? "" : text).toString()
    .replace(/\u200B/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function chuanHoaText_(text) {
  return cleanCellText_(text).toLowerCase();
}

function chuanHoaTimKiem_(text, boPhanTrongNgoac) {
  let value = cleanCellText_(text);
  if (boPhanTrongNgoac) {
    value = value.replace(/\([^)]*\)/g, " ");
  }

  value = value
    .replace(new RegExp(String.fromCharCode(273), "g"), "d")
    .replace(new RegExp(String.fromCharCode(272), "g"), "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return value;
}

function layThongBaoLoi_(err) {
  return err && err.message ? err.message : String(err);
}

function colLetter_(col) {
  let letter = "";
  while (col > 0) {
    const r = (col - 1) % 26;
    letter = String.fromCharCode(65 + r) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}
