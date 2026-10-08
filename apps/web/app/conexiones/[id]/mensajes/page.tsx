'use client';

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  useParams,
  useRouter,
} from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import {
  API_URL,
  FILES_URL,
  SOCKET_URL,
} from '../../../../lib/config';
interface Pet {
  id: string;
  name: string;
  breed: string | null;
  size: string | null;
  birthDate: string;
  bio: string | null;
  photos?: {
    id: string;
    storageKey: string;
    sortOrder: number;
    url?: string;
  }[];
}

interface Connection {
  id: string;
  status: string;
  compatibility: number | null;
  createdAt: string;
  currentPet: Pet;
  otherPet: Pet;
}

interface Message {
  id: string;
  connectionId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender?: {
    id: string;
    displayName: string;
  };
}
interface PetFriendlyPlace {
  id: string;
  name: string;
  type: string;
  address: string;
  commune: string;
  city: string;
}

interface MeetupForm {
  startAt: string;
  placeName: string;
  placeAddress: string;
  petFriendlyPlaceId: string;
}

interface Meetup {
  id: string;
  connectionId: string;
  petAId: string;
  petBId: string;
  proposedByUserId: string;
  startAt: string;
  placeName: string;
  placeAddress: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  petFriendlyPlace?: PetFriendlyPlace | null;
  petA?: {
    id: string;
    name: string;
  };
  petB?: {
    id: string;
    name: string;
  };
}
function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
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

  return `${FILES_URL}/uploads/${normalizedKey}`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export default function ConnectionMessagesPage() {
  const router = useRouter();
  const params = useParams();
  const connectionId = params.id as string;

   const [connection, setConnection] =
    useState<Connection | null>(null);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [meetups, setMeetups] =
    useState<Meetup[]>([]);


  const [messageText, setMessageText] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [realtimeConnected, setRealtimeConnected] =
    useState(false);
  const [showMeetupForm, setShowMeetupForm] =
  useState(false);

const [creatingMeetup, setCreatingMeetup] =
  useState(false);

const [petFriendlyPlaces, setPetFriendlyPlaces] =
  useState<PetFriendlyPlace[]>([]);

const [meetupForm, setMeetupForm] =
  useState<MeetupForm>({
    startAt: '',
    placeName: '',
    placeAddress: '',
    petFriendlyPlaceId: '',
  });

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const socketRef =
    useRef<Socket | null>(null);

  useEffect(() => {
    async function loadConversation() {
      try {
        setLoading(true);
        setError('');

        const token =
          localStorage.getItem('numao_access_token');

        if (!token) {
          router.push('/login');
          return;
        }

        let storedUserId = '';

        try {
          const storedUser =
            localStorage.getItem('numao_user');

          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            storedUserId = parsed?.id || '';
            setCurrentUserId(storedUserId);
          }
        } catch {
          setCurrentUserId('');
        }

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [connectionResponse, messagesResponse] =
          await Promise.all([
            fetch(
              `${API_URL}/connections/${connectionId}`,
              {
                method: 'GET',
                headers,
                cache: 'no-store',
              },
            ),

            fetch(
              `${API_URL}/connections/${connectionId}/messages`,
              {
                method: 'GET',
                headers,
                cache: 'no-store',
              },
            ),
          ]);

        const meetupsResponse = await fetch(
  `${API_URL}/meetups`,
  {
    method: 'GET',
    headers,
    cache: 'no-store',
  },
);
        const connectionData =
          await connectionResponse
            .json()
            .catch(() => null);

        const messagesData =
          await messagesResponse
            .json()
            .catch(() => null);
        const meetupsData =
  await meetupsResponse
    .json()
    .catch(() => []);

        if (
          connectionResponse.status === 401 ||
          messagesResponse.status === 401
        ) {
          localStorage.removeItem(
            'numao_access_token',
          );

          localStorage.removeItem(
            'numao_user',
          );

          router.push('/login');
          return;
        }

        if (!connectionResponse.ok) {
          throw new Error(
            Array.isArray(connectionData?.message)
              ? connectionData.message.join(', ')
              : connectionData?.message ||
                'No pudimos cargar esta conexión.',
          );
        }

        if (!messagesResponse.ok) {
          throw new Error(
            Array.isArray(messagesData?.message)
              ? messagesData.message.join(', ')
              : messagesData?.message ||
                'No pudimos cargar los mensajes.',
          );
        }

        setConnection(connectionData);

        setMessages(
          Array.isArray(messagesData)
            ? messagesData
            : [],
        );
setMeetups(
  Array.isArray(meetupsData)
    ? meetupsData.filter(
        (meetup: Meetup) =>
          meetup.connectionId === connectionId,
      )
    : [],
);

const petFriendlyResponse = await fetch(
  `${API_URL}/pet-friendly-places`,
  {
    method: 'GET',
    cache: 'no-store',
  },
);

if (petFriendlyResponse.ok) {
  const petFriendlyData =
    await petFriendlyResponse
      .json()
      .catch(() => []);

  setPetFriendlyPlaces(
    Array.isArray(petFriendlyData)
      ? petFriendlyData
      : [],
  );
}

        /*
         * El socket se conecta solamente después de
         * validar el token y cargar la conversación.
         */
        if (storedUserId) {
          const socket =
            io(SOCKET_URL, {
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
            'connect',
            () => {
              setRealtimeConnected(true);
            },
          );

          socket.on(
            'disconnect',
            () => {
              setRealtimeConnected(false);
            },
          );

          socket.on(
            'connect_error',
            (socketError) => {
              console.error(
                'Realtime NUMAO:',
                socketError,
              );

              setRealtimeConnected(false);
            },
          );

          socket.on(
            'message:new',
            (incomingMessage: Message) => {
              if (
                incomingMessage.connectionId !==
                connectionId
              ) {
                return;
              }

              setMessages((current) => {
                const exists =
                  current.some(
                    (message) =>
                      message.id ===
                      incomingMessage.id,
                  );

                if (exists) {
                  return current;
                }

                return [
                  ...current,
                  incomingMessage,
                ];
              });
            },
          );
          socket.on(
            'notification:new',
            (notification: {
              type: string;
              connectionId?: string | null;
              meetupId?: string | null;
            }) => {
              if (
                notification.connectionId !==
                connectionId
              ) {
                return;
              }

              if (
                notification.type !==
                  'MEETING_PROPOSAL' &&
                notification.type !==
                  'MEETING_CONFIRMED' &&
                notification.type !==
                  'MEETING_CANCELLED'
              ) {
                return;
              }

              if (!notification.meetupId) {
                return;
              }

              setMeetups((current) =>
                current.map((meetup) =>
                  meetup.id ===
                  notification.meetupId
                    ? {
                        ...meetup,
                        status:
                          notification.type ===
                          'MEETING_CONFIRMED'
                            ? 'CONFIRMED'
                            : notification.type ===
                              'MEETING_CANCELLED'
                              ? 'CANCELLED'
                              : meetup.status,
                      }
                    : meetup,
                ),
              );
            },
          );
         }
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : 'No pudimos cargar la conversación.',
        );
      } finally {
        setLoading(false);
      }
    }

    if (connectionId) {
      loadConversation();
    }

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setRealtimeConnected(false);
    };
  }, [connectionId, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const body = messageText.trim();

    if (!body || sending) {
      return;
    }

    try {
      setSending(true);
      setError('');

      const token =
        localStorage.getItem('numao_access_token');

      if (!token) {
        router.push('/login');
        return;
      }

      const response =
        await fetch(
          `${API_URL}/connections/${connectionId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization:
                `Bearer ${token}`,
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              body,
            }),
          },
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (response.status === 401) {
        localStorage.removeItem(
          'numao_access_token',
        );

        localStorage.removeItem(
          'numao_user',
        );

        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(
          Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message ||
              'No pudimos enviar el mensaje.',
        );
      }

      /*
       * El POST devuelve inmediatamente el mensaje
       * para el usuario que lo envió.
       *
       * El destinatario lo recibe por Socket.IO.
       */
      setMessages((current) => {
        const exists =
          current.some(
            (message) =>
              message.id === data?.id,
          );

        if (exists) {
          return current;
        }

        return [
          ...current,
          data as Message,
        ];
      });

      setMessageText('');
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'No pudimos enviar el mensaje.',
      );
    } finally {
      setSending(false);
    }
  }
async function handleCreateMeetup(
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault();

  if (
    creatingMeetup ||
    !meetupForm.startAt ||
    !meetupForm.placeName.trim()
  ) {
    return;
  }

const startAt = new Date(meetupForm.startAt);

if (Number.isNaN(startAt.getTime())) {
  setError('La fecha y hora del encuentro no son válidas.');
  return;
}

  try {
    setCreatingMeetup(true);
    setError('');

    const token =
      localStorage.getItem('numao_access_token');

    if (!token) {
      router.push('/login');
      return;
    }

    const response = await fetch(
      `${API_URL}/meetups/connections/${connectionId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },

body: JSON.stringify({
  startAt: startAt.toISOString(),

  placeName:
    meetupForm.placeName.trim(),

  placeAddress:
    meetupForm.placeAddress.trim() ||
    undefined,

  petFriendlyPlaceId:
    meetupForm.petFriendlyPlaceId ||
    undefined,
}),

      },
    );

    const data =
      await response.json().catch(() => null);

    if (response.status === 401) {
      localStorage.removeItem(
        'numao_access_token',
      );

      localStorage.removeItem(
        'numao_user',
      );

      router.push('/login');
      return;
    }

    if (!response.ok) {
      throw new Error(
        Array.isArray(data?.message)
          ? data.message.join(', ')
          : data?.message ||
            'No pudimos crear la propuesta de encuentro.',
      );
    }

    setShowMeetupForm(false);

    setMeetupForm({
      startAt: '',
        placeName: '',
      placeAddress: '',
      petFriendlyPlaceId: '',
    });

    setError('');
  } catch (err) {
    console.error(err);

    setError(
      err instanceof Error
        ? err.message
        : 'No pudimos crear la propuesta de encuentro.',
    );
 
  } finally {
    setCreatingMeetup(false);
  }
}

  async function handleMeetupStatus(
    meetupId: string,
    status: 'CONFIRMED' | 'CANCELLED',
  ) {
    try {
      setError('');

      const token =
        localStorage.getItem('numao_access_token');

      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(
        `${API_URL}/meetups/${meetupId}/status`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status,
          }),
        },
      );

      const data =
        await response.json().catch(() => null);

      if (response.status === 401) {
        localStorage.removeItem(
          'numao_access_token',
        );

        localStorage.removeItem(
          'numao_user',
        );

        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(
          Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message ||
              'No pudimos actualizar el encuentro.',
        );
      }

      setMeetups((current) =>
        current.map((meetup) =>
          meetup.id === meetupId
            ? {
                ...meetup,
                status,
              }
            : meetup,
        ),
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'No pudimos actualizar el encuentro.',
      );
    }
  }

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at 8% 0%, rgba(184, 227, 107, 0.16), transparent 28%), radial-gradient(circle at 92% 10%, rgba(18, 59, 74, 0.055), transparent 30%), #f7f8f5',
    color: '#243532',
    padding: '24px 20px 40px',
    boxSizing: 'border-box',
  };

  const maxWidthStyle: React.CSSProperties = {
    width: 'min(100%, 860px)',
    margin: '0 auto',
  };

  if (loading) {
    return (
      <main style={pageStyle}>
        <div
          style={{
            ...maxWidthStyle,
            minHeight: 'calc(100vh - 64px)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <div
            style={{
              padding: '34px',
              borderRadius: '26px',
              background:
                'rgba(255,255,255,0.9)',
              border:
                '1px solid rgba(18,59,74,0.08)',
              boxShadow:
                '0 24px 70px rgba(18,59,74,0.10)',
              textAlign: 'center',
            }}
          >
            <strong>
              Cargando conversación…
            </strong>
          </div>
        </div>
      </main>
    );
  }

  if (error && !connection) {
    return (
      <main style={pageStyle}>
        <div style={maxWidthStyle}>
          <button
            type="button"
            onClick={() =>
              router.push('/conexiones')
            }
            style={{
              border: 0,
              background:
                'transparent',
              color: '#60716d',
              fontWeight: 800,
              cursor: 'pointer',
              padding: '8px 0',
            }}
          >
            ← Volver a conexiones
          </button>

          <section
            style={{
              marginTop: '24px',
              padding: '32px',
              borderRadius: '26px',
              background: '#ffffff',
              border:
                '1px solid rgba(18,59,74,0.08)',
              boxShadow:
                '0 24px 70px rgba(18,59,74,0.08)',
            }}
          >
            <strong>
              No pudimos abrir la conversación
            </strong>

            <p
              style={{
                color: '#6c7b77',
              }}
            >
              {error}
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (!connection) {
    return null;
  }

  const otherPet =
    connection.otherPet;

  return (
    <main style={pageStyle}>
      <div style={maxWidthStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'space-between',
            gap: '16px',
            marginBottom: '18px',
          }}
        >
          <button
            type="button"
            onClick={() =>
              router.push(
                `/conexiones/${connection.id}`,
              )
            }
            style={{
              border: 0,
              background:
                'transparent',
              color: '#60716d',
              fontWeight: 800,
              cursor: 'pointer',
              padding: '8px 0',
            }}
          >
            ← Volver a la conexión
          </button>

          <button
            type="button"
            onClick={() =>
              router.push('/mis-mascotas')
            }
            style={{
              border:
                '1px solid rgba(18,59,74,0.10)',
              borderRadius: '12px',
              padding: '10px 15px',
              background: '#ffffff',
              color: '#123b4a',
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            Mis mascotas
          </button>
        </div>

        <section
          style={{
            background: '#ffffff',
            border:
              '1px solid rgba(18,59,74,0.08)',
            borderRadius: '28px',
            overflow: 'hidden',
            boxShadow:
              '0 24px 70px rgba(18,59,74,0.10)',
          }}
        >
          <header
            style={{
              padding: '24px 26px',
              borderBottom:
                '1px solid rgba(18,59,74,0.08)',
              background:
                'linear-gradient(135deg, rgba(223,245,168,0.45), rgba(255,255,255,0.98))',
            }}
          >
            <p
              style={{
                margin: '0 0 6px',
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing: '0.16em',
                color: '#4c675d',
                textTransform:
                  'uppercase',
              }}
            >
              Conversación
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'space-between',
                gap: '16px',
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                    color: '#123b4a',
                    fontSize: '30px',
                    lineHeight: 1.05,
                  }}
                >
                  {otherPet.name}
                </h1>

                <p
                  style={{
                    margin: '7px 0 0',
                    color: '#6c7b77',
                  }}
                >
                  {connection.currentPet.name}{' '}
                  y {otherPet.name}
                </p>
              </div>

              <div
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '18px',
                  overflow: 'hidden',
                  background: '#dff5a8',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#31515a',
                  fontSize: '18px',
                  fontWeight: 900,
                  flexShrink: 0,
                  border:
                    '1px solid rgba(18,59,74,0.08)',
                }}
              >
                {otherPet.photos &&
                otherPet.photos.length > 0 ? (
                  <img
                    src={getPhotoUrl(
                      [...otherPet.photos].sort(
                        (a, b) =>
                         a.sortOrder -
                         b.sortOrder,
                      )[0].storageKey,
                      [...otherPet.photos].sort(
                        (a, b) =>
                          a.sortOrder -
                          b.sortOrder,
                      )[0].url,
                    )}
                    alt={`Fotografía de ${otherPet.name}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                ) : (
                  getInitials(otherPet.name)
                )}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginTop: '16px',
              }}
            >
              <span
                style={{
                  padding: '7px 11px',
                  borderRadius: '999px',
                  background: '#f2f6f0',
                  color: '#4c675d',
                  fontSize: '12px',
                  fontWeight: 800,
                }}
              >
                {connection.compatibility}% compatible
              </span>

              <span
                style={{
                  padding: '7px 11px',
                  borderRadius: '999px',
                  background: '#f2f6f0',
                  color: '#4c675d',
                  fontSize: '12px',
                  fontWeight: 800,
                }}
              >
                Conectados desde{' '}
                {formatDate(
                  connection.createdAt,
                )}
              </span>

              <span
                style={{
                  padding: '7px 11px',
                  borderRadius: '999px',
                  background:
                    realtimeConnected
                      ? '#edf8dc'
                      : '#f2f6f0',
                  color:
                    realtimeConnected
                      ? '#527a26'
                      : '#6c7b77',
                  fontSize: '12px',
                  fontWeight: 800,
                }}
              >
                {realtimeConnected
                  ? '● En tiempo real'
                  : '○ Conectando…'}
              </span>
              </div>
            
            <div
              style={{
                marginTop: '18px',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setShowMeetupForm(
                    (current) => !current,
                  )
                }
                style={{
                  border:
                    '1px solid rgba(18,59,74,0.10)',
                  borderRadius: '14px',
                  padding: '11px 16px',
                  background: '#123b4a',
                  color: '#ffffff',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow:
                    '0 8px 18px rgba(18,59,74,0.10)',
                }}
              >
                {showMeetupForm
                  ? 'Cerrar propuesta'
                  : 'Proponer encuentro'}
              </button>
            </div>
          </header>
          
                      {showMeetupForm && (
            <form
              onSubmit={handleCreateMeetup}
              style={{
                padding: '20px 22px',
                borderBottom:
                  '1px solid rgba(18,59,74,0.08)',
                background: '#ffffff',
                display: 'grid',
                gap: '14px',
              }}
            >
              <div>
                <strong
                  style={{
                    display: 'block',
                    color: '#123b4a',
                    fontSize: '17px',
                  }}
                >
                  Proponer encuentro
                </strong>

                <p
                  style={{
                    margin: '5px 0 0',
                    color: '#71807c',
                    fontSize: '13px',
                  }}
                >
                  Propón una fecha y un lugar para encontrarse.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(2, minmax(0, 1fr))',
                  gap: '12px',
                }}
              >
                <label
                  style={{
                    display: 'grid',
                    gap: '6px',
                    color: '#4c675d',
                    fontSize: '12px',
                    fontWeight: 800,
                  }}
                >
                  Fecha y hora
                  <input
                    type="datetime-local"
                    required
                    value={meetupForm.startAt}
                    onChange={(event) =>
                      setMeetupForm((current) => ({
                        ...current,
                        startAt: event.target.value,
                      }))
                    }
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      border:
                        '1px solid rgba(18,59,74,0.12)',
                      borderRadius: '12px',
                      padding: '11px 12px',
                      background: '#f8faf7',
                      color: '#243532',
                      fontSize: '13px',
                    }}
                  />
                </label>

              </div>

              <label
                style={{
                  display: 'grid',
                  gap: '6px',
                  color: '#4c675d',
                  fontSize: '12px',
                  fontWeight: 800,
                }}
              >
                Lugar
                <input
                  type="text"
                  required
                  maxLength={160}
                  value={meetupForm.placeName}
                  onChange={(event) =>
                    setMeetupForm((current) => ({
                      ...current,
                      placeName: event.target.value,
                    }))
                  }
                  placeholder="Ej. Parque Bicentenario"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    border:
                      '1px solid rgba(18,59,74,0.12)',
                    borderRadius: '12px',
                    padding: '11px 12px',
                    background: '#f8faf7',
                    color: '#243532',
                    fontSize: '13px',
                  }}
                />
              </label>

              <label
                style={{
                  display: 'grid',
                  gap: '6px',
                  color: '#4c675d',
                  fontSize: '12px',
                  fontWeight: 800,
                }}
              >
                Dirección
                <input
                  type="text"
                  maxLength={300}
                  value={meetupForm.placeAddress}
                  onChange={(event) =>
                    setMeetupForm((current) => ({
                      ...current,
                      placeAddress: event.target.value,
                    }))
                  }
                  placeholder="Dirección del encuentro"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    border:
                      '1px solid rgba(18,59,74,0.12)',
                    borderRadius: '12px',
                    padding: '11px 12px',
                    background: '#f8faf7',
                    color: '#243532',
                    fontSize: '13px',
                  }}
                />
              </label>

              {petFriendlyPlaces.length > 0 && (
                <label
                  style={{
                    display: 'grid',
                    gap: '6px',
                    color: '#4c675d',
                    fontSize: '12px',
                    fontWeight: 800,
                  }}
                >
                  Lugar pet friendly
                  <select
                    value={meetupForm.petFriendlyPlaceId}
                    onChange={(event) => {
                      const placeId =
                        event.target.value;

                      const place =
                        petFriendlyPlaces.find(
                          (item) =>
                            item.id === placeId,
                        );

                      setMeetupForm((current) => ({
                        ...current,
                        petFriendlyPlaceId:
                          placeId,
                        placeName:
                          place?.name ??
                          current.placeName,
                        placeAddress:
                          place?.address ??
                          current.placeAddress,
                      }));
                    }}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      border:
                        '1px solid rgba(18,59,74,0.12)',
                      borderRadius: '12px',
                      padding: '11px 12px',
                      background: '#f8faf7',
                      color: '#243532',
                      fontSize: '13px',
                    }}
                  >
                    <option value="">
                      Seleccionar lugar (opcional)
                    </option>

                    {petFriendlyPlaces.map(
                      (place) => (
                        <option
                          key={place.id}
                          value={place.id}
                        >
                          {place.name} · {place.commune}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '2px',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowMeetupForm(false);
                    setMeetupForm({
                      startAt: '',
                                        placeName: '',
                      placeAddress: '',
                      petFriendlyPlaceId: '',
                    });
                  }}
                  style={{
                    border:
                      '1px solid rgba(18,59,74,0.10)',
                    borderRadius: '12px',
                    padding: '10px 15px',
                    background: '#ffffff',
                    color: '#60716d',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    creatingMeetup ||
                    !meetupForm.startAt ||
                    !meetupForm.placeName.trim()
                  }
                  style={{
                    border: 0,
                    borderRadius: '12px',
                    padding: '10px 17px',
                    background:
                      creatingMeetup ||
                      !meetupForm.startAt ||
                      !meetupForm.placeName.trim()
                        ? '#d9e3d2'
                        : '#b8e36b',
                    color: '#123b4a',
                    fontWeight: 900,
                    cursor:
                      creatingMeetup ||
                      !meetupForm.startAt ||
                      !meetupForm.placeName.trim()
                        ? 'default'
                        : 'pointer',
                  }}
                >
                  {creatingMeetup
                    ? 'Enviando…'
                    : 'Enviar propuesta'}
                </button>
              </div>
            </form>
          )}        
          <div
            style={{
              minHeight: '430px',
              maxHeight: '58vh',
              overflowY: 'auto',
              padding: '24px 22px',
              background: '#f8faf7',
            }}
          >
            {messages.length === 0 && meetups.length === 0 ? (
              <div
                style={{
                  minHeight: '360px',
                  display: 'grid',
                  placeItems: 'center',
                  textAlign: 'center',
                  padding: '30px',
                }}
              >
                <div>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      margin:
                        '0 auto 16px',
                      borderRadius: '22px',
                      background:
                        '#dff5a8',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#123b4a',
                      fontSize: '26px',
                    }}
                  >
                    💬
                  </div>

                  <h2
                    style={{
                      margin: 0,
                      color: '#123b4a',
                      fontSize: '20px',
                    }}
                  >
                    Comienza la conversación
                  </h2>

                  <p
                    style={{
                      margin:
                        '8px auto 0',
                      maxWidth: '420px',
                      color: '#71807c',
                      lineHeight: 1.6,
                    }}
                  >
                    Ya existe una conexión entre sus mascotas. Este es el momento de dar el primer paso.
                  </p>
                </div>
              </div>
                
            ) : (
              <>
         {meetups.map((meetup) => {
  const startDate = new Date(meetup.startAt);

  const dateLabel = new Intl.DateTimeFormat(
    'es-CL',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  ).format(startDate);

  const isProposed = meetup.status === 'PROPOSED';
  const isConfirmed = meetup.status === 'CONFIRMED';
  const isCancelled = meetup.status === 'CANCELLED';

  return (
    <div
      key={`meetup-${meetup.id}`}
      style={{
        marginBottom: '18px',
        padding: '18px',
        borderRadius: '20px',
        background: '#ffffff',
        border: isConfirmed
          ? '1px solid rgba(184,227,107,0.75)'
          : '1px solid rgba(18,59,74,0.10)',
        boxShadow:
          '0 8px 22px rgba(18,59,74,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            flexShrink: 0,
            borderRadius: '14px',
            background: isConfirmed
              ? '#edf8dc'
              : '#dff5a8',
            display: 'grid',
            placeItems: 'center',
            color: '#123b4a',
            fontSize: '20px',
          }}
        >
          🐾
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              color: '#123b4a',
              fontWeight: 900,
              fontSize: '15px',
            }}
          >
            {isConfirmed
              ? 'Encuentro confirmado'
              : isCancelled
                ? 'Encuentro cancelado'
                : 'Propuesta de encuentro'}
          </div>

          <div
            style={{
              marginTop: '3px',
              color: '#71807c',
              fontSize: '12px',
            }}
          >
            {isConfirmed
              ? 'El encuentro está confirmado'
              : isCancelled
                ? 'Esta propuesta fue cancelada'
                : 'Pendiente de confirmación'}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gap: '10px',
          color: '#243532',
          fontSize: '13px',
        }}
      >
        <div>
          <strong>Mascotas:</strong>{' '}
          {meetup.petA?.name ?? 'Mascota'} y{' '}
          {meetup.petB?.name ?? 'Mascota'}
        </div>

        <div>
          <strong>Fecha:</strong>{' '}
          {dateLabel}
        </div>

        <div>
          <strong>Lugar:</strong>{' '}
          {meetup.placeName}
        </div>

        {meetup.placeAddress && (
          <div
            style={{
              color: '#60716d',
              lineHeight: 1.5,
            }}
          >
            {meetup.placeAddress}
          </div>
        )}

        {meetup.petFriendlyPlace && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              width: 'fit-content',
              padding: '6px 10px',
              borderRadius: 999,
              background: '#edf8dc',
              color: '#527a26',
              fontSize: '11px',
              fontWeight: 900,
            }}
          >
            🐾 Lugar pet friendly
          </div>
        )}
      </div>

    <div
  style={{
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '18px',
  }}
>
  <button
    type="button"
    onClick={() =>
      router.push(`/encuentros/${meetup.id}`)
    }
    style={{
      flex: '1 1 180px',
      border: '1px solid rgba(18,59,74,0.10)',
      borderRadius: '13px',
      padding: '12px 16px',
      background: '#ffffff',
      color: '#123b4a',
      fontWeight: 900,
      cursor: 'pointer',
    }}
  >
    📅 Ver encuentro
  </button>

  {isProposed && (
    <>
      <button
        type="button"
        onClick={() =>
          handleMeetupStatus(
            meetup.id,
            'CONFIRMED',
          )
        }
        style={{
          flex: '1 1 180px',
          border: 0,
          borderRadius: '13px',
          padding: '12px 16px',
          background: '#b8e36b',
          color: '#123b4a',
          fontWeight: 900,
          cursor: 'pointer',
        }}
      >
        Aceptar encuentro
      </button>

      <button
        type="button"
        onClick={() =>
          handleMeetupStatus(
            meetup.id,
            'CANCELLED',
          )
        }
        style={{
          flex: '1 1 180px',
          border:
            '1px solid rgba(18,59,74,0.10)',
          borderRadius: '13px',
          padding: '12px 16px',
          background: '#ffffff',
          color: '#60716d',
          fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        Cancelar propuesta
      </button>
    </>
  )}
</div>  
    </div>
  );
})}

                {messages.map((message) => {
                  const mine =
                    message.senderId ===
                    currentUserId;

                  return (
                    <div
                      key={message.id}
                      style={{
                        display: 'flex',
                        justifyContent:
                          mine
                            ? 'flex-end'
                            : 'flex-start',
                        marginBottom: '12px',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '78%',
                          padding: '11px 14px',
                          borderRadius:
                            mine
                              ? '18px 18px 5px 18px'
                              : '18px 18px 18px 5px',
                          background:
                            mine
                              ? '#b8e36b'
                              : '#ffffff',
                          border:
                            mine
                              ? '1px solid rgba(18,59,74,0.03)'
                              : '1px solid rgba(18,59,74,0.08)',
                          color: '#243532',
                          boxShadow:
                            '0 7px 18px rgba(18,59,74,0.05)',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '14px',
                            lineHeight: 1.55,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {message.body}
                        </div>

                        <div
                          style={{
                            marginTop: '5px',
                            textAlign:
                              mine
                                ? 'right'
                                : 'left',
                            fontSize: '10px',
                            color: '#71807c',
                          }}
                        >
                          {formatTime(
                            message.createdAt,
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}


            <div
              ref={messagesEndRef}
            />
          </div>

          {error && (
            <div
              style={{
                margin: '0 22px',
                padding: '10px 12px',
                borderRadius: '12px',
                background: '#fff3f1',
                color: '#9b493e',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              gap: '10px',
              padding:
                '18px 20px 20px',
              borderTop:
                '1px solid rgba(18,59,74,0.08)',
              background: '#ffffff',
            }}
          >
            <input
              value={messageText}
              onChange={(event) =>
                setMessageText(
                  event.target.value,
                )
              }
              placeholder="Escribe un mensaje…"
              maxLength={2000}
              disabled={sending}
              style={{
                flex: 1,
                minWidth: 0,
                border:
                  '1px solid rgba(18,59,74,0.12)',
                borderRadius: '14px',
                padding:
                  '13px 15px',
                outline: 'none',
                color: '#243532',
                background:
                  '#f8faf7',
                fontSize: '14px',
              }}
            />

            <button
              type="submit"
              disabled={
                sending ||
                !messageText.trim()
              }
              style={{
                border: 0,
                borderRadius: '14px',
                padding: '0 20px',
                minWidth: '110px',
                background:
                  sending ||
                  !messageText.trim()
                    ? '#d9e3d2'
                    : '#b8e36b',
                color: '#123b4a',
                fontWeight: 900,
                cursor:
                  sending ||
                  !messageText.trim()
                    ? 'default'
                    : 'pointer',
              }}
            >
              {sending
                ? 'Enviando…'
                : 'Enviar'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
