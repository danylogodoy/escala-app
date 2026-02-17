function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function normRange(startMin: number, endMin: number): [number, number] {
  if (endMin <= startMin) return [startMin, endMin + 24 * 60];
  return [startMin, endMin];
}

function overlap(a0: number, a1: number, b0: number, b1: number): number {
  const s = Math.max(a0, b0);
  const e = Math.min(a1, b1);
  return Math.max(0, e - s);
}

export function calcMinutesDayNight(startHHMM: string, endHHMM: string) {
  const s0 = toMinutes(startHHMM);
  const e0 = toMinutes(endHHMM);
  const [s, e] = normRange(s0, e0);

  let day = 0;
  let night = 0;

  const firstDayStart = Math.floor(s / (24 * 60)) * 24 * 60;
  const lastDayStart = Math.floor((e - 1) / (24 * 60)) * 24 * 60;

  for (let d = firstDayStart; d <= lastDayStart; d += 24 * 60) {
    const dayStart = d + 7 * 60;
    const dayEnd = d + 19 * 60;

    const night1Start = d + 19 * 60;
    const night1End = d + 24 * 60;

    const night2Start = d + 0;
    const night2End = d + 7 * 60;

    day += overlap(s, e, dayStart, dayEnd);
    night += overlap(s, e, night1Start, night1End);
    night += overlap(s, e, night2Start, night2End);
  }

  return { minutesDay: day, minutesNight: night };
}
