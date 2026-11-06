import "./home.css";
import { json } from "d3";
import { loadRecords, type Dictionary } from "./data";
import {
  partition,
  format,
  label,
  escape,
  dimensions,
  type Dimension,
  type Cohort,
  type SurveyRecord,
} from "./site-packets";
import {
  PacketField,
  gridPositions,
  packetStatus,
  type Position,
} from "./site-field";
import { PacketInspector } from "./site-inspector";
const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
const inspector = new PacketInspector("endfield");
let records: SurveyRecord[] = [],
  groups: Cohort[] = [],
  dimension: Dimension = "role";
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const field = new PacketField(
  $<HTMLCanvasElement>("#archive-field"),
  "endfield",
  (p) => inspector.open(p),
);
const tip = $("#field-tooltip");
field.onHover = (packet, x, y) => {
  tip.hidden = !packet;
  if (packet) {
    tip.innerHTML = `<b>${escape(packet.category)}</b><br>${packet.members.length} records / open unit`;
    tip.style.left = `${Math.max(0, Math.min(field.width - 210, x + 12))}px`;
    tip.style.top = `${Math.max(0, y - 56)}px`;
  }
};
function layout(duration = 360) {
  if (!groups.length) return;
  const w = field.width,
    h = field.height,
    dark = document.documentElement.dataset.theme === "dark";
  let positions: Position[] = [];
  const labels = $("#cluster-labels");
  labels.innerHTML = "";
  // Open archive shelves give small categories enough room for their labels.
  // All packets in one view use the same mark size; counts, not shelf area, encode people.
  const cols =
      groups.length === 1
        ? 1
        : w < 600
          ? 3
          : groups.length <= 4
            ? 2
            : Math.ceil(groups.length / 2),
    rows = Math.ceil(groups.length / cols),
    gap = w < 600 ? 14 : 24;
  const cellW = (w - gap * (cols - 1)) / cols,
    cellH = (h - gap * (rows - 1)) / rows;
  const largest = Math.max(...groups.map((g) => g.packets.length)),
    maxColumns = Math.max(
      1,
      Math.ceil(Math.sqrt((largest * cellW) / Math.max(12, cellH - 36))),
    ),
    maxRows = Math.ceil(largest / maxColumns);
  const step = Math.min(cellW / maxColumns, Math.max(12, cellH - 36) / maxRows),
    markSize = Math.min(step * 0.57, 11);
  for (const [index, group] of groups.entries()) {
    const x = (index % cols) * (cellW + gap),
      y = Math.floor(index / cols) * (cellH + gap);
    const color = dark ? "#a9aaa6" : "#737570";
    positions.push(
      ...group.packets.map((packet, i) => ({
        packet,
        x: x + ((i % maxColumns) + 0.5) * step,
        y: y + 34 + (Math.floor(i / maxColumns) + 0.5) * step,
        size: markSize,
        color,
      })),
    );
    const b = document.createElement("button");
    b.className = "cluster-label";
    b.style.left = `${x}px`;
    b.style.top = `${y}px`;
    b.style.width = `${cellW}px`;
    b.setAttribute(
      "aria-label",
      `Browse ${label(group.name, dimension)}, ${format(group.count)} respondents`,
    );
    b.innerHTML = `<strong>${escape(label(group.name, dimension))}</strong><span>${format(group.count)}</span>`;
    b.addEventListener("click", () => inspector.open(group.packets[0]));
    labels.append(b);
  }
  const uniformSize = Math.min(...positions.map((p) => p.size));
  field.set(
    positions.map((p) => ({ ...p, size: uniformSize })),
    duration,
  );
}
field.onResize = () => layout(0);
function regroup(next: Dimension) {
  dimension = next;
  groups = partition(records, dimension);
  inspector.setGroups(groups);
  $("#dimension-buttons")
    .querySelectorAll("button")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.dimension === dimension)),
    );
  $("#field-heading").textContent =
    `${dimensions.find((d) => d.key === dimension)!.name} / all respondents`;
  $("#unit-count").textContent = packetStatus(groups).split(" / ")[0];
  $("#group-note").textContent =
    dimension === "all"
      ? "Select any unit to open its records."
      : "Units regroup by category. Select one to see its actual members.";
  layout();
}
$("#dimension-buttons").innerHTML = dimensions
  .map(
    (d, i) =>
      `<button data-dimension="${d.key}" aria-pressed="${d.key === dimension}"><span>${d.name}</span><span class="dimension-index">${String(i + 1).padStart(2, "0")}</span></button>`,
  )
  .join("");
$("#dimension-buttons")
  .querySelectorAll<HTMLButtonElement>("button")
  .forEach(
    (b) => (b.onclick = () => regroup(b.dataset.dimension as Dimension)),
  );
