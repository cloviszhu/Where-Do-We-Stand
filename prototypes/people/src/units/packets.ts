/** A visual packet is a view-specific partition of actual survey records.
 * It is never a synthetic respondent and never crosses a category boundary. */
export type SurveyRecord = {
  id: string;
  role: string;
  roleRaw: string;
  experience: string;
  education: string;
  country: string;
  pay: number | null;
  languages: string[];
  ai: string;
};
export type Dimension = "all" | "role" | "experience" | "education" | "ai";
export type Packet = { id: string; category: string; members: SurveyRecord[] };
export type Cohort = { name: string; count: number; packets: Packet[] };
export const dimensions: { key: Dimension; name: string }[] = [
  { key: "all", name: "Everyone" },
  { key: "role", name: "Role" },
  { key: "experience", name: "Experience" },
  { key: "education", name: "Education" },
  { key: "ai", name: "AI use" },
];
export function partition(
  records: SurveyRecord[],
  dimension: Dimension,
): Cohort[] {
  const groups = new Map<string, SurveyRecord[]>();
  for (const record of records) {
    const key =
      dimension === "all"
        ? "All respondents"
        : record[dimension] || "Not reported";
    const list = groups.get(key);
    if (list) list.push(record);
    else groups.set(key, [record]);
  }
  return [...groups]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([name, members]) => ({
      name,
      count: members.length,
      packets: Array.from(
        { length: Math.ceil(members.length / 50) },
        (_, i) => ({
          id: `${dimension}:${name}:${i}`,
          category: name,
          members: members.slice(i * 50, (i + 1) * 50),
        }),
      ),
    }));
}
export const format = (n: number) => n.toLocaleString("en-US");
export const escape = (s: unknown) =>
  String(s ?? "Not reported").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function label(name: string, dimension: Dimension): string {
  if (dimension === "experience" && !["Unknown", "Not reported"].includes(name))
    return `${name} years`;
  if (dimension === "ai")
    return (
      (
        {
          Yes: "Uses AI",
          "No, and I don't plan to": "No plans to use AI",
          "No, but I plan to soon": "Plans to use AI",
        } as Record<string, string>
      )[name] || name
    );
  return name;
}
