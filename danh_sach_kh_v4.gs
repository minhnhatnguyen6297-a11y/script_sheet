/*****************************************************************************
 * DANH_SACH_KHACH RAW INDEX + FAST LOOKUP SIDEBAR
 * - DANH_SACH_KHACH la index dong goc, khong tom tat/gop mat du lieu.
 * - Sidebar tra cuu bang onSelectionChange(e) tren cot Ten khach hang.
 *****************************************************************************/

const CONFIG = {
  HEADER_ROW: 1,
  SHEET_DS: "DANH_SACH_KHACH",
  SHEET_NGUON: "NGUON_DU_LIEU",
  SHEET_PERF: "QLKH_PERF_LOG",
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

const PERF_CONFIG = {
  ENABLED_KEY: "QLKH_PERF_ENABLED_V1",
  HEADERS: ["Thời điểm", "Session", "Nguồn", "Stage", "Duration ms", "Rows", "Cols", "Cells", "Message", "Meta JSON"],
  MAX_REPORT_ROWS: 500
};

const WORKFLOW_CONFIG = {
  SHEET_CONG_VIEC: "DANH_SACH_CHUNG",
  SHEET_CANH_BAO: "CANH_BAO_HAN",
  FIXED_HEADERS: ["Tên tra cứu", "Tên khách hàng", "SĐT", "Loại hồ sơ", "Địa chỉ đất", "Gói thời hạn", "File nguồn", "Sheet nguồn", "Dòng nguồn"],
  ALERT_HEADERS: ["Ngày ghi nhận", "Tên khách", "Bước", "Mốc cũ", "Mốc mới", "Ô task", "Ngày bắt đầu", "Ngày kết thúc"],
  RECORD_HEADER_PREFIX: "Bản ghi ",
  DEFAULT_TOTAL_DAYS: 15,
  STEPS: [
    { code: "NOP_HS", label: "Nộp HS" },
    { code: "TB_THUE", label: "TB thuế" },
    { code: "DA_NOP_THUE", label: "Đã nộp thuế" },
    { code: "CO_SO", label: "Có sổ" },
    { code: "TRA_HS", label: "Trả HS" },
    { code: "DINH_CHINH", label: "Đính chính" },
    { code: "NOP_DC", label: "Nộp ĐC" },
    { code: "DC_XONG", label: "ĐC xong" },
    { code: "PHAT_SINH", label: "Phát sinh" }
  ],
  MAIN_RULE_STEPS: ["NOP_HS", "TB_THUE", "DA_NOP_THUE"],
  FIXED_RULE_DAYS: {
    DINH_CHINH: 10,
    NOP_DC: 3,
    DC_XONG: 7
  },
  ALERT_COLORS: {
    EMPTY: "#ffffff",
    DONE: "#ffffff",
    GREEN: "#d9ead3",
    YELLOW: "#fff2cc",
    ORANGE: "#fbbc04",
    RED: "#ea4335",
    RED_150: "#d93025",
    RED_200: "#c5221f",
    RED_250: "#a50e0e",
    RED_300: "#8b0000",
    RED_350: "#7a0000",
    RED_400: "#690000",
    RED_450: "#580000",
    RED_500: "#4a0000"
  }
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
    .addSeparator()
    .addItem("🟠 Cập nhật cảnh báo", "capNhatCanhBaoWorkflow")
    .addSeparator()
    .addItem("📊 Bật đo tốc độ", "batDoTocDo")
    .addItem("🧹 Xóa log đo", "xoaLogDoTocDo")
    .addItem("📈 Xem báo cáo tốc độ", "xemBaoCaoTocDo")
    .addToUi();
}

// =============== HAM CHINH ===============
function dongBoDanhSachKH() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const t0 = Date.now();
  const perfSession = taoPerfSessionId_("sync");

  const ketQua = taoDanhSachKhachIndex_(ss, perfSession);
  const writeStart = Date.now();
  ghiSheetDanhSach_(ss, ketQua.records, ketQua.headers);
  recordPerfEvent_("sync.output.write", writeStart, {
    session: perfSession,
    source: ss.getName(),
    rows: ketQua.records.length,
    cols: CONFIG.TECH_HEADERS.length + ketQua.headers.length,
    cells: ketQua.records.length * (CONFIG.TECH_HEADERS.length + ketQua.headers.length),
    message: "Ghi DANH_SACH_KHACH"
  });
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

  recordPerfEvent_("sync.total", t0, {
    session: perfSession,
    source: ss.getName(),
    rows: ketQua.records.length,
    cols: CONFIG.TECH_HEADERS.length + ketQua.headers.length,
    cells: ketQua.records.length * (CONFIG.TECH_HEADERS.length + ketQua.headers.length),
    message: "Nguồn đã quét: " + ketQua.sourcesScanned
  });
  ui.alert("✅ Đồng bộ xong", msg, ui.ButtonSet.OK);
}

