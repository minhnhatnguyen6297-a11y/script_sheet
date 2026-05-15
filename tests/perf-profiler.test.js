const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const gsPath = path.join(root, "danh_sach_kh_v4.gs");
const htmlPath = path.join(root, "SidebarTraCuu.html");
const agentPath = path.join(root, "agent.md");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function loadServerExports(exportNames) {
  const source = read(gsPath);
  const exportBody = exportNames
    .map((name) => `${name}: typeof ${name} !== "undefined" ? ${name} : undefined`)
    .join(",");
  return new Function(`${source}\nreturn {${exportBody}};`)();
}

test("project guidance records the customer lookup constraints", () => {
  const text = read(agentPath);
  assert.match(text, /DANH_SACH_KHACH.*raw index/i);
  assert.match(text, /Không tóm tắt\/gộp mất dữ liệu/i);
  assert.match(text, /NGUON_DU_LIEU/);
  assert.match(text, /baseline/i);
});

test("server profiler exposes menu actions and excludes the log sheet from sync", () => {
  const source = read(gsPath);
  assert.match(source, /SHEET_PERF:\s*"QLKH_PERF_LOG"/);
  assert.match(source, /addItem\("📊 Bật đo tốc độ",\s*"batDoTocDo"\)/);
  assert.match(source, /addItem\("🧹 Xóa log đo",\s*"xoaLogDoTocDo"\)/);
  assert.match(source, /addItem\("📈 Xem báo cáo tốc độ",\s*"xemBaoCaoTocDo"\)/);
  assert.match(source, /function batDoTocDo\(\)/);
  assert.match(source, /function xoaLogDoTocDo\(\)/);
  assert.match(source, /function xemBaoCaoTocDo\(\)/);
  assert.match(source, /function recordPerfEvent_/);
  assert.match(source, /function recordClientPerfEvents/);
  assert.match(source, /sheetName === CONFIG\.SHEET_PERF/);
});

test("server code records key stages for bottleneck analysis", () => {
  const source = read(gsPath);
  [
    "sync.total",
    "sync.source.open",
    "sync.sheet.read",
    "sync.output.write",
    "selection.total",
    "state.read",
    "state.write",
    "index.load"
  ].forEach((stage) => assert.match(source, new RegExp(stage.replace(".", "\\."))));
});