$("#browse-records").onclick = () => inspector.open();
function openDialog(dialog: HTMLDialogElement) {
  dialog.showModal();
  dialog.animate(
    [
      { clipPath: "inset(0 0 100% 0)", opacity: 0.2 },
      { clipPath: "inset(0)", opacity: 1 },
    ],
    { duration: reduced.matches ? 0 : 280, easing: "cubic-bezier(.7,0,.2,1)" },
  );
}
async function closeDialog(dialog: HTMLDialogElement) {
  await dialog.animate(
    [
      { transform: "translateY(0)", opacity: 1 },
      { transform: "translateY(18px)", opacity: 0 },
    ],
    { duration: reduced.matches ? 0 : 180, easing: "cubic-bezier(.7,0,.2,1)" },
  ).finished;
  dialog.close();
}
for (const id of ["#alex-dialog", "#data-dialog"]) {
  const dialog = $<HTMLDialogElement>(id);
  dialog.querySelector<HTMLButtonElement>(".sheet-close")!.onclick = () =>
    closeDialog(dialog);
  dialog.oncancel = (e) => {
    e.preventDefault();
    closeDialog(dialog);
  };
  dialog.onclick = (e) => {
    if (e.target === dialog) closeDialog(dialog);
  };
}
$("#alex-intro").onclick = () =>
  openDialog($<HTMLDialogElement>("#alex-dialog"));
$("#about-data").onclick = () =>
  openDialog($<HTMLDialogElement>("#data-dialog"));
$("#locate-students").onclick = async () => {
  await closeDialog($<HTMLDialogElement>("#alex-dialog"));
  regroup("role");
  const students = groups.find((g) => g.name === "Student");
  if (students) inspector.open(students.packets[0]);
};
$("#theme-toggle").onclick = () => {
  const dark = document.documentElement.dataset.theme !== "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  $("#theme-toggle").setAttribute(
    "aria-label",
    dark ? "Switch to light theme" : "Switch to dark theme",
  );
  layout(0);
};
function entrance() {
  const shell = $(".home-shell");
  shell.classList.remove("entering");
  void shell.offsetHeight;
  shell.classList.add("entering");
  layout(520);
}
$("#replay-entry").onclick = entrance;
async function init() {
  $("#dimension-buttons")
    .querySelectorAll<HTMLButtonElement>("button")
    .forEach((b) => (b.disabled = true));
  $<HTMLButtonElement>("#browse-records").disabled = true;
  $<HTMLButtonElement>("#alex-intro").disabled = true;
  try {
    const dictionary = await json<Dictionary>("./data/field-dictionary.json");
    if (!dictionary) throw Error("Missing field dictionary");
    const original = await loadRecords(2024, dictionary);
    const named = [
      "Back-end",
      "Desktop / enterprise",
      "Embedded",
      "Front-end",
      "Full-stack",
      "Mobile",
      "Student",
    ];
    records = original.map((r) => ({
      id: r.id,
      role: r.roleRaw
        ? named.includes(r.role)
          ? r.role
          : "Other reported roles"
        : "Unknown",
      roleRaw: r.roleRaw || "Not reported",
      experience:
        r.codingYears === null
          ? "Unknown"
          : r.codingYears < 1
            ? "<1"
            : r.codingYears <= 2
              ? "1–2"
              : r.codingYears <= 5
                ? "3–5"
                : r.codingYears <= 10
                  ? "6–10"
                  : r.codingYears <= 20
                    ? "11–20"
                    : r.codingYears <= 30
                      ? "21–30"
                      : "31+",
      education: r.education,
      country: r.country,
      pay: r.pay,
      languages: r.used,
      ai: r.ai,
    }));
    if (
      records.length !== 65437 ||
      new Set(records.map((r) => r.id)).size !== records.length
    )
      throw Error("Survey identity check failed");
    regroup(dimension);
    $("#field-total").textContent =
      `${format(records.length)} responses / 2024`;
    $("#field-loading").hidden = true;
    $("#dimension-buttons")
      .querySelectorAll<HTMLButtonElement>("button")
      .forEach((b) => (b.disabled = false));
    $<HTMLButtonElement>("#browse-records").disabled = false;
    $<HTMLButtonElement>("#alex-intro").disabled = false;
  } catch (error) {
    const message = $("#field-loading");
    message.innerHTML =
      'The survey could not load.<button class="ef-btn">Try again</button>';
    message.querySelector("button")!.onclick = () => {
      message.textContent = "Loading the survey…";
      init();
    };
    console.error(error);
  }
}
entrance();
init();
