export function restByUidFromLeaves(leaves) {
  const m = new Map();
  for (const l of leaves) {
    if (!l || l.status !== "submitted") continue;
    m.set(l.uid, new Set(l.dates || []));
  }
  return m;
}
export function restByUidFromFinals(finalsDays) {
  const m = new Map();
  for (const [date, byUid] of Object.entries(finalsDays || {})) {
    for (const [uid, shiftId] of Object.entries(byUid || {})) {
      if (shiftId !== "REST") continue;
      if (!m.has(uid)) m.set(uid, new Set());
      m.get(uid).add(date);
    }
  }
  return m;
}
export function findConflicts(groups, restByUid) {
  const out = [];
  for (const g of (groups || []).filter((g) => g.active !== false)) {
    const byDate = new Map();
    for (const uid of g.memberUids || []) {
      const dates = restByUid.get(uid);
      if (!dates) continue;
      for (const d of dates) {
        if (!byDate.has(d)) byDate.set(d, []);
        byDate.get(d).push(uid);
      }
    }
    for (const [date, uids] of [...byDate.entries()].sort()) {
      if (uids.length >= 2) out.push({ groupId: g.id, groupName: g.name, date, uids: [...uids].sort() });
    }
  }
  return out;
}