test("sidebar records and flushes client-side timing without using getLookupResults", () => {
  const html = read(htmlPath);
  assert.match(html, /function recordClientPerf/);
  assert.match(html, /function flushClientPerf/);
  assert.match(html, /loadIndex\.roundTrip/);
  assert.match(html, /loadIndex\.buildMap/);
  assert.match(html, /state\.roundTrip/);
  assert.match(html, /lookup\.filter/);
  assert.match(html, /lookup\.render/);
  assert.match(html, /\.recordClientPerfEvents\(/);
  assert.doesNotMatch(html, /\.getLookupResults\(/);
});

test("active-cell button lookup bypasses polling state and logs its own timing", () => {
  const source = read(gsPath);
  const html = read(htmlPath);

  assert.match(source, /function getActiveCellLookupState\(\)/);
  assert.match(source, /getCurrentCell\(\)/);
  assert.match(source, /getActiveRange\(\)/);
  assert.match(source, /button\.activeCell/);

  assert.match(html, /Tra cứu ô đang chọn/);
  assert.match(html, /id="lookupActiveBtn"/);
  assert.match(html, /function lookupActiveCell\(\)/);
  assert.match(html, /\.getActiveCellLookupState\(/);
  assert.match(html, /button\.roundTrip/);
  assert.match(html, /renderClientLookup\(state\)/);
});

test("Apps Script and sidebar JavaScript still parse locally", () => {
  new Function(read(gsPath));
  const html = read(htmlPath);
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, "Sidebar script block is present");
  new Function(match[1]);
});

test("workflow config uses approved step names and stores tasks on source month sheets", () => {
  const source = read(gsPath);
  assert.doesNotMatch(source, /SHEET_CONG_VIEC/);
  assert.doesNotMatch(source, /damBaoSheetCongViec_/);
  assert.match(source, /TASK_HEADER_PREFIX:\s*"[^"]*ghi "/);
  assert.match(source, /LEGACY_WORKFLOW_SHEETS:\s*\["QLKH",\s*"DANH_SACH_CHUNG"\]/);
  assert.match(source, /SHEET_CANH_BAO:\s*"CANH_BAO_HAN"/);
  assert.match(source, /function layWorkflowTargetTuState_/);
  assert.match(source, /appendWorkflowTaskCell_\(target\.sheet,\s*target\.rowNum/);
  assert.match(source, /function forEachWorkflowSourceSheet_/);
  assert.match(source, /sheetName === WORKFLOW_CONFIG\.SHEET_CANH_BAO/);

  const { WORKFLOW_CONFIG } = loadServerExports(["WORKFLOW_CONFIG"]);
  assert.ok(WORKFLOW_CONFIG);
  assert.strictEqual(WORKFLOW_CONFIG.SHEET_CONG_VIEC, undefined);
  assert.deepStrictEqual(WORKFLOW_CONFIG.LEGACY_WORKFLOW_SHEETS, ["QLKH", "DANH_SACH_CHUNG"]);
  assert.match(WORKFLOW_CONFIG.TASK_HEADER_PREFIX, /ghi $/);
  assert.deepStrictEqual(
    WORKFLOW_CONFIG.STEPS.map((step) => [step.code, step.label]),
    [
      ["NOP_HS", "Nộp HS"],
      ["TB_THUE", "TB thuế"],
      ["DA_NOP_THUE", "Đã nộp thuế"],
      ["CO_SO", "Có sổ"],
      ["TRA_HS", "Trả HS"],
      ["DINH_CHINH", "Đính chính"],
      ["NOP_DC", "Nộp ĐC"],
      ["DC_XONG", "ĐC xong"],
      ["PHAT_SINH", "Phát sinh"]
    ]
  );
});

test("sync output filters junk, duplicate, and accounting-only source headers", () => {
  const { taoHeaderDescriptors_ } = loadServerExports(["taoHeaderDescriptors_"]);
  assert.strictEqual(typeof taoHeaderDescriptors_, "function");

  const descriptors = taoHeaderDescriptors_([
    "Ngày nhận hồ sơ",
    "Tên khách hàng",
    "Địa chỉ",
    "SĐT",
    "Loại hồ sơ",
    "Yêu Cầu",
    "Trạng thái",
    "Thù Lao",
    "Người làm hồ sơ",
    "Người nhận uỷ quyền",
    "Ngày nộp HS",
    "Mã HS",
    "Ghi chú",
    "Ghi chú",
    "ngày dự kiến sang thuế",
    "Ngày",
    "Thu",
    "Chi",
    "Column 6",
    "",
    "Bản ghi 1"
  ]).filter(Boolean);

  assert.deepStrictEqual(
    descriptors.map((descriptor) => descriptor.label),
    [
      "Ngày nhận hồ sơ",
      "Tên khách hàng",
      "Địa chỉ",
      "SĐT",
      "Loại hồ sơ",
      "Yêu Cầu",
      "Trạng thái",
      "Thù Lao",
      "Người làm hồ sơ",
      "Người nhận uỷ quyền",
      "Ngày nộp HS",
      "Mã HS",
      "Ghi chú",
      "Bản ghi 1"
    ]
  );
  assert.ok(!descriptors.some((descriptor) => /\(\d+\)$/.test(descriptor.label)));
});

test("workflow rule durations split the main service by cumulative percentages and fixed correction windows", () => {
  const {
    tinhSoNgayBuocWorkflow_,
    tinhTatCaSoNgayRuleChinh_
  } = loadServerExports(["tinhSoNgayBuocWorkflow_", "tinhTatCaSoNgayRuleChinh_"]);

  assert.strictEqual(typeof tinhSoNgayBuocWorkflow_, "function");
  assert.strictEqual(typeof tinhTatCaSoNgayRuleChinh_, "function");

  assert.deepStrictEqual(tinhTatCaSoNgayRuleChinh_(15), {
    NOP_HS: 6,
    TB_THUE: 1,
    DA_NOP_THUE: 8
  });
  assert.deepStrictEqual(tinhTatCaSoNgayRuleChinh_(30), {
    NOP_HS: 12,
    TB_THUE: 2,
    DA_NOP_THUE: 16
  });
  assert.deepStrictEqual(tinhTatCaSoNgayRuleChinh_(90), {
    NOP_HS: 36,
    TB_THUE: 5,
    DA_NOP_THUE: 49
  });

  assert.strictEqual(tinhSoNgayBuocWorkflow_("DINH_CHINH", 15), 10);
  assert.strictEqual(tinhSoNgayBuocWorkflow_("NOP_DC", 15), 3);
  assert.strictEqual(tinhSoNgayBuocWorkflow_("DC_XONG", 15), 7);
});

test("workflow task cells stay compact and parse enough data for coloring", () => {
  const {
    taoNoiDungTaskCell_,
    parseWorkflowTaskCell_
  } = loadServerExports(["taoNoiDungTaskCell_", "parseWorkflowTaskCell_"]);

  assert.strictEqual(typeof taoNoiDungTaskCell_, "function");
  assert.strictEqual(typeof parseWorkflowTaskCell_, "function");

  const taskText = taoNoiDungTaskCell_({
    code: "NOP_HS",
    startDate: new Date(2026, 0, 1),
    endDate: new Date(2026, 0, 7),
    done: false
  });
  assert.strictEqual(taskText, "NOP_HS 01/01-07/01");

  const flexText = taoNoiDungTaskCell_({
    code: "PHAT_SINH",
    note: "Gọi giấy",
    startDate: new Date(2026, 4, 14),
    endDate: new Date(2026, 4, 17),
    done: false
  });
  assert.strictEqual(flexText, "PHAT_SINH Gọi giấy 14/05-17/05");

  assert.deepStrictEqual(parseWorkflowTaskCell_("✓ NOP_HS 01/01-07/01", 2026), {
    done: true,
    code: "NOP_HS",
    note: "",
    startDate: "2026-01-01",
    endDate: "2026-01-07"
  });
  assert.deepStrictEqual(parseWorkflowTaskCell_(flexText, 2026), {
    done: false,
    code: "PHAT_SINH",
    note: "Gọi giấy",
    startDate: "2026-05-14",
    endDate: "2026-05-17"
  });
});

test("workflow alert levels escalate per task and completed cells stay white", () => {
  const { tinhMocCanhBaoTask_, layMauMocCanhBao_ } = loadServerExports([
    "tinhMocCanhBaoTask_",
    "layMauMocCanhBao_"
  ]);

  assert.strictEqual(typeof tinhMocCanhBaoTask_, "function");
  assert.strictEqual(typeof layMauMocCanhBao_, "function");

  assert.strictEqual(
    tinhMocCanhBaoTask_("NOP_HS 01/01-07/01", new Date(2026, 0, 1)),
    "GREEN"
  );
  assert.strictEqual(
    tinhMocCanhBaoTask_("NOP_HS 01/01-07/01", new Date(2026, 0, 3)),
    "YELLOW"
  );
  assert.strictEqual(
    tinhMocCanhBaoTask_("NOP_HS 01/01-07/01", new Date(2026, 0, 4)),
    "ORANGE"
  );
  assert.strictEqual(
    tinhMocCanhBaoTask_("NOP_HS 01/01-07/01", new Date(2026, 0, 7)),
    "RED"
  );
  assert.strictEqual(
    tinhMocCanhBaoTask_("✓ NOP_HS 01/01-07/01", new Date(2026, 0, 7)),
    "DONE"
  );

  assert.strictEqual(layMauMocCanhBao_("DONE"), "#ffffff");
  assert.strictEqual(layMauMocCanhBao_("ORANGE"), "#fbbc04");
  assert.strictEqual(layMauMocCanhBao_("RED"), "#ea4335");
});

test("sidebar exposes lookup, task scheduling, and alert tabs backed by server calls", () => {
  const html = read(htmlPath);
  assert.match(html, /data-tab="lookup"/);
  assert.match(html, /data-tab="task"/);
  assert.match(html, /data-tab="alerts"/);
  assert.match(html, /Hẹn việc/);
  assert.match(html, /Cảnh báo/);
  assert.doesNotMatch(html, /QLKH|DANH_SACH_CHUNG/);
  assert.match(html, /\.saveWorkflowTask\(/);
  assert.match(html, /\.getWorkflowSidebarData\(/);
  assert.match(html, /\.openWorkflowRow\(/);
});
