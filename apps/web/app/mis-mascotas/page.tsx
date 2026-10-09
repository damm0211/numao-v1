
'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import {
  API_URL,
  API_ORIGIN,
  SOCKET_URL,
} from '../../lib/config';

interface Pet {
  id: string;
  name: string;
  birthDate: string;
  breed: string | null;
  size: string | null;
  energyLevel: number | null;
  sociability: number | null;
  playfulness: number | null;
  bio: string | null;
  status: string;
  photos?: {
    id: string;
    storageKey: string;
    sortOrder: number;
    url?: string;
  }[];
}

interface NotificationItem {
  id: string;
  petId: string | null;
  connectionId: string | null;
  messageId: string | null;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  pet: {
    id: string;
    name: string;
  } | null;
  connection: {
    id: string;
  } | null;
  message: {
    id: string;
  } | null;
}

export default function MisMascotasPage() {
  const router = useRouter();

  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePetId, setActivePetId] = useState<string | null>(null);
  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);
  const [notificationUnreadCount, setNotificationUnreadCount] =
    useState(0);
  const [notificationOpen, setNotificationOpen] =
    useState(false);
  const [notificationLoading, setNotificationLoading] =
    useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const savedPetId = localStorage.getItem('numao_active_pet_id');

    if (savedPetId) {
      setActivePetId(savedPetId);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function connectRealtime() {
      const token =
        localStorage.getItem('numao_access_token');

      if (!token) {
        return;
      }

      const socket = io(SOCKET_URL, {
        auth: {
          token,
        },
        transports: [
          'websocket',
          'polling',
        ],
      });

      socketRef.current = socket;

      socket.on(
        'notification:new',
        (incomingNotification: NotificationItem) => {
          if (cancelled) {
            return;
          }

          setNotifications((current) => {
            const exists = current.some(
              (item) =>
                item.id === incomingNotification.id,
            );

            if (exists) {
              return current;
            }

            return [
              incomingNotification,
              ...current,
            ].slice(0, 50);
          });

          setNotificationUnreadCount(
            (current) => current + 1,
          );
        },
      );
    }

    connectRealtime();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    async function loadPets() {
      try {
        const token = localStorage.getItem('numao_access_token');

        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`${API_URL}/pets`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        });

        const data = await response.json();

        if (!response.ok) {
          const message = Array.isArray(data.message)
            ? data.message.join(', ')
            : data.message || 'No fue posible cargar tus mascotas.';

          throw new Error(message);
        }

        setPets(data);

        const savedPetId = localStorage.getItem(
          'numao_active_pet_id',
        );

        const savedPetExists = data.some(
          (pet: Pet) => pet.id === savedPetId,
        );

        if (savedPetExists) {
          setActivePetId(savedPetId);
        } else if (data.length > 0) {
          setActivePetId(data[0].id);
          localStorage.setItem(
            'numao_active_pet_id',
            data[0].id,
          );
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Ocurrió un error al cargar tus mascotas.',
        );
      } finally {
        setLoading(false);
      }
    }

    loadPets();
  }, [router]);

  async function loadNotifications() {
    try {
      const token =
        localStorage.getItem('numao_access_token');

      if (!token) {
        return;
      }

      setNotificationLoading(true);

      const response =
        await fetch(`${API_URL}/notifications`, {
          method: 'GET',
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
          cache: 'no-store',
        });

      if (response.status === 401) {
        localStorage.removeItem(
          'numao_access_token',
        );
        router.push('/login');
        return;
      }

      const data =
        await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message ||
              'No fue posible cargar las notificaciones.',
        );
      }

      setNotifications(
        Array.isArray(data?.items)
          ? data.items
          : [],
      );

      setNotificationUnreadCount(
        Number(data?.unreadCount || 0),
      );
    } catch (err) {
      console.error(
        'Error cargando notificaciones:',
        err,
      );
    } finally {
      setNotificationLoading(false);
    }
  }

  async function openNotification(
    notification: NotificationItem,
  ) {
    try {
      const token =
        localStorage.getItem(
          'numao_access_token',
        );

      if (token && !notification.readAt) {
        await fetch(
          `${API_URL}/notifications/${notification.id}/read`,
          {
            method: 'POST',
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        );
      }
    } catch (err) {
      console.error(
        'Error marcando notificación como leída:',
        err,
      );
    }

    setNotifications(
      (current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                readAt:
                  item.readAt ||
                  new Date().toISOString(),
              }
            : item,
        ),
    );

    setNotificationUnreadCount(
      (current) =>
        notification.readAt
          ? current
          : Math.max(0, current - 1),
    );

    setNotificationOpen(false);

    if (notification.connectionId) {
      router.push(
        `/conexiones/${notification.connectionId}/mensajes`,
      );
      return;
    }

    if (notification.petId) {
      router.push(
        `/mascotas/${notification.petId}`,
      );
    }
  }

  async function markAllNotificationsRead() {
    try {
      const token =
        localStorage.getItem(
          'numao_access_token',
        );

      if (!token) {
        return;
      }

      const response =
        await fetch(
          `${API_URL}/notifications/read-all`,
          {
            method: 'POST',
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        );

      if (!response.ok) {
        throw new Error(
          'No fue posible marcar las notificaciones.',
        );
      }

      setNotifications(
        (current) =>
          current.map((item) => ({
            ...item,
            readAt:
              item.readAt ||
              new Date().toISOString(),
          })),
      );

      setNotificationUnreadCount(0);
    } catch (err) {
      console.error(
        'Error marcando notificaciones:',
        err,
      );
    }
  }

  function getPhotoUrl(
    storageKey: string,
    url?: string,
  ) {
    if (url) {
      return url;
    }

    if (
      storageKey.startsWith('http://') ||
      storageKey.startsWith('https://')
    ) {
      return storageKey;
    }

    const normalizedKey =
      storageKey.startsWith('/')
        ? storageKey.slice(1)
        : storageKey;

    return `${API_ORIGIN}/uploads/${normalizedKey}`;
  }
  
    function formatSize(size: string | null) {
    if (size === 'SMALL') return 'Pequeña';
    if (size === 'MEDIUM') return 'Mediana';
    if (size === 'LARGE') return 'Grande';

    return 'Sin especificar';
  }

  function calculateAge(birthDate: string) {
    const birth = new Date(birthDate);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();

    const monthDifference =
      today.getMonth() - birth.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 &&
        today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age;
  }

  function renderTraitBars(value: number | null) {
    const level =
      value === null || value === undefined
        ? 0
        : Math.min(5, Math.max(0, Math.round(value)));

    return (
      <div
        style={{
          display: 'flex',
          gap: '4px',
          width: '100%',
          maxWidth: '150px',
          marginTop: '7px',
        }}
        aria-label={value ? `Nivel ${level} de 5` : 'Sin especificar'}
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={index}
            style={{
              height: '5px',
              flex: 1,
              borderRadius: '999px',
              background: index < level ? '#b8e36b' : '#e5ebe7',
              transition: 'background 180ms ease',
            }}
          />
        ))}
      </div>
    );
  }

  function selectPet(petId: string) {
    localStorage.setItem('numao_active_pet_id', petId);
    setActivePetId(petId);
    setMenuOpen(false);
  }

  function goToDiscover(pet: Pet) {
    if (pet.status !== 'ACTIVE') {
      setError('Activa el perfil de esta mascota para comenzar a descubrir nuevas conexiones.');
      return;
    }

    localStorage.setItem('numao_active_pet_id', pet.id);
    setActivePetId(pet.id);
    router.push(`/descubrir?petId=${encodeURIComponent(pet.id)}`);
  }

  async function togglePetStatus(pet: Pet) {
    try {
      const token = localStorage.getItem('numao_access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const nextStatus = pet.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      const response = await fetch(`${API_URL}/pets/${pet.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = Array.isArray(data?.message)
          ? data.message.join(', ')
          : data?.message || 'No fue posible cambiar el estado del perfil.';
        throw new Error(message);
      }

      setPets((current) =>
        current.map((item) =>
          item.id === pet.id
            ? { ...item, status: nextStatus }
            : item,
        ),
      );

      if (pet.id === activePetId && nextStatus === 'PAUSED') {
        setError('El perfil quedó pausado. Actívalo nuevamente para descubrir conexiones.');
      } else {
        setError('');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible cambiar el estado del perfil.',
      );
    }
  }

  function logout() {
    localStorage.removeItem('numao_access_token');
    localStorage.removeItem('numao_active_pet_id');

    setMenuOpen(false);
    router.push('/login');
  }

  const activePet =
    pets.find((pet) => pet.id === activePetId) ||
    pets[0] ||
    null;

  return (
    <main className="shell petsShell">
      <header className="topBar">
        <button
          type="button"
          className="logoButton"
          onClick={() => router.push('/mi-cuenta')}
          aria-label="Volver al inicio"
        >
          <span className="miniBrandMark" aria-hidden="true">
            <span />
            <span />
          </span>

          <span>NUMAO</span>
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              position: 'relative',
            }}
          >
          <button
            type="button"
            className="profileButton"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            {activePet ? activePet.name : 'Mi cuenta'} ▾
          </button>

          {menuOpen && (
            <div
              role="menu"
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: '240px',
                padding: '10px',
                background: '#ffffff',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: '16px',
                boxShadow: '0 12px 35px rgba(0, 0, 0, 0.12)',
                zIndex: 100,
              }}
            >
              <div
                style={{
                  padding: '10px 12px 8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  opacity: 0.55,
                }}
              >
                Mascota activa
              </div>

              {pets.map((pet) => (
                <button
                  key={pet.id}
                  type="button"
                  role="menuitem"
                  onClick={() => selectPet(pet.id)}
                  style={{
                    width: '100%',
                    border: 'none',
                    background:
                      pet.id === activePetId
                        ? 'rgba(0, 0, 0, 0.05)'
                        : 'transparent',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    marginBottom: '3px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight:
                      pet.id === activePetId ? 700 : 500,
                  }}
                >
                  <span>
                    {pet.id === activePetId ? '✓ ' : '  '}
                    {pet.name}
                  </span>
                </button>
              ))}

              <div
                style={{
                  height: '1px',
                  background: 'rgba(0, 0, 0, 0.08)',
                  margin: '8px 4px',
                }}
              />

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  router.push('/mis-mascotas');
                }}
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Gestionar mascotas
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  router.push('/mi-cuenta');
                }}
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Mi cuenta
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={logout}
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Cerrar sesión
              </button>
            </div>
          )}
          </div>
        </div>
      </header>

      {notificationOpen && (
        <div
          style={{
            position: 'fixed',
            top: '74px',
            right: '18px',
            width:
              'min(390px, calc(100vw - 32px))',
            padding: '12px',
            background: '#ffffff',
            border:
              '1px solid rgba(18,59,74,0.08)',
            borderRadius: '20px',
            boxShadow:
              '0 22px 60px rgba(18,59,74,0.16)',
            zIndex: 120,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                'space-between',
              gap: '12px',
              padding:
                '8px 10px 12px',
            }}
          >
            <div>
              <strong
                style={{
                  color: '#123b4a',
                  fontSize: '16px',
                }}
              >
                Notificaciones
              </strong>
              <span
                style={{
                  display: 'block',
                  marginTop: '3px',
                  color: '#7a8783',
                  fontSize: '11px',
                }}
              >
                {notificationUnreadCount > 0
                  ? `${notificationUnreadCount} sin leer`
                  : 'Todo al día'}
              </span>
            </div>

            {notificationUnreadCount > 0 && (
              <button
                type="button"
                onClick={
                  markAllNotificationsRead
                }
                style={{
                  border: 0,
                  background:
                    'transparent',
                  color: '#55752e',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Marcar todas
              </button>
            )}
          </div>

          {notificationLoading &&
            notifications.length === 0 && (
              <div
                style={{
                  padding:
                    '28px 15px',
                  textAlign: 'center',
                  color: '#7a8783',
                  fontSize: '13px',
                }}
              >
                Cargando…
              </div>
            )}

          {!notificationLoading &&
            notifications.length === 0 && (
              <div
                style={{
                  padding:
                    '28px 15px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '26px',
                    marginBottom: '8px',
                  }}
                >
                  ✨
                </div>
                <strong
                  style={{
                    color: '#123b4a',
                    fontSize: '14px',
                  }}
                >
                  No tienes notificaciones
                </strong>
                <p
                  style={{
                    margin:
                      '5px 0 0',
                    color: '#7a8783',
                    fontSize: '12px',
                    lineHeight: 1.5,
                  }}
                >
                  Aquí aparecerán mensajes,
                  conexiones y otras novedades.
                </p>
              </div>
            )}

          {notifications
            .slice(0, 6)
            .map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() =>
                  openNotification(
                    notification,
                  )
                }
                style={{
                  width: '100%',
                  display: 'block',
                  border: 0,
                  borderRadius: '15px',
                  background:
                    notification.readAt
                      ? 'transparent'
                      : '#f3f8e9',
                  padding:
                    '12px 10px',
                  marginBottom: '4px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: '11px',
                    alignItems:
                      'flex-start',
                  }}
                >
                  <span
                    style={{
                      width: '38px',
                      height: '38px',
                      flex:
                        '0 0 auto',
                      borderRadius:
                        '12px',
                      background:
                        notification.type ===
                        'NEW_MESSAGE'
                          ? '#eaf4cf'
                          : '#edf3f1',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '17px',
                    }}
                  >
                    {notification.type ===
                    'NEW_MESSAGE'
                      ? '💬'
                      : '🔔'}
                  </span>

                  <span
                    style={{
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <strong
                      style={{
                        display: 'block',
                        color: '#123b4a',
                        fontSize: '13px',
                      }}
                    >
                      {notification.title}
                    </strong>

                    <span
                      style={{
                        display: 'block',
                        marginTop: '3px',
                        color: '#687671',
                        fontSize: '12px',
                        lineHeight: 1.45,
                      }}
                    >
                      {notification.body}
                    </span>

                    {notification.pet && (
                      <span
                        style={{
                          display: 'block',
                          marginTop: '5px',
                          color: '#55752e',
                          fontSize: '10px',
                          fontWeight: 800,
                        }}
                      >
                        Mascota: {notification.pet.name}
                      </span>
                    )}
                  </span>

                  {!notification.readAt && (
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        flex:
                          '0 0 auto',
                        marginTop: '5px',
                        borderRadius:
                          '50%',
                        background:
                          '#8ebc43',
                      }}
                    />
                  )}
                </div>
              </button>
            ))}

          <div
            style={{
              borderTop:
                '1px solid rgba(18,59,74,0.07)',
              marginTop: '7px',
              padding:
                '10px 8px 2px',
              display: 'flex',
              justifyContent:
                'space-between',
              gap: '8px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setNotificationOpen(false);
                router.push(
                  '/conexiones',
                );
              }}
              style={{
                border: 0,
                background:
                  'transparent',
                color: '#123b4a',
                fontSize: '11px',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              Mis conexiones →
            </button>

            {notifications.length > 6 && (
              <span
                style={{
                  color: '#8a9591',
                  fontSize: '10px',
                }}
              >
                Mostrando las últimas 6
              </span>
            )}
          </div>
        </div>
      )}

      <section className="petsContainer">
        <div className="pageIntro">
          <div>
            <p className="eyebrow">MI ESPACIO</p>

            <h1>Mis mascotas</h1>

            <p className="pageDescription">
              Administra los perfiles de tus mascotas y prepáralos
              para nuevas conexiones.
            </p>
          </div>

        <div
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  }}
>
  <button
    type="button"
    className="secondaryButton"
    onClick={() => router.push('/encuentros')}
    style={{
      minHeight: '44px',
      padding: '0 16px',
      whiteSpace: 'nowrap',
    }}
  >
    📅 Mis encuentros
  </button>

  <button
    type="button"
    className="primaryButton addButton"
    onClick={() => router.push('/crear-mascota')}
  >
    + Agregar mascota
  </button>
