import {
  escape as e,
  format,
  type Cohort,
  type Packet,
  type SurveyRecord,
} from "./packets";
import type {Person} from '../data.ts';

/** Native dialog retains focus trapping, Escape, and a keyboard route to every record. */
export class PacketInspector {
  dialog: HTMLDialogElement;
  groups: Cohort[] = [];
  selected: Packet | null = null;
  returnFocus: HTMLElement | null = null;
  constructor(private variant: "retro" | "endfield") {
    this.dialog = document.createElement("dialog");
    this.dialog.className = `packet-inspector ${variant}`;
    this.dialog.setAttribute("aria-labelledby", "inspector-heading");
    document.body.append(this.dialog);
    this.dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.close();
    });
    this.dialog.addEventListener("click", (event) => {
      if (event.target === this.dialog) this.close();
    });
  }
  setGroups(groups: Cohort[]) {
    this.groups = groups;
  }
  open(packet?: Packet) {
    this.returnFocus = document.activeElement as HTMLElement;
    this.selected = packet || this.groups[0]?.packets[0];
    if (!this.selected) return;
    this.render();
    if (!this.dialog.open) this.dialog.showModal();
    this.dialog.animate(
      [
        {
          opacity: 0,
          transform: "translateY(24px)",
          clipPath: "inset(0 0 22% 0)",
        },
        { opacity: 1, transform: "translateY(0)", clipPath: "inset(0)" },
      ],
      {
        duration: this.reduced() ? 0 : this.variant === "retro" ? 420 : 280,
        easing: "cubic-bezier(.16,1,.3,1)",
      },
    );
  }
  reduced() {
    return matchMedia("(prefers-reduced-motion: reduce)").matches || document.body.classList.contains('motion-paused');
  }
  async close() {
    await this.dialog.animate(
      [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(18px)" },
      ],
      { duration: this.reduced() ? 0 : 180, easing: "cubic-bezier(.7,0,.2,1)" },
    ).finished;
    this.dialog.close();
    this.returnFocus?.focus({preventScroll:true});
  }
  render() {
    const packet = this.selected!;
    const group = this.groups.find((g) => g.name === packet.category)!;
    const packetIndex = group.packets.indexOf(packet);
    this.dialog.innerHTML = `<div class="inspector-shell"><header class="inspector-top"><div><span class="eyebrow">2024 / Survey records</span><h2 id="inspector-heading">${e(packet.category)}</h2></div><button class="inspector-close" aria-label="Close records">×</button></header>
      <div class="inspector-controls"><label>Group<select id="inspect-group" aria-label="Group">${this.groups.map((g) => `<option value="${e(g.name)}" ${g === group ? "selected" : ""}>${e(g.name)} / ${format(g.count)}</option>`).join("")}</select></label>
      <label>Unit<select id="inspect-unit" aria-label="Unit">${group.packets.map((p, i) => `<option value="${i}" ${p === packet ? "selected" : ""}>${i + 1} of ${group.packets.length} / ${p.members.length} records</option>`).join("")}</select></label></div>
      <p class="inspector-note">${packet.members.length} actual responses in this unit. Select a record to read its reported background.</p>
      <div class="inspector-body"><div class="record-list" aria-label="Records in selected unit">${packet.members.map((r, i) => `<button class="record-row" data-record="${i}"><span>${e(r.id)}</span><strong>${e(r.role)}</strong><span>${r.experience === "Unknown" ? "Not reported" : `${e(r.experience)} yr`}</span></button>`).join("")}</div><div class="record-detail" aria-live="polite"></div></div>
      <footer class="inspector-footer"><span>Unit ${packetIndex + 1} / ${group.packets.length}</span><span>Anonymous responses / no invented profiles</span></footer></div>`;
    this.dialog
      .querySelector(".inspector-close")!
      .addEventListener("click", () => this.close());
    this.dialog
      .querySelector("#inspect-group")!
      .addEventListener("change", (event) => {
        this.selected = this.groups.find(
          (g) => g.name === (event.target as HTMLSelectElement).value,
        )!.packets[0];
        this.render();
        (this.dialog.querySelector("#inspect-group") as HTMLElement).focus();
      });
    this.dialog
      .querySelector("#inspect-unit")!
      .addEventListener("change", (event) => {
        this.selected =
          group.packets[+(event.target as HTMLSelectElement).value];
        this.render();
        (this.dialog.querySelector("#inspect-unit") as HTMLElement).focus();
      });
    this.dialog
      .querySelectorAll<HTMLButtonElement>("[data-record]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          this.detail(packet.members[+button.dataset.record!]),
        ),
      );
    this.detail(packet.members[0]);
  }
  detail(record: SurveyRecord) {
    const raw=record as Person;
    this.dialog
      .querySelectorAll<HTMLButtonElement>("[data-record]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(this.selected!.members[+b.dataset.record!].id === record.id),
        ),
      );
    const detail = this.dialog.querySelector<HTMLElement>(".record-detail")!;
    detail.innerHTML = `<span class="eyebrow">Respondent ${e(record.id)}</span><h3>${e(record.roleRaw || record.role)}</h3><dl>${[
      ["Country", record.country],
      [
        "Professional coding",
        record.experience === "Unknown"
          ? "Not reported"
          : raw.experienceRaw || `${record.experience} years`,
      ],
      ["Education", raw.educationRaw || record.education],
      ["Coding context",raw.status || 'Not reported'],
      ["AI use", record.ai],
      ["AI accuracy trust",raw.trust || 'Not reported'],
      ["Languages", record.languages.join(", ") || "Not reported"],
      ["Want to use next year",raw.wanted?.join(', ') || 'Not reported'],
      [
        "Annual compensation",
        record.pay === null ? "Not reported" : `US$${format(record.pay)}`,
      ],
    ]
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${e(v)}</dd></div>`)
      .join(
        "",
      )}</dl><p class="detail-source">Self-reported in the Stack Overflow Developer Survey 2024. One response describes one person's circumstances, not a career forecast.</p>`;
    detail.animate(
      [
        { opacity: 0.2, transform: "translateX(10px)" },
        { opacity: 1, transform: "translateX(0)" },
      ],
      {
        duration: this.reduced() ? 0 : 240,
        easing: "cubic-bezier(.16,1,.3,1)",
      },
    );
  }
}
