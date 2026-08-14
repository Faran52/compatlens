// The panel lives in a DevTools tab under the page it is inspecting. Both panes below are live
// iframes of the real thing; only the window chrome and the tab strip are drawn here.
const TABS = ['Elements', 'Console', 'Sources', 'Network', 'Performance', 'Application'];

const THEMES = {
  dark: {
    window: '#202124',
    chrome: '#292a2d',
    strip: '#292a2d',
    border: '#3c4043',
    text: '#9aa0a6',
    active: '#8ab4f8',
    address: '#35363a',
    addressText: '#bdc1c6',
  },
  light: {
    window: '#dee1e6',
    chrome: '#f1f3f4',
    strip: '#f1f3f4',
    border: '#d0d3d7',
    text: '#5f6368',
    active: '#1a73e8',
    address: '#ffffff',
    addressText: '#3c4043',
  },
};

const dot = (colour) => {
  return `<span style="width:12px;height:12px;border-radius:50%;background:${colour};display:inline-block"></span>`;
};

export const devtoolsFrame = ({
  pageUrl,
  panelUrl,
  theme,
  address,
}) => {
  const t = THEMES[theme];
  const tabs = TABS.map((name) => {
    return `<span style="padding:0 12px;line-height:28px;color:${t.text}">${name}</span>`;
  }).join('');

  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; background: ${t.window}; }
  body { font: 12px -apple-system, "Segoe UI", system-ui, sans-serif; }
  .window { height: 100%; display: flex; flex-direction: column; }
  .titlebar { background: ${t.chrome}; padding: 10px 12px; display: flex; gap: 8px; align-items: center; }
  .address { flex: 1; background: ${t.address}; color: ${t.addressText}; border-radius: 14px;
    padding: 5px 14px; font-size: 12px; }
  .page { flex: 1; border: 0; width: 100%; background: #fff; }
  .devtools { height: 62%; display: flex; flex-direction: column; border-top: 1px solid ${t.border}; }
  .strip { background: ${t.strip}; display: flex; align-items: center; border-bottom: 1px solid ${t.border}; }
  .active { padding: 0 12px; line-height: 28px; color: ${t.active};
    border-bottom: 2px solid ${t.active}; font-weight: 600; }
  .panel { flex: 1; border: 0; width: 100%; }
</style></head>
<body><div class="window">
  <div class="titlebar">
    ${dot('#ff5f57')}${dot('#febc2e')}${dot('#28c840')}
    <div class="address">${address}</div>
  </div>
  <iframe class="page" src="${pageUrl}" title="The page being inspected"></iframe>
  <div class="devtools">
    <div class="strip">${tabs}<span class="active">CompatLens</span></div>
    <iframe class="panel" src="${panelUrl}" title="The CompatLens panel"></iframe>
  </div>
</div></body></html>`;
};