</div>   
        
        </div>

        <section
  className="activityPanel"
  style={{
            marginBottom: '24px',
            padding: '18px 20px',
            borderRadius: '22px',
            background:
              'linear-gradient(135deg, #f1f8f4 0%, #ffffff 100%)',
            border:
              '1px solid rgba(18,59,74,0.08)',
            boxShadow:
              '0 12px 35px rgba(18,59,74,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '18px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '13px',
            }}
          >
            <span
              style={{
                width: '43px',
                height: '43px',
                borderRadius: '14px',
                background: '#e8f4cc',
                display: 'grid',
                placeItems: 'center',
                fontSize: '20px',
              }}
            >
              {notificationUnreadCount > 0
                ? '💬'
                : '✓'}
            </span>

            <div>
              <strong
                style={{
                  display: 'block',
                  color: '#123b4a',
                  fontSize: '14px',
                }}
              >
                {notificationUnreadCount > 0
                  ? `${notificationUnreadCount} ${
                      notificationUnreadCount === 1
                        ? 'novedad'
                        : 'novedades'
                    } sin leer`
                  : 'Estás al día'}
              </strong>

              <span
                style={{
                  display: 'block',
                  marginTop: '3px',
                  color: '#71807d',
                  fontSize: '12px',
                }}
              >
                {notificationUnreadCount > 0
                  ? 'Tienes actividad nueva en tus conexiones.'
                  : 'Aquí aparecerán tus nuevos mensajes y conexiones.'}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={() =>
                setNotificationOpen((open) => !open)
              }
              style={{
                border:
                  '1px solid rgba(18,59,74,0.12)',
                borderRadius: '12px',
                background: '#ffffff',
                padding: '10px 14px',
                color: '#123b4a',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Ver notificaciones
            </button>

            <button
              type="button"
              onClick={() =>
                router.push('/conexiones')
              }
              style={{
                border: 0,
                borderRadius: '12px',
                background: '#b8e36b',
                padding: '10px 14px',
                color: '#123b4a',
                fontWeight: 900,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Mis conexiones →
            </button>
          </div>
        </section>

        {loading && (
          <div className="stateCard">
            <div className="loadingDot" />
            <p>Cargando tus mascotas…</p>
          </div>
        )}

        {!loading && error && (
          <div className="stateCard errorCard">
            <h2>No pudimos cargar tus mascotas</h2>
            <p>{error}</p>

            <button
              type="button"
              className="primaryButton"
              onClick={() => window.location.reload()}
            >
              Intentar nuevamente
            </button>
          </div>
        )}

        {!loading && !error && pets.length === 0 && (
          <div className="emptyCard">
            <div className="emptyPhoto">
              <span>+</span>
            </div>

            <p className="eyebrow">PRIMER PERFIL</p>

            <h2>Aún no tienes mascotas</h2>

            <p>
              Crea el primer perfil de tu mascota para comenzar
              a formar parte de NUMAO.
            </p>

            <button
              type="button"
              className="primaryButton"
              onClick={() => router.push('/crear-mascota')}
            >
              Crear perfil
            </button>
          </div>
        )}

        {!loading && !error && pets.length > 0 && (
          <div className="petsGrid">
            {pets.map((pet) => {
              const age = calculateAge(pet.birthDate);
              const isActive = pet.id === activePetId;

              return (
                <article
  className={`petProfileCard ${
    isActive ? 'petProfileCardActive' : ''
  }`}
  key={pet.id}
>
                
                  <div className="petPhoto">
                    {pet.photos && pet.photos.length > 0 ? (
                      <img

                        src={getPhotoUrl(
  [...pet.photos].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )[0].storageKey,
  [...pet.photos].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )[0].url,
)}
                        alt={`Fotografía de ${pet.name}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          display: 'block',
                          background: '#f4f6f5',
                        }}
                      />
                    ) : (
                      <div className="photoPlaceholder">
                        <span>Foto de {pet.name}</span>
                      </div>
                    )}

                    <span
                      className="activeBadge"
                      style={{
                        background: pet.status === 'ACTIVE' ? '#f0f8e4' : '#f1f3f2',
                        color: pet.status === 'ACTIVE' ? '#55752e' : '#707a76',
                      }}
                    >
                      <span
                        className="activeDot"
                        style={{
                          background: pet.status === 'ACTIVE' ? '#82b83c' : '#9aa4a1',
                        }}
                      />
                      {pet.status === 'ACTIVE' ? 'Activa' : 'Pausada'}
                    </span>

                    {isActive && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '12px',
                          left: '12px',
                          padding: '6px 10px',
                          borderRadius: '999px',
                          background: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 700,
                          boxShadow:
                            '0 4px 12px rgba(0, 0, 0, 0.10)',
                        }}
                      >
                        Mascota actual
                      </span>
                    )}
                  </div>

                  <div className="petContent">
                    <div className="petHeader">
                      <div>
                        <h2>{pet.name}</h2>

                        <p className="petBreed">
                          {pet.breed ||
                            'Raza no especificada'}
                        </p>
                      </div>
                    </div>

                    <div className="petBasicInfo">
                      <div>
                        <span>Edad</span>
                        <strong>
                          {age} {age === 1 ? 'año' : 'años'}
                        </strong>
                      </div>

                      <div>
                        <span>Tamaño</span>
                        <strong>
                          {formatSize(pet.size)}
                        </strong>
                      </div>
                    </div>

                    {pet.bio && (
                      <p className="petBio">{pet.bio}</p>
                    )}

                    <div className="petTraits">
                      <div className="trait">
                        <span>Energía</span>
                        {renderTraitBars(pet.energyLevel)}
                      </div>

                      <div className="trait">
                        <span>Sociabilidad</span>
                        {renderTraitBars(pet.sociability)}
                      </div>

                      <div className="trait">
                        <span>Juego</span>
                        {renderTraitBars(pet.playfulness)}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="profileButtonFull"
                      onClick={() => {
                        selectPet(pet.id);
                        router.push(
                          `/mascotas/${pet.id}`,
                        );
                      }}
                    >
                      Ver perfil
                    </button>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        marginTop: '9px',
                      }}
                    >
                      <button
                        type="button"
                        className="secondaryButton discoverButton"
onClick={() => goToDiscover(pet)}
                        disabled={pet.status !== 'ACTIVE'}
                      >
                        ✨ Descubrir
                      </button>

                      <button
                        type="button"
                        className="secondaryButton"
                        onClick={() => togglePetStatus(pet)}
                      >
                        {pet.status === 'ACTIVE' ? 'Pausar perfil' : 'Activar perfil'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <button
          type="button"
          className="backLink"
          onClick={() => router.push('/mi-cuenta')}
        >
            Volver al inicio
        </button>
      </section>
    </main>
  );
}

