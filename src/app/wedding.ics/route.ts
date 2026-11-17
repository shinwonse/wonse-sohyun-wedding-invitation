import { icsTime, weddingEvent } from "@/lib/calendar-event";

/** RFC 5545 text escaping. */
const escape = (s: string) => s.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

/** Lines longer than 75 octets are folded (CRLF + space) without splitting a multi-byte character. */
function fold(line: string) {
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = Buffer.byteLength(ch);
    if (bytes + size > (out.length ? 74 : 75)) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

/**
 * DTSTAMP: when this iCalendar object was created (RFC 5545 §3.8.7.2), not the event time.
 * Fixed rather than `new Date()` so the route stays prerendered under cacheComponents.
 * Increment SEQUENCE (and bump DTSTAMP) whenever the event details change.
 */
const DTSTAMP = icsTime(new Date("2026-11-16T20:15:43+09:00")); // d8bda27

/** "Add to calendar" file for the ceremony (with a reminder the day before). Static, built once. */
export function GET() {
  const e = weddingEvent();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//wonse-sohyun//wedding-invitation//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:wedding-20270227T060000Z@wonse-sohyun",
    `DTSTAMP:${DTSTAMP}`,
    "SEQUENCE:1",
    `DTSTART:${icsTime(e.start)}`,
    `DTEND:${icsTime(e.end)}`,
    `SUMMARY:${escape(e.title)}`,
    `LOCATION:${escape(e.location)}`,
    `DESCRIPTION:${escape(e.details)}`,
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escape(`내일은 ${e.title} 날이에요`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="wonse-sohyun-wedding.ics"',
    },
  });
}
