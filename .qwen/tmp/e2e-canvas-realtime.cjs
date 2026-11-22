/* E2E check for the realtime canvas collaboration path (cursors + page sync). */
const { io } = require('/Users/poulamisaha/coding/friday/frontend/node_modules/socket.io-client');
const BASE = 'http://localhost:4000';

let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log(`PASS  ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}`, extra !== undefined ? JSON.stringify(extra) : '');
  }
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + '/api' + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, headers: res.headers };
}

function tokenFromCookie(headers) {
  const m = (headers.get('set-cookie') || '').match(/friday_token=([^;]+)/);
  return m ? m[1] : null;
}

function waitFor(socket, event, ms = 4000) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    socket.once(event, (data) => {
      clearTimeout(t);
      resolve(data);
    });
  });
}

async function main() {
  // 1. Two dev users + one outsider.
  const stamp = Date.now().toString(36);
  const alice = (await api('/auth/dev-login', { method: 'POST', body: { username: `e2e-alice-${stamp}` } })).json;
  const bob = (await api('/auth/dev-login', { method: 'POST', body: { username: `e2e-bob-${stamp}` } })).json;
  const mallory = (await api('/auth/dev-login', { method: 'POST', body: { username: `e2e-mallory-${stamp}` } })).json;
  const aliceToken = tokenFromCookie((await api('/auth/dev-login', { method: 'POST', body: { username: `e2e-alice-${stamp}` } })).headers);
  const bobToken = tokenFromCookie((await api('/auth/dev-login', { method: 'POST', body: { username: `e2e-bob-${stamp}` } })).headers);
  const malloryToken = tokenFromCookie((await api('/auth/dev-login', { method: 'POST', body: { username: `e2e-mallory-${stamp}` } })).headers);
  check('dev-login returns users', alice?.user?.id && bob?.user?.id && mallory?.user?.id, { alice, bob, mallory });

  // 2. Alice creates a band, Bob joins with the code, Mallory stays out.
  const created = await api('/bands', { method: 'POST', token: aliceToken, body: { name: `E2E Canvas ${stamp}` } });
  check('band created', created.status === 201 || created.status === 200, created.json);
  const band = created.json;
  const joined = await api('/bands/join', { method: 'POST', token: bobToken, body: { joinCode: band.joinCode } });
  check('bob joined band', joined.status === 200 || joined.status === 201, joined.json);

  // 3. Ensure the canvas has a page (auto-created on first access).
  const canvas = await api(`/bands/${band.id}/canvas`, { token: aliceToken });
  const page = canvas.json?.pages?.[0];
  check('canvas page exists', !!page, canvas.json?.pages);

  // 4. Sockets.
  const aliceSock = io(BASE, { auth: { token: aliceToken }, transports: ['websocket'] });
  const bobSock = io(BASE, { auth: { token: bobToken }, transports: ['websocket'] });
  const mallorySock = io(BASE, { auth: { token: malloryToken }, transports: ['websocket'] });
  await Promise.all([aliceSock, bobSock, mallorySock].map((s) => waitFor(s, 'connect')));
  check('all sockets connected', aliceSock.connected && bobSock.connected && mallorySock.connected);

  // 5. Mallory is denied band join (not a member).
  const deny = await new Promise((resolve) => {
    mallorySock.timeout(4000).emit('join:band', { bandId: band.id }, (err, res) => resolve(res));
  });
  check('non-member join:band denied', deny?.status === 'error', deny);
  mallorySock.close();

  // 6. Alice joins first (presence broadcast reaches only her), then Bob
  // joins — the second broadcast reaches both, carrying both profiles.
  aliceSock.emit('join:band', { bandId: band.id });
  const firstPresence = await waitFor(aliceSock, 'canvas:presence');
  check('alice presence after own join', firstPresence?.members?.some((m) => m.userId === alice.user.id), firstPresence);

  const bobPresence = waitFor(bobSock, 'canvas:presence');
  const alicePresence2 = waitFor(aliceSock, 'canvas:presence');
  bobSock.emit('join:band', { bandId: band.id });
  const bp = await bobPresence;
  await alicePresence2;
  const aliceInBobView = bp?.members?.find((m) => m.userId === alice.user.id);
  check('bob sees alice in presence with profile', !!aliceInBobView, bp);
  check('presence carries signature color', !!aliceInBobView?.color, aliceInBobView);
  check('presence carries display name/avatar fields', 'displayName' in (aliceInBobView || {}) && 'avatarUrl' in (aliceInBobView || {}), aliceInBobView);
  check('bob sees himself in presence', bp?.members?.some((m) => m.userId === bob.user.id), bp);

  // 7. Live cursor: alice moves, bob receives her cursor with her profile.
  const bobCursor = waitFor(bobSock, 'canvas:cursor');
  aliceSock.emit('canvas:cursor', { bandId: band.id, pageId: page.id, x: 123.4, y: -56.7 });
  const cur = await bobCursor;
  check('bob received alice cursor', !!cur, cur);
  check('cursor coordinates relayed (rounded)', cur?.x === 123 && cur?.y === -57, cur);
  check('cursor stamped with alice identity', cur?.userId === alice.user.id && !!cur?.name && !!cur?.color, cur);

  // 8. Cursor hide (pointer left canvas).
  const bobHide = waitFor(bobSock, 'canvas:cursor');
  aliceSock.emit('canvas:cursor', { bandId: band.id, pageId: page.id, x: null, y: null });
  const hid = await bobHide;
  check('cursor hide relayed (null coords)', hid?.x === null && hid?.y === null, hid);

  // 9. Page state sync: alice saves via REST, bob gets the FULL state over the socket.
  const bobSync = waitFor(bobSock, 'canvas:page-state-synced');
  const save = await api(`/bands/${band.id}/canvas/pages/${page.id}/state`, {
    method: 'PUT',
    token: aliceToken,
    body: {
      nodes: [
        { id: `n1-${stamp}`, type: 'TEXT', title: 'Realtime node', x: 10, y: 20, width: 300, height: 120, data: { body: 'hi' } },
        { id: `n2-${stamp}`, type: 'CHECKLIST', title: 'Tasks', x: 400, y: 20, width: 280, height: 160, data: { items: [] } },
      ],
      edges: [{ id: `e1-${stamp}`, source: `n1-${stamp}`, target: `n2-${stamp}`, label: null, relation: 'leads_to', data: {} }],
    },
  });
  check('page state saved via REST', save.status === 200 && save.json?.revision >= 1, save.json);
  const syncEvt = await bobSync;
  check('bob received page-state-synced', !!syncEvt, syncEvt);
  check('sync event carries full nodes', Array.isArray(syncEvt?.nodes) && syncEvt.nodes.length === 2, syncEvt?.nodes);
  check('sync event carries edges', Array.isArray(syncEvt?.edges) && syncEvt.edges.length === 1, syncEvt?.edges);
  check(
    'sync event node content intact',
    syncEvt?.nodes?.some((n) => n.id === `n1-${stamp}` && n.title === 'Realtime node' && n.data?.body === 'hi'),
    syncEvt?.nodes,
  );
  check('sync event identifies author', syncEvt?.updatedBy === alice.user.id, syncEvt?.updatedBy);

  // 10. Node edit locks (soft locks): acquire, steal rejection, release, purge.
  const lockA = `lockA-${stamp}`;
  const lockB = `lockB-${stamp}`;
  const lockC = `lockC-${stamp}`;

  const bobLocks1 = waitFor(bobSock, 'canvas:node-locks');
  aliceSock.emit('canvas:node-lock', { bandId: band.id, nodeId: lockA, acquire: true });
  const l1 = await bobLocks1;
  check(
    'bob sees alice lock a node (with color)',
    l1?.locks?.some((l) => l.nodeId === lockA && l.userId === alice.user.id && !!l.color),
    l1,
  );

  // Alice's lock on A stays; bob's steal attempt is rejected (no broadcast),
  // then bob locks a different node to force a state broadcast.
  const bobLocks2 = waitFor(bobSock, 'canvas:node-locks');
  bobSock.emit('canvas:node-lock', { bandId: band.id, nodeId: lockA, acquire: true });
  bobSock.emit('canvas:node-lock', { bandId: band.id, nodeId: lockB, acquire: true });
  const l2 = await bobLocks2;
  check(
    'steal rejected — alice keeps lockA',
    l2?.locks?.some((l) => l.nodeId === lockA && l.userId === alice.user.id) &&
      !l2?.locks?.some((l) => l.nodeId === lockA && l.userId === bob.user.id),
    l2,
  );
  check('bob can lock a different node (lockB)', l2?.locks?.some((l) => l.nodeId === lockB && l.userId === bob.user.id), l2);

  // Release
  const bobLocks3 = waitFor(bobSock, 'canvas:node-locks');
  aliceSock.emit('canvas:node-lock', { bandId: band.id, nodeId: lockA, acquire: false });
  const l3 = await bobLocks3;
  check('release removes alice lockA', !l3?.locks?.some((l) => l.nodeId === lockA) && l3?.locks?.length === 1, l3);

  // Disconnect purges a socket's locks
  const aliceGetsLockC = waitFor(aliceSock, 'canvas:node-locks');
  const bobGetsLockC = waitFor(bobSock, 'canvas:node-locks');
  aliceSock.emit('canvas:node-lock', { bandId: band.id, nodeId: lockC, acquire: true });
  await aliceGetsLockC;
  await bobGetsLockC;
  const bobPurge = waitFor(bobSock, 'canvas:node-locks');
  aliceSock.close();
  const l4 = await bobPurge;
  check(
    'disconnect purges alice locks (bob lockB remains)',
    !l4?.locks?.some((l) => l.userId === alice.user.id) &&
      l4?.locks?.some((l) => l.nodeId === lockB && l.userId === bob.user.id),
    l4,
  );

  bobSock.close();

  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('E2E crashed:', err);
  process.exit(1);
});
