'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import {
  API_URL,
  SOCKET_URL,
} from '../lib/config';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  petId?: string | null;
  connectionId?: string | null;
  messageId?: string | null;
  readAt?: string | null;
  createdAt: string;
  pet?: {
    id: string;
    name: string;
  } | null;
}

interface NotificationsResponse {
  items: NotificationItem[];
  unreadCount: number;
}

function formatNotificationDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getNotificationTarget(
  notification: NotificationItem,
) {
  if (
    notification.type === 'NEW_INTEREST' &&
    notification.petId
  ) {
    return `/descubrir?targetPetId=${encodeURIComponent(
      notification.petId,
    )}`;
  }

  if (
    notification.type === 'NEW_MESSAGE' &&
    notification.connectionId
  ) {
    return `/conexiones/${notification.connectionId}/mensajes`;
  }

  if (
    notification.type === 'NEW_CONNECTION' &&
    notification.connectionId
  ) {
    return `/conexiones/${notification.connectionId}`;
  }

  if (
    notification.type === 'MEETING_PROPOSAL' ||
    notification.type === 'MEETING_CONFIRMED' ||
    notification.type === 'MEETING_CANCELLED'
  ) {
    if (notification.connectionId) {
      return `/conexiones/${notification.connectionId}/mensajes`;
    }

    return '/encuentros';
  }

  return null;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'NEW_INTEREST':
      return '🐾';

    case 'NEW_CONNECTION':
      return '🤝';

    case 'NEW_MESSAGE':
      return '💬';

    case 'MEETING_PROPOSAL':
      return '📅';

    case 'MEETING_CONFIRMED':
      return '✅';

    case 'MEETING_CANCELLED':
      return '❌';

    default:
      return '🔔';
  }
}

