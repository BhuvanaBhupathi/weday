// ─────────────────────────────────────────────────────────────────────────────
// Friday — Socket.IO Event Names (shared constants)
// ─────────────────────────────────────────────────────────────────────────────

export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Presence
  PRESENCE_UPDATE: 'presence:update',
  PRESENCE_JOIN_BAND: 'presence:join_band',
  PRESENCE_LEAVE_BAND: 'presence:leave_band',

  // Band Chat
  CHAT_MESSAGE: 'chat:message',
  CHAT_MESSAGE_SENT: 'chat:message_sent',
  CHAT_TYPING: 'chat:typing',

  // Direct Messages
  DM_MESSAGE: 'dm:message',
  DM_MESSAGE_SENT: 'dm:message_sent',
  DM_READ: 'dm:read',

  // Discussions
  DISCUSSION_NEW_REPLY: 'discussion:new_reply',
  DISCUSSION_UPDATED: 'discussion:updated',

  // Notifications
  NOTIFICATION: 'notification:new',
  NOTIFICATION_READ: 'notification:read',

  // Activity
  ACTIVITY_NEW: 'activity:new',

  // Git events (from GitHub webhooks)
  GIT_PUSH: 'git:push',
  GIT_PR_CREATED: 'git:pr_created',
  GIT_PR_UPDATED: 'git:pr_updated',
  GIT_PR_MERGED: 'git:pr_merged',
  GIT_PR_REVIEWED: 'git:pr_reviewed',

  // Concerns
  CONCERN_UPDATED: 'concern:updated',

  // Suggested Edits
  SUGGESTED_EDIT_NEW: 'suggested_edit:new',
  SUGGESTED_EDIT_REVIEWED: 'suggested_edit:reviewed',

  // Architecture
  ARCHITECTURE_WARNING: 'architecture:warning',

  // Voice signaling (WebRTC)
  VOICE_JOIN: 'voice:join',
  VOICE_LEAVE: 'voice:leave',
  VOICE_SIGNAL: 'voice:signal',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
