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