export default function NotificationBell() {
  const router = useRouter();

  const socketRef = useRef<Socket | null>(null);

  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [authenticated, setAuthenticated] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      const token =
        localStorage.getItem(
          'numao_access_token',
        );

      if (!token) {
        setAuthenticated(false);
        return;
      }

      setAuthenticated(true);

      try {
        setLoading(true);

        const response = await fetch(
          `${API_URL}/notifications`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: 'no-store',
          },
        );

        if (response.status === 401) {
          localStorage.removeItem(
            'numao_access_token',
          );

          localStorage.removeItem(
            'numao_user',
          );

          if (!cancelled) {
            setAuthenticated(false);
          }

          return;
        }

        if (!response.ok) {
          throw new Error(
            'No pudimos cargar las notificaciones.',
          );
        }

        const data: NotificationsResponse =
          await response.json();

        if (cancelled) {
          return;
        }

        setNotifications(
          Array.isArray(data.items)
            ? data.items
            : [],
        );

        setUnreadCount(
          Number(data.unreadCount) || 0,
        );
      } catch (error) {
        console.error(
          'Error cargando notificaciones:',
          error,
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    initialize();

    const handleAuthChanged = () => {
      initialize();
    };

    window.addEventListener('numao:auth-changed', handleAuthChanged);

    return () => {
      cancelled = true;
      window.removeEventListener('numao:auth-changed', handleAuthChanged);
    };
  }, []);

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    const token =
      localStorage.getItem(
        'numao_access_token',
      );

    if (!token) {
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on(
      'notification:new',
      (incoming: NotificationItem) => {
        setNotifications((current) => {
          const exists = current.some(
            (item) =>
              item.id === incoming.id,
          );

          if (exists) {
            return current;
          }

          return [
            incoming,
            ...current,
          ].slice(0, 50);
        });

        setUnreadCount(
          (current) => current + 1,
        );
      },
    );

    socket.on(
      'connect_error',
      (error) => {
        console.error(
          'Realtime de notificaciones:',
          error,
        );
      },
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [authenticated]);

  async function markAsRead(
    notificationId: string,
  ) {
    const token =
      localStorage.getItem(
        'numao_access_token',
      );

    if (!token) {
      return;
    }

    try {
      await fetch(
        `${API_URL}/notifications/${notificationId}/read`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setNotifications((current) =>
        current.map((notification) =>
          notification.id ===
          notificationId
            ? {
                ...notification,
                readAt:
                  notification.readAt ??
                  new Date().toISOString(),
              }
            : notification,
        ),
      );

      setUnreadCount((current) =>
        Math.max(0, current - 1),
      );
    } catch (error) {
      console.error(
        'Error marcando notificación:',
        error,
      );
    }
  }

  async function markAllAsRead() {
    const token =
      localStorage.getItem(
        'numao_access_token',
      );

    if (!token || unreadCount === 0) {
      return;
    }

    try {
      await fetch(
        `${API_URL}/notifications/read-all`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          readAt:
            notification.readAt ??
            new Date().toISOString(),
        })),
      );

      setUnreadCount(0);
    } catch (error) {
      console.error(
        'Error marcando notificaciones:',
        error,
      );
    }
  }

  function handleNotificationClick(
    notification: NotificationItem,
  ) {
    if (!notification.readAt) {
      void markAsRead(notification.id);
    }

    setOpen(false);

    const target =
      getNotificationTarget(
        notification,
      );

    if (target) {
      router.push(target);
    }
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div
      className="globalNotificationBell"
      style={{
        position: 'fixed',
        zIndex: 1000,
      }}
    >
      <button
        type="button"
        aria-label="Notificaciones"
        aria-expanded={open}
        onClick={() =>
          setOpen((current) => !current)
        }
        style={{
          position: 'relative',
          width: 46,
          height: 46,
          borderRadius: '50%',
          border: '1px solid #dce5e1',
          background: '#ffffff',
          boxShadow:
            '0 4px 16px rgba(0,0,0,0.10)',
          cursor: 'pointer',
          fontSize: 21,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        🔔

        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 20,
              height: 20,
              padding: '0 5px',
              borderRadius: 10,
              background: '#e45757',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #ffffff',
            }}
          >
            {unreadCount > 99
              ? '99+'
              : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="globalNotificationPanel"
          style={{
            position: 'absolute',
            top: 56,
            right: 0,
            width: 360,
            maxWidth:
              'calc(100vw - 24px)',
            maxHeight: 520,
            overflow: 'hidden',
            borderRadius: 18,
            border: '1px solid #e1e8e5',
            background: '#ffffff',
            boxShadow:
              '0 14px 40px rgba(0,0,0,0.16)',
          }}
        >
          <div
            style={{
              padding:
                '14px 16px 12px',
              borderBottom:
                '1px solid #edf1ef',
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                'space-between',
              gap: 12,
            }}
          >
            <strong
              style={{
                fontSize: 16,
                color: '#1d2925',
              }}
            >
              Notificaciones
            </strong>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  void markAllAsRead()
                }
                style={{
                  border: 'none',
                  background:
                    'transparent',
                  color: '#60736c',
                  cursor: 'pointer',
                  fontSize: 12,
                  padding: 0,
                }}
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          <div
            className="globalNotificationList"
            style={{
              maxHeight: 450,
              overflowY: 'auto',
            }}
          >
            {loading ? (
              <div
                style={{
                  padding: 24,
                  textAlign: 'center',
                  color: '#71817b',
                  fontSize: 14,
                }}
              >
                Cargando notificaciones...
              </div>
            ) : notifications.length === 0 ? (
              <div
                style={{
                  padding: 28,
                  textAlign: 'center',
                  color: '#71817b',
                  fontSize: 14,
                }}
              >
                No tienes notificaciones.
              </div>
            ) : (
              notifications.map(
                (notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() =>
                      handleNotificationClick(
                        notification,
                      )
                    }
                    style={{
                      width: '100%',
                      border: 'none',
                      borderBottom:
                        '1px solid #edf1ef',
                      background:
                        notification.readAt
                          ? '#ffffff'
                          : '#f5faf7',
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: 14,
                      display: 'flex',
                      gap: 12,
                    }}
                  >
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        flexShrink: 0,
                        borderRadius:
                          '50%',
                        background:
                          '#eef5f1',
                        display: 'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                        fontSize: 17,
                      }}
                    >
                      {getNotificationIcon(
                        notification.type,
                      )}
                    </span>

                    <span
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <span
                        style={{
                          display: 'flex',
                          alignItems:
                            'center',
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color:
                              '#1d2925',
                          }}
                        >
                          {notification.title}
                        </span>

                        {!notification.readAt && (
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              flexShrink: 0,
                              borderRadius:
                                '50%',
                              background:
                                '#e45757',
                            }}
                          />
                        )}
                      </span>

                      <span
                        style={{
                          display: 'block',
                          marginTop: 3,
                          color:
                            '#5e6e67',
                          fontSize: 13,
                          lineHeight: 1.4,
                        }}
                      >
                        {notification.body}
                      </span>

                      <span
                        style={{
                          display: 'block',
                          marginTop: 5,
                          color:
                            '#9aa7a2',
                          fontSize: 11,
                        }}
                      >
                        {formatNotificationDate(
                          notification.createdAt,
                        )}
                      </span>
                    </span>
                  </button>
                ),
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