function taoDanhSachKhachIndex_(ss, perfSession) {
  const allHeaders = new Map();
  const records = [];
  const errors = [];
  const sources = layTatCaNguonDuLieu_(ss, errors, perfSession);

  sources.forEach(function (source) {
    try {
      thuThapDongGocTuSpreadsheet_(source, allHeaders, records, perfSession);
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

function layTatCaNguonDuLieu_(ss, errors, perfSession) {
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
      const openStart = Date.now();
      const external = SpreadsheetApp.openById(id);
      recordPerfEvent_("sync.source.open", openStart, {
        session: perfSession,
        source: tenNguon || external.getName(),
        message: id,
        meta: { label: label }
      });
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

function thuThapDongGocTuSpreadsheet_(source, allHeaders, records, perfSession) {
  const sheets = source.spreadsheet.getSheets();
  sheets.forEach(function (sh) {
    const sheetStart = Date.now();
    const sheetName = sh.getName();
    if (laSheetLoaiTru_(sheetName)) return;
    if (sh.isSheetHidden()) return;
    const lastRow = sh.getLastRow();
    const lastCol = sh.getLastColumn();
    if (lastRow <= CONFIG.HEADER_ROW || lastCol === 0) return;

    const colMap = timColTheoHeader_(sh);
    if (!laSheetDuLieuTraCuu_(colMap)) return;

    const headerRow = sh.getRange(CONFIG.HEADER_ROW, 1, 1, lastCol).getDisplayValues()[0];
    const descriptors = taoHeaderDescriptors_(headerRow);
    descriptors.forEach(function (descriptor) {
      if (!allHeaders.has(descriptor.key)) {
        allHeaders.set(descriptor.key, descriptor);
      }
    });

    const numRows = lastRow - CONFIG.HEADER_ROW;
    const rows = sh.getRange(CONFIG.HEADER_ROW + 1, 1, numRows, lastCol).getDisplayValues();
    const recordsBefore = records.length;
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
    recordPerfEvent_("sync.sheet.read", sheetStart, {
      session: perfSession,
      source: source.name,
      rows: numRows,
      cols: lastCol,
      cells: numRows * lastCol,
      message: sheetName,
      meta: { recordsAdded: records.length - recordsBefore }
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
  return sheetName === CONFIG.SHEET_DS ||
    sheetName === CONFIG.SHEET_NGUON ||
    sheetName === CONFIG.SHEET_PERF ||
    sheetName === WORKFLOW_CONFIG.SHEET_CONG_VIEC ||
    sheetName === WORKFLOW_CONFIG.SHEET_CANH_BAO;
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
  const selectionStart = Date.now();
  try {
    if (!range) return;
    if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;

    const sheet = range.getSheet();
    const sheetName = sheet.getName();
    if (laSheetLoaiTru_(sheetName) || sheet.isSheetHidden()) return;

    const headerStart = Date.now();
    const colMap = timColTheoHeader_(sheet);
    recordPerfEvent_("selection.headerLookup", headerStart, {
      source: sheetName,
      rows: 1,
      cols: sheet.getLastColumn(),
      message: range.getA1Notation()
    });
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
    recordPerfEvent_("selection.total", selectionStart, {
      source: sheetName,
      rows: 1,
      cols: 1,
      cells: 1,
      message: range.getA1Notation(),
      meta: { ten: ten, tenKey: chuanHoaTimKiem_(ten, true), rowNum: range.getRow() }
    });
  } catch (err) {
    luuRealtimeState_({
      status: "error",
      message: layThongBaoLoi_(err),
      timestamp: Date.now()
    });
    recordPerfEvent_("selection.total", selectionStart, {
      source: "error",
      message: layThongBaoLoi_(err)
    });
  }
}

function getRealtimeSidebarState() {
  const readStart = Date.now();
  const raw = PropertiesService.getDocumentProperties().getProperty(REALTIME_CONFIG.STATE_KEY);
  if (!raw) {
    recordPerfEvent_("state.read", readStart, {
      source: "documentProperties",
      message: "empty"
    });
    return {
      status: "idle",
      message: "Chạy Đồng bộ DANH_SACH_KHACH, sau đó chọn một ô Tên khách hàng để tra cứu.",
      timestamp: Date.now()
    };
  }

  const state = JSON.parse(raw);
  recordPerfEvent_("state.read", readStart, {
    source: "documentProperties",
    message: state.status || ""
  });
  if (state.timestamp && Date.now() - state.timestamp > REALTIME_CONFIG.STATE_TTL_MS) {
    return {
      status: "idle",
      message: "Chọn một ô Tên khách hàng để tra cứu.",
      timestamp: Date.now()
    };
  }

  return state;
}

function getActiveCellLookupState() {
  const buttonStart = Date.now();
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let range = ss.getCurrentCell();
    if (!range) {
      range = ss.getActiveRange();
    }
    const state = taoLookupStateTuRange_(range, "button.activeCell");
    recordPerfEvent_("button.activeCell", buttonStart, {
      source: state.sheetName,
      rows: 1,
      cols: 1,
      cells: 1,
      message: state.editedA1 || "",
      meta: { ten: state.ten, tenKey: state.tenKey }
    });
    return state;
  } catch (err) {
    const message = layThongBaoLoi_(err);
    recordPerfEvent_("button.activeCell", buttonStart, {
      source: "error",
      message: message
    });
    return {
      status: "error",
      message: message,
      timestamp: Date.now()
    };
  }
}

function taoLookupStateTuRange_(range, triggerSource) {
  if (!range) {
    throw new Error("Không có ô đang chọn.");
  }
  if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) {
    throw new Error("Hãy chọn đúng một ô Tên khách hàng.");
  }

  const sheet = range.getSheet();
  const sheetName = sheet.getName();
  if (laSheetLoaiTru_(sheetName) || sheet.isSheetHidden()) {
    throw new Error("Sheet đang chọn không phải sheet dữ liệu khách hàng.");
  }

  const headerStart = Date.now();
  const colMap = timColTheoHeader_(sheet);
  recordPerfEvent_(triggerSource + ".headerLookup", headerStart, {
    source: sheetName,
    rows: 1,
    cols: sheet.getLastColumn(),
    message: range.getA1Notation()
  });
  if (!laSheetDuLieuTraCuu_(colMap)) {
    throw new Error("Sheet đang chọn không có cột Tên khách hàng.");
  }
  if (range.getColumn() !== colMap.ten) {
    throw new Error("Ô đang chọn không nằm trong cột Tên khách hàng.");
  }

  const ten = cleanCellText_(range.getDisplayValue());
  if (!ten || laDongMau_(ten)) {
    throw new Error("Ô đang chọn chưa có tên khách hàng hợp lệ.");
  }

  const timestamp = Date.now();
  return {
    status: "ready",
    ten: ten,
    tenKey: chuanHoaTimKiem_(ten, true),
    sheetName: sheetName,
    rowNum: range.getRow(),
    editedA1: range.getA1Notation(),
    selectionKey: "button|" + sheetName + "!" + range.getA1Notation() + "|" + ten + "|" + timestamp,
    timestamp: timestamp
  };
}

function loadLookupIndex() {
  const loadStart = Date.now();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(CONFIG.SHEET_DS);
  const loadedAt = Date.now();

  if (!sh || sh.getLastRow() < 2 || sh.getLastColumn() === 0) {
    recordPerfEvent_("index.load", loadStart, {
      source: CONFIG.SHEET_DS,
      rows: 0,
      cols: 0,
      cells: 0,
      message: "empty"
    });
    return {
      headers: [],
      rows: [],
      rowCount: 0,
      loadedAt: loadedAt,
      message: "Chưa có dữ liệu trong DANH_SACH_KHACH. Hãy chạy đồng bộ trước."
    };
  }

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  const headers = sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  const rows = sh.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
  recordPerfEvent_("index.load", loadStart, {
    source: CONFIG.SHEET_DS,
    rows: rows.length,
    cols: lastCol,
    cells: rows.length * lastCol,
    message: "loadLookupIndex"
  });

  return {
    headers: headers,
    rows: rows,
    rowCount: rows.length,
    loadedAt: loadedAt
  };
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
  const writeStart = Date.now();
  PropertiesService.getDocumentProperties().setProperty(
    REALTIME_CONFIG.STATE_KEY,
    JSON.stringify(state)
  );
  recordPerfEvent_("state.write", writeStart, {
    source: "documentProperties",
    message: state.status || "",
    meta: { selectionKey: state.selectionKey || "", tenKey: state.tenKey || "" }
  });
}

// =============== WORKFLOW / HEN VIEC ===============
function capNhatCanhBaoWorkflow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = capNhatMauVaCanhBaoWorkflow_(ss, new Date());
  SpreadsheetApp.getUi().alert(
    "Đã cập nhật cảnh báo",
    "Đã quét " + result.tasks + " task đang theo dõi, ghi " + result.logs + " cảnh báo mới.",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function getWorkflowSidebarData(state) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  capNhatMauVaCanhBaoWorkflow_(ss, new Date());
  const safeState = state || getActiveCellLookupState();
  const customer = taoThongTinKhachWorkflow_(ss, safeState);
  const workflow = layWorkflowTheoTenKey_(ss, customer.tenKey);
  const alerts = layTongHopCanhBaoWorkflow_(ss, new Date());
  return {
    customer: customer,
    workflow: workflow,
    alerts: alerts,
    steps: WORKFLOW_CONFIG.STEPS,
    defaultTotalDays: WORKFLOW_CONFIG.DEFAULT_TOTAL_DAYS
  };
}

function saveWorkflowTask(payload) {
  payload = payload || {};
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const state = payload.state || getActiveCellLookupState();
  const customer = taoThongTinKhachWorkflow_(ss, state);
  const sh = damBaoSheetCongViec_(ss);
  const rowNum = damBaoDongKhachWorkflow_(sh, customer);
  const now = new Date();
  const totalDays = chuanHoaSoNgayGoi_(payload.totalDays || customer.totalDays || WORKFLOW_CONFIG.DEFAULT_TOTAL_DAYS);
  const mode = cleanCellText_(payload.mode || "step");
  let messages = [];

  if (mode === "flex") {
    const note = rutGonNoiDungTask_(payload.note || "");
    if (!note) throw new Error("Hãy nhập nội dung việc phát sinh.");
    const endDate = parseWorkflowInputDate_(payload.endDate);
    if (!endDate) throw new Error("Hãy chọn ngày hẹn.");
    const startDate = parseWorkflowInputDate_(payload.startDate) || now;
    appendWorkflowTaskCell_(sh, rowNum, taoNoiDungTaskCell_({
      code: "PHAT_SINH",
      note: note,
      startDate: startDate,
      endDate: endDate,
      done: false
    }));
    messages.push("Đã lưu việc phát sinh.");
  } else {
    const code = cleanCellText_(payload.stepCode || "");
    if (!code) throw new Error("Hãy chọn bước cần chuyển.");
    danhDauTaskRuleDangMo_(sh, rowNum);

    if (code === "TRA_HS") {
      appendWorkflowTaskCell_(sh, rowNum, taoNoiDungTaskCell_({
        code: "TRA_HS",
        startDate: now,
        endDate: now,
        done: true
      }));
      appendWorkflowTaskCell_(sh, rowNum, taoNoiDungTaskCell_({
        code: "DINH_CHINH",
        startDate: now,
        endDate: congNgay_(now, tinhSoNgayBuocWorkflow_("DINH_CHINH", totalDays)),
        done: false
      }));
      messages.push("Đã ghi Trả HS và tạo task Đính chính.");
    } else if (code === "CO_SO") {
      appendWorkflowTaskCell_(sh, rowNum, taoNoiDungTaskCell_({
        code: "CO_SO",
        startDate: now,
        endDate: now,
        done: true
      }));
      messages.push("Đã ghi mốc Có sổ.");
    } else {
      const days = tinhSoNgayBuocWorkflow_(code, totalDays);
      if (!days) throw new Error("Bước không có thời hạn theo dõi: " + code);
      appendWorkflowTaskCell_(sh, rowNum, taoNoiDungTaskCell_({
        code: code,
        startDate: now,
        endDate: congNgay_(now, days),
        done: false
      }));
      messages.push("Đã tạo task " + code + ".");
    }

    sh.getRange(rowNum, 6).setValue(totalDays + " ngày");
  }

  capNhatMauVaCanhBaoWorkflow_(ss, now);
  return {
    ok: true,
    message: messages.join(" "),
    rowNum: rowNum,
    data: getWorkflowSidebarData(state)
  };
}

function openWorkflowRow(rowNum) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(WORKFLOW_CONFIG.SHEET_CONG_VIEC);
  if (!sh) throw new Error("Chưa có sheet " + WORKFLOW_CONFIG.SHEET_CONG_VIEC + ".");
  const row = Math.max(2, Number(rowNum || 2));
  ss.setActiveSheet(sh);
  sh.setActiveRange(sh.getRange(row, 1, 1, Math.max(1, sh.getLastColumn())));
  return { ok: true, rowNum: row };
}

function tinhTatCaSoNgayRuleChinh_(totalDays) {
  const total = chuanHoaSoNgayGoi_(totalDays);
  const moc1 = Math.round(total * 0.4);
  const moc2 = Math.round(total * 0.45);
  return {
    NOP_HS: Math.max(1, moc1),
    TB_THUE: Math.max(1, moc2 - moc1),
    DA_NOP_THUE: Math.max(1, total - moc2)
  };
}

function tinhSoNgayBuocWorkflow_(code, totalDays) {
  const main = tinhTatCaSoNgayRuleChinh_(totalDays);
  if (main[code]) return main[code];
  if (WORKFLOW_CONFIG.FIXED_RULE_DAYS[code]) return WORKFLOW_CONFIG.FIXED_RULE_DAYS[code];
  return 0;
}

function taoNoiDungTaskCell_(task) {
  task = task || {};
  const code = cleanCellText_(task.code || "");
  const note = rutGonNoiDungTask_(task.note || "");
  const start = formatWorkflowDate_(task.startDate || new Date());
  const end = formatWorkflowDate_(task.endDate || task.startDate || new Date());
  const donePrefix = task.done ? "✓ " : "";
  const middle = note ? " " + note : "";
  return donePrefix + code + middle + " " + start + "-" + end;
}

function parseWorkflowTaskCell_(text, defaultYear) {
  let raw = cleanCellText_(text || "");
  if (!raw) return null;
  let done = false;
  if (raw.charAt(0) === "✓") {
    done = true;
    raw = cleanCellText_(raw.slice(1));
  }

  const match = raw.match(/^(\S+)\s+(?:(.*?)\s+)?(\d{2}\/\d{2})-(\d{2}\/\d{2})$/);
  if (!match) return null;
  const year = Number(defaultYear || new Date().getFullYear());
  const start = parseWorkflowDateToken_(match[3], year);
  const end = parseWorkflowDateToken_(match[4], year);
  if (!start || !end) return null;

  return {
    done: done,
    code: match[1],
    note: cleanCellText_(match[2] || ""),
    startDate: toIsoDate_(start),
    endDate: toIsoDate_(end)
  };
}

function tinhMocCanhBaoTask_(text, today) {
  const parsed = parseWorkflowTaskCell_(text, today ? today.getFullYear() : new Date().getFullYear());
  if (!parsed) return "EMPTY";
  if (parsed.done) return "DONE";
  const start = parseIsoDate_(parsed.startDate);
  const end = parseIsoDate_(parsed.endDate);
  if (!start || !end) return "EMPTY";
  const duration = Math.max(1, diffNgay_(start, end));
  const elapsed = Math.max(0, diffNgay_(start, today || new Date()));
  const pct = elapsed / duration;
  if (pct < 0.25) return "GREEN";
  if (pct < 0.5) return "YELLOW";
  if (pct < 1) return "ORANGE";
  if (pct < 1.5) return "RED";
  const bucket = Math.min(500, Math.floor((pct * 100) / 50) * 50);
  return "RED_" + bucket;
}

function layMauMocCanhBao_(level) {
  return WORKFLOW_CONFIG.ALERT_COLORS[level] || WORKFLOW_CONFIG.ALERT_COLORS.RED_500;
}

function damBaoSheetCongViec_(ss) {
  let sh = ss.getSheetByName(WORKFLOW_CONFIG.SHEET_CONG_VIEC);
  if (!sh) sh = ss.insertSheet(WORKFLOW_CONFIG.SHEET_CONG_VIEC);
  damBaoKichThuocSheet_(sh, 1, WORKFLOW_CONFIG.FIXED_HEADERS.length + 10);
  sh.getRange(1, 1, 1, WORKFLOW_CONFIG.FIXED_HEADERS.length)
    .setValues([WORKFLOW_CONFIG.FIXED_HEADERS])
    .setFontWeight("bold")
    .setBackground("#188038")
    .setFontColor("white")
    .setHorizontalAlignment("center");
  for (let c = WORKFLOW_CONFIG.FIXED_HEADERS.length + 1; c <= Math.max(sh.getLastColumn(), WORKFLOW_CONFIG.FIXED_HEADERS.length + 10); c++) {
    const cell = sh.getRange(1, c);
    if (!cleanCellText_(cell.getDisplayValue())) {
      cell.setValue(WORKFLOW_CONFIG.RECORD_HEADER_PREFIX + (c - WORKFLOW_CONFIG.FIXED_HEADERS.length));
    }
  }
  sh.setFrozenRows(1);
  sh.setFrozenColumns(WORKFLOW_CONFIG.FIXED_HEADERS.length);
  return sh;
}

function damBaoSheetCanhBao_(ss) {
  let sh = ss.getSheetByName(WORKFLOW_CONFIG.SHEET_CANH_BAO);
  if (!sh) sh = ss.insertSheet(WORKFLOW_CONFIG.SHEET_CANH_BAO);
  damBaoKichThuocSheet_(sh, 1, WORKFLOW_CONFIG.ALERT_HEADERS.length);
  sh.getRange(1, 1, 1, WORKFLOW_CONFIG.ALERT_HEADERS.length)
    .setValues([WORKFLOW_CONFIG.ALERT_HEADERS])
    .setFontWeight("bold")
    .setBackground("#d93025")
    .setFontColor("white")
    .setHorizontalAlignment("center");
  sh.setFrozenRows(1);
  return sh;
}

function taoThongTinKhachWorkflow_(ss, state) {
  state = state || {};
  const ten = cleanCellText_(state.ten || "");
  if (!ten) throw new Error("Hãy tra cứu hoặc chọn một khách trước khi hẹn việc.");
  const result = {
    tenKey: state.tenKey || chuanHoaTimKiem_(ten, true),
    ten: ten,
    sdt: "",
    loaiHS: "",
    dcDat: "",
    totalDays: WORKFLOW_CONFIG.DEFAULT_TOTAL_DAYS,
    fileName: ss.getName(),
    sheetName: state.sheetName || "",
    rowNum: state.rowNum || ""
  };

  const sh = state.sheetName ? ss.getSheetByName(state.sheetName) : null;
  if (sh && state.rowNum && !laSheetLoaiTru_(state.sheetName)) {
    const colMap = timColTheoHeader_(sh);
    const lastCol = sh.getLastColumn();
    const row = sh.getRange(Number(state.rowNum), 1, 1, lastCol).getDisplayValues()[0];
    if (colMap.sdt) result.sdt = cleanCellText_(row[colMap.sdt - 1]);
    if (colMap.loaiHS) result.loaiHS = cleanCellText_(row[colMap.loaiHS - 1]);
    if (colMap.dcDat) result.dcDat = cleanCellText_(row[colMap.dcDat - 1]);
  }

  return result;
}

function damBaoDongKhachWorkflow_(sh, customer) {
  const lastRow = sh.getLastRow();
  if (lastRow >= 2) {
    const keys = sh.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
    for (let i = 0; i < keys.length; i++) {
      if (cleanCellText_(keys[i][0]) === customer.tenKey) return i + 2;
    }
  }
  const rowNum = Math.max(2, lastRow + 1);
  damBaoKichThuocSheet_(sh, rowNum, WORKFLOW_CONFIG.FIXED_HEADERS.length + 10);
  sh.getRange(rowNum, 1, 1, WORKFLOW_CONFIG.FIXED_HEADERS.length).setValues([[
    customer.tenKey,
    customer.ten,
    customer.sdt,
    customer.loaiHS,
    customer.dcDat,
    customer.totalDays + " ngày",
    customer.fileName,
    customer.sheetName,
    customer.rowNum
  ]]);
  return rowNum;
}

function appendWorkflowTaskCell_(sh, rowNum, value) {
  let col = WORKFLOW_CONFIG.FIXED_HEADERS.length + 1;
  while (col <= sh.getLastColumn()) {
    if (!cleanCellText_(sh.getRange(rowNum, col).getDisplayValue())) break;
    col++;
  }
  if (col > sh.getLastColumn()) {
    sh.insertColumnAfter(sh.getLastColumn());
  }
  damBaoWorkflowTaskHeader_(sh, col);
  sh.getRange(rowNum, col).setValue(value);
  return col;
}

function danhDauTaskRuleDangMo_(sh, rowNum) {
  const startCol = WORKFLOW_CONFIG.FIXED_HEADERS.length + 1;
  const lastCol = sh.getLastColumn();
  if (lastCol < startCol) return;
  const range = sh.getRange(rowNum, startCol, 1, lastCol - startCol + 1);
  const values = range.getDisplayValues()[0];
  const nextValues = values.slice();
  let changed = false;
  values.forEach(function (value, idx) {
    const parsed = parseWorkflowTaskCell_(value, new Date().getFullYear());
    if (!parsed || parsed.done || parsed.code === "PHAT_SINH") return;
    nextValues[idx] = "✓ " + cleanCellText_(value);
    changed = true;
  });
  if (changed) {
    range.setValues([nextValues]);
    range.setBackground("#ffffff");
  }
}

function capNhatMauVaCanhBaoWorkflow_(ss, today) {
  const sh = ss.getSheetByName(WORKFLOW_CONFIG.SHEET_CONG_VIEC);
  if (!sh || sh.getLastRow() < 2) return { tasks: 0, logs: 0 };
  const logSheet = damBaoSheetCanhBao_(ss);
  const startCol = WORKFLOW_CONFIG.FIXED_HEADERS.length + 1;
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastCol < startCol) return { tasks: 0, logs: 0 };

  let tasks = 0;
  let logs = 0;
  const names = sh.getRange(2, 2, lastRow - 1, 1).getDisplayValues();
  for (let r = 2; r <= lastRow; r++) {
    const values = sh.getRange(r, startCol, 1, lastCol - startCol + 1).getDisplayValues()[0];
    const notes = sh.getRange(r, startCol, 1, lastCol - startCol + 1).getNotes()[0];
    const colors = [];
    const nextNotes = [];
    values.forEach(function (value, idx) {
      const level = tinhMocCanhBaoTask_(value, today);
      const parsed = parseWorkflowTaskCell_(value, today.getFullYear());
      colors.push(layMauMocCanhBao_(level));
      nextNotes.push(level);
      if (parsed && !parsed.done) tasks++;
      const prev = cleanCellText_(notes[idx] || "");
      if (parsed && prev && prev !== level && laMocCanhBaoCanLog_(level)) {
        ghiLogCanhBaoWorkflow_(logSheet, {
          date: today,
          ten: cleanCellText_(names[r - 2][0]),
          code: parsed.code,
          oldLevel: prev,
          newLevel: level,
          a1: sh.getRange(r, startCol + idx).getA1Notation(),
          startDate: parsed.startDate,
          endDate: parsed.endDate
        });
        logs++;
      }
    });
    sh.getRange(r, startCol, 1, colors.length).setBackgrounds([colors]);
    sh.getRange(r, startCol, 1, nextNotes.length).setNotes([nextNotes]);
  }
  return { tasks: tasks, logs: logs };
}

function layWorkflowTheoTenKey_(ss, tenKey) {
  const sh = ss.getSheetByName(WORKFLOW_CONFIG.SHEET_CONG_VIEC);
  if (!sh || sh.getLastRow() < 2) return { rowNum: 0, tasks: [] };
  const lastRow = sh.getLastRow();
  const keys = sh.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < keys.length; i++) {
    if (cleanCellText_(keys[i][0]) !== tenKey) continue;
    const rowNum = i + 2;
    const startCol = WORKFLOW_CONFIG.FIXED_HEADERS.length + 1;
    const lastCol = sh.getLastColumn();
    const values = lastCol >= startCol ? sh.getRange(rowNum, startCol, 1, lastCol - startCol + 1).getDisplayValues()[0] : [];
    const tasks = values.map(function (value, idx) {
      const parsed = parseWorkflowTaskCell_(value, new Date().getFullYear());
      if (!parsed) return null;
      return {
        text: value,
        parsed: parsed,
        level: tinhMocCanhBaoTask_(value, new Date()),
        rowNum: rowNum,
        colNum: startCol + idx,
        a1: sh.getRange(rowNum, startCol + idx).getA1Notation()
      };
    }).filter(function (task) { return !!task; });
    return { rowNum: rowNum, tasks: tasks };
  }
  return { rowNum: 0, tasks: [] };
}

function layTongHopCanhBaoWorkflow_(ss, today) {
  const logSheet = ss.getSheetByName(WORKFLOW_CONFIG.SHEET_CANH_BAO);
  const todayIso = toIsoDate_(today);
  const weekStart = congNgay_(today, -6);
  const summary = {
    todayOrange: 0,
    todayRed: 0,
    weekOrange: 0,
    weekRed: 0,
    priority: []
  };

  if (logSheet && logSheet.getLastRow() >= 2) {
    const rows = logSheet.getRange(2, 1, logSheet.getLastRow() - 1, WORKFLOW_CONFIG.ALERT_HEADERS.length).getDisplayValues();
    rows.forEach(function (row) {
      const date = parseWorkflowInputDate_(row[0]);
      const level = cleanCellText_(row[4]);
      if (!date) return;
      if (toIsoDate_(date) === todayIso) {
        if (level === "ORANGE") summary.todayOrange++;
        if (level.indexOf("RED") === 0) summary.todayRed++;
      }
      if (date >= stripTime_(weekStart) && date <= stripTime_(today)) {
        if (level === "ORANGE") summary.weekOrange++;
        if (level.indexOf("RED") === 0) summary.weekRed++;
      }
    });
  }

  const sh = ss.getSheetByName(WORKFLOW_CONFIG.SHEET_CONG_VIEC);
  if (sh && sh.getLastRow() >= 2) {
    const startCol = WORKFLOW_CONFIG.FIXED_HEADERS.length + 1;
    const lastCol = sh.getLastColumn();
    if (lastCol >= startCol) {
      const names = sh.getRange(2, 2, sh.getLastRow() - 1, 1).getDisplayValues();
      for (let r = 2; r <= sh.getLastRow(); r++) {
        const values = sh.getRange(r, startCol, 1, lastCol - startCol + 1).getDisplayValues()[0];
        values.forEach(function (value, idx) {
          const parsed = parseWorkflowTaskCell_(value, today.getFullYear());
          if (!parsed || parsed.done) return;
          const level = tinhMocCanhBaoTask_(value, today);
          if (level !== "ORANGE" && level.indexOf("RED") !== 0) return;
          summary.priority.push({
            ten: cleanCellText_(names[r - 2][0]),
            text: value,
            level: level,
            rowNum: r,
            a1: sh.getRange(r, startCol + idx).getA1Notation(),
            overdueDays: Math.max(0, diffNgay_(parseIsoDate_(parsed.endDate), today))
          });
        });
      }
    }
  }
  summary.priority.sort(function (a, b) {
    const aRed = a.level.indexOf("RED") === 0 ? 1 : 0;
    const bRed = b.level.indexOf("RED") === 0 ? 1 : 0;
    if (aRed !== bRed) return bRed - aRed;
    return b.overdueDays - a.overdueDays;
  });
  summary.priority = summary.priority.slice(0, 50);
  return summary;
}

function ghiLogCanhBaoWorkflow_(sh, item) {
  const row = sh.getLastRow() + 1;
  damBaoKichThuocSheet_(sh, row, WORKFLOW_CONFIG.ALERT_HEADERS.length);
  sh.getRange(row, 1, 1, WORKFLOW_CONFIG.ALERT_HEADERS.length).setValues([[
    formatWorkflowFullDate_(item.date),
    item.ten,
    item.code,
    item.oldLevel,
    item.newLevel,
    item.a1,
    item.startDate,
    item.endDate
  ]]);
}

function laMocCanhBaoCanLog_(level) {
  return level === "ORANGE" || level.indexOf("RED") === 0;
}

function damBaoWorkflowTaskHeader_(sh, col) {
  const header = cleanCellText_(sh.getRange(1, col).getDisplayValue());
  if (!header) {
    sh.getRange(1, col).setValue(WORKFLOW_CONFIG.RECORD_HEADER_PREFIX + (col - WORKFLOW_CONFIG.FIXED_HEADERS.length));
  }
}

function chuanHoaSoNgayGoi_(value) {
  const raw = cleanCellText_(value || "");
  if (raw.indexOf("3") !== -1 && raw.toLowerCase().indexOf("tháng") !== -1) return 90;
  if (raw.indexOf("1") !== -1 && raw.toLowerCase().indexOf("tháng") !== -1) return 30;
  const num = Number(String(raw || value || "").replace(/[^\d]/g, ""));
  return Math.max(1, num || WORKFLOW_CONFIG.DEFAULT_TOTAL_DAYS);
}

function rutGonNoiDungTask_(text) {
  const value = cleanCellText_(text).replace(/\s+/g, " ");
  return value.length > 24 ? value.slice(0, 24).trim() : value;
}

function formatWorkflowDate_(date) {
  const d = stripTime_(date);
  return pad2_(d.getDate()) + "/" + pad2_(d.getMonth() + 1);
}

function formatWorkflowFullDate_(date) {
  const d = stripTime_(date);
  return pad2_(d.getDate()) + "/" + pad2_(d.getMonth() + 1) + "/" + d.getFullYear();
}

function parseWorkflowDateToken_(token, year) {
  const parts = String(token || "").split("/");
  if (parts.length !== 2) return null;
  const day = Number(parts[0]);
  const month = Number(parts[1]);
  if (!day || !month) return null;
  return new Date(Number(year), month - 1, day);
}

function parseWorkflowInputDate_(value) {
  if (value instanceof Date) return stripTime_(value);
  const raw = cleanCellText_(value || "");
  if (!raw) return null;
  let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  return null;
}

function parseIsoDate_(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function toIsoDate_(date) {
  const d = stripTime_(date);
  return d.getFullYear() + "-" + pad2_(d.getMonth() + 1) + "-" + pad2_(d.getDate());
}

function stripTime_(date) {
  const d = date instanceof Date ? date : new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function congNgay_(date, days) {
  const d = stripTime_(date);
  d.setDate(d.getDate() + Number(days || 0));
  return d;
}

function diffNgay_(start, end) {
  return Math.round((stripTime_(end).getTime() - stripTime_(start).getTime()) / (24 * 60 * 60 * 1000));
}

function pad2_(num) {
  return String(num).padStart(2, "0");
}

// =============== DO TOC DO ===============
function batDoTocDo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  damBaoSheetPerf_(ss);
  PropertiesService.getDocumentProperties().setProperty(PERF_CONFIG.ENABLED_KEY, "true");
  SpreadsheetApp.getUi().alert(
    "Đã bật đo tốc độ",
    "Các mốc đo sẽ được ghi vào sheet " + CONFIG.SHEET_PERF + ".\n\nNên chạy: Xóa log đo → Đồng bộ DANH_SACH_KHACH → mở sidebar → click thử nhiều tên.",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function xoaLogDoTocDo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = damBaoSheetPerf_(ss);
  sh.clear();
  thietLapHeaderPerf_(sh);
  SpreadsheetApp.getUi().alert("Đã xóa log đo tốc độ", "Sheet " + CONFIG.SHEET_PERF + " đã sẵn sàng ghi số đo mới.", SpreadsheetApp.getUi().ButtonSet.OK);
}

function xemBaoCaoTocDo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(CONFIG.SHEET_PERF);
  if (!sh || sh.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert("Chưa có log đo tốc độ", "Hãy bật đo tốc độ và chạy thử quy trình trước.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const lastRow = sh.getLastRow();
  const startRow = Math.max(2, lastRow - PERF_CONFIG.MAX_REPORT_ROWS + 1);
  const values = sh.getRange(startRow, 1, lastRow - startRow + 1, PERF_CONFIG.HEADERS.length).getDisplayValues();
  const stats = {};
  values.forEach(function (row) {
    const stage = row[3] || "(không rõ)";
    const duration = parseFloat(row[4]) || 0;
    if (!stats[stage]) {
      stats[stage] = { count: 0, total: 0, max: 0, last: 0 };
    }
    stats[stage].count++;
    stats[stage].total += duration;
    stats[stage].max = Math.max(stats[stage].max, duration);
    stats[stage].last = duration;
  });

  const lines = Object.keys(stats).sort(function (a, b) {
    return stats[b].max - stats[a].max;
  }).map(function (stage) {
    const s = stats[stage];
    const avg = s.count ? s.total / s.count : 0;
    return stage + ": count " + s.count + ", avg " + avg.toFixed(1) + "ms, max " + s.max.toFixed(1) + "ms, last " + s.last.toFixed(1) + "ms";
  });

  SpreadsheetApp.getUi().alert(
    "Báo cáo tốc độ",
    "Đọc " + values.length + " dòng log gần nhất.\n\n" + lines.join("\n"),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function recordClientPerfEvents(events) {
  if (!isPerfEnabled_() || !events || !events.length) {
    return { logged: 0 };
  }

  const rows = events.map(function (event) {
    return taoPerfRow_(event.stage || "client.unknown", Number(event.durationMs) || 0, {
      session: event.session || "",
      source: "client",
      rows: event.rows || 0,
      cols: event.cols || 0,
      cells: event.cells || 0,
      message: event.message || "",
      meta: event.meta || {}
    }, event.timestamp ? new Date(event.timestamp) : new Date());
  });
  appendPerfRows_(rows);
  return { logged: rows.length };
}

function recordPerfEvent_(stage, startedAt, data) {
  if (!isPerfEnabled_()) return;
  const durationMs = Math.max(0, Date.now() - (startedAt || Date.now()));
  appendPerfRows_([taoPerfRow_(stage, durationMs, data || {}, new Date())]);
}

function isPerfEnabled_() {
  return PropertiesService.getDocumentProperties().getProperty(PERF_CONFIG.ENABLED_KEY) === "true";
}

function taoPerfSessionId_(prefix) {
  return prefix + "-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
}

function taoPerfRow_(stage, durationMs, data, timestamp) {
  data = data || {};
  const rows = Number(data.rows || 0);
  const cols = Number(data.cols || 0);
  const cells = Number(data.cells || (rows && cols ? rows * cols : 0));
  return [
    (timestamp || new Date()).toISOString(),
    data.session || "",
    data.source || "",
    stage || "",
    Number(durationMs || 0),
    rows,
    cols,
    cells,
    data.message || "",
    data.meta ? JSON.stringify(data.meta) : ""
  ];
}

function appendPerfRows_(rows) {
  if (!rows || !rows.length) return;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = damBaoSheetPerf_(ss);
  const startRow = sh.getLastRow() + 1;
  damBaoKichThuocSheet_(sh, startRow + rows.length - 1, PERF_CONFIG.HEADERS.length);
  sh.getRange(startRow, 1, rows.length, PERF_CONFIG.HEADERS.length).setValues(rows);
}

function damBaoSheetPerf_(ss) {
  let sh = ss.getSheetByName(CONFIG.SHEET_PERF);
  if (!sh) {
    sh = ss.insertSheet(CONFIG.SHEET_PERF);
  }
  if (sh.getLastRow() === 0 || sh.getRange(1, 1).getDisplayValue() !== PERF_CONFIG.HEADERS[0]) {
    thietLapHeaderPerf_(sh);
  }
  return sh;
}

function thietLapHeaderPerf_(sh) {
  damBaoKichThuocSheet_(sh, 1, PERF_CONFIG.HEADERS.length);
  sh.getRange(1, 1, 1, PERF_CONFIG.HEADERS.length)
    .setValues([PERF_CONFIG.HEADERS])
    .setFontWeight("bold")
    .setBackground("#188038")
    .setFontColor("white")
    .setHorizontalAlignment("center");
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 170);
  sh.setColumnWidth(2, 190);
  sh.setColumnWidth(3, 130);
  sh.setColumnWidth(4, 160);
  sh.setColumnWidth(5, 95);
  sh.setColumnWidth(9, 220);
  sh.setColumnWidth(10, 300);
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
