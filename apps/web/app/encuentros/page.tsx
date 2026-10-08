'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '../../lib/config';

type PetPhoto = {
  id: string;
  storageKey: string;
  sortOrder: number;
  url?: string;
};

type MeetupPet = {
  id: string;
  name: string;
  photos?: PetPhoto[];
};

type Meetup = {
  id: string;
  startAt: string;
  placeName: string;
  placeAddress: string | null;
  status: 'PROPOSED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  petA: MeetupPet;
  petB: MeetupPet;
  petFriendlyPlace?: { id: string; name: string } | null;
};

function statusLabel(status: Meetup['status']) {
  return {
    PROPOSED: 'Pendiente',
    CONFIRMED: 'Confirmado',
    CANCELLED: 'Cancelado',
    COMPLETED: 'Completado',
  }[status];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getPetPhoto(pet: MeetupPet) {
  const photo = pet.photos?.[0];

  if (!photo) {
    return null;
  }

  if (photo.url) {
    return photo.url;
  }

  if (
    photo.storageKey.startsWith('http://') ||
    photo.storageKey.startsWith('https://')
  ) {
    return photo.storageKey;
  }

  return null;
}

function PetPhotoCard({
  pet,
  size,
}: {
  pet: MeetupPet;
  size: number;
}) {
  const photoUrl = getPetPhoto(pet);

  return (
    <div
      style={{
        width: size,
        flexShrink: 0,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size >= 80 ? 18 : 14,
          overflow: 'hidden',
          background: '#eef3ef',
          border: '1px solid rgba(18,59,74,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={pet.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <span
            style={{
              fontSize: size >= 80 ? 30 : 22,
              opacity: 0.65,
            }}
          >
            🐶
          </span>
        )}
      </div>

      <div
        style={{
          marginTop: 6,
          color: '#243532',
          fontSize: size >= 80 ? 13 : 12,
          fontWeight: 800,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {pet.name}
      </div>
    </div>
  );
}

export default function EncuentrosPage() {
  const router = useRouter();
  const [items, setItems] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    const token = localStorage.getItem('numao_access_token');

    if (!token) {
      router.push('/login');
      return;
    }

    const response = await fetch(`${API_URL}/meetups`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (response.status === 401) {
      localStorage.removeItem('numao_access_token');
      localStorage.removeItem('numao_user');
      router.push('/login');
      return;
    }

    const data = await response.json().catch(() => []);

    if (!response.ok) {
      setError(
        data?.message ||
          'No pudimos cargar tus encuentros.',
      );
      return;
    }

    setItems(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const upcoming = items.filter(
    (item) =>
      item.status === 'PROPOSED' ||
      item.status === 'CONFIRMED',
  );

  const history = items.filter(
    (item) =>
      item.status === 'CANCELLED' ||
      item.status === 'COMPLETED',
  );

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 8% 0%, rgba(184,227,107,0.16), transparent 28%), #f7f8f5',
        color: '#243532',
        padding: '28px 20px 50px',
      }}
    >
      <div
        style={{
          width: 'min(100%, 920px)',
          margin: '0 auto',
        }}
      >
        <button
          onClick={() =>
            router.push('/mis-mascotas')
          }
          style={{
            border: 0,
            background: 'transparent',
            color: '#60716d',
            fontWeight: 800,
            cursor: 'pointer',
            padding: '8px 0',
          }}
        >
          ← Mis mascotas
        </button>

        <header
          style={{
            margin: '20px 0 28px',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#4c675d',
            }}
          >
            NUMAO
          </p>

          <h1
            style={{
              margin: '7px 0 8px',
              color: '#123b4a',
              fontSize: 34,
            }}
          >
            Encuentros
          </h1>

          <p
            style={{
              margin: 0,
              color: '#6c7b77',
            }}
          >
            Tus propuestas, encuentros confirmados e historial.
          </p>
        </header>

        {loading ? (
          <section
            style={{
              padding: 32,
              borderRadius: 24,
              background: '#fff',
              border:
                '1px solid rgba(18,59,74,0.08)',
            }}
          >
            Cargando encuentros…
          </section>
        ) : error ? (
          <section
            style={{
              padding: 32,
              borderRadius: 24,
              background: '#fff',
              color: '#9b493e',
            }}
          >
            {error}
          </section>
        ) : (
          <>
            <section>
              <h2
                style={{
                  color: '#123b4a',
                  fontSize: 20,
                }}
              >
                Próximos
              </h2>

              {upcoming.length === 0 ? (
                <div
                  style={{
                    padding: 26,
                    borderRadius: 22,
                    background: '#fff',
                    border:
                      '1px solid rgba(18,59,74,0.08)',
                    color: '#71807c',
                  }}
                >
                  Todavía no tienes encuentros pendientes o confirmados.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gap: 12,
                  }}
                >
                  {upcoming.map((item) => (
                    <button
                      key={item.id}
                      onClick={() =>
                        router.push(
                          `/encuentros/${item.id}`,
                        )
                      }
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border:
                          '1px solid rgba(18,59,74,0.08)',
                        borderRadius: 22,
                        background: '#fff',
                        padding: 20,
                        cursor: 'pointer',
                        boxShadow:
                          '0 12px 30px rgba(18,59,74,0.05)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent:
                            'space-between',
                          gap: 14,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            minWidth: 0,
                          }}
                        >
                          <PetPhotoCard
                            pet={item.petA}
                            size={72}
                          />

                          <div
                            style={{
                              fontSize: 20,
                              color: '#9aa7a2',
                              fontWeight: 500,
                            }}
                          >
                            ×
                          </div>

                          <PetPhotoCard
                            pet={item.petB}
                            size={72}
                          />
                        </div>

                        <span
                          style={{
                            alignSelf: 'flex-start',
                            flexShrink: 0,
                            borderRadius: 999,
                            padding:
                              '6px 10px',
                            background:
                              item.status ===
                              'CONFIRMED'
                                ? '#edf8dc'
                                : '#f2f6f0',
                            color:
                              item.status ===
                              'CONFIRMED'
                                ? '#527a26'
                                : '#4c675d',
                            fontSize: 12,
                            fontWeight: 900,
                          }}
                        >
                          {statusLabel(
                            item.status,
                          )}
                        </span>
                      </div>

                      <p
                        style={{
                          margin:
                            '16px 0 4px',
                          fontWeight: 800,
                          textTransform:
                            'capitalize',
                        }}
                      >
                        {formatDate(
                          item.startAt,
                        )}
                      </p>

                      <p
                        style={{
                          margin: 0,
                          color: '#71807c',
                        }}
                      >
                        📍 {item.placeName}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section
              style={{
                marginTop: 34,
              }}
            >
              <h2
                style={{
                  color: '#123b4a',
                  fontSize: 20,
                }}
              >
                Historial
              </h2>

              {history.length === 0 ? (
                <div
                  style={{
                    padding: 26,
                    borderRadius: 22,
                    background: '#fff',
                    border:
                      '1px solid rgba(18,59,74,0.08)',
                    color: '#71807c',
                  }}
                >
                  Aún no hay encuentros en el historial.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() =>
                        router.push(
                          `/encuentros/${item.id}`,
                        )
                      }
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border:
                          '1px solid rgba(18,59,74,0.06)',
                        borderRadius: 18,
                        background: '#fff',
                        padding: 16,
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <PetPhotoCard
                          pet={item.petA}
                          size={52}
                        />

                        <div
                          style={{
                            color: '#9aa7a2',
                            fontWeight: 700,
                          }}
                        >
                          ×
                        </div>

                        <PetPhotoCard
                          pet={item.petB}
                          size={52}
                        />

                        <div
                          style={{
                            marginLeft: 4,
                            color: '#71807c',
                            fontSize: 13,
                          }}
                        >
                          {item.placeName} ·{' '}
                          {statusLabel(
                            item.status,
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
