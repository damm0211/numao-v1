'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  API_URL,
  FILES_URL,
} from '../../lib/config';
interface PetPhoto {
  id: string;
  storageKey: string;
  sortOrder: number;
}

interface Pet {
  id: string;
  name: string;
  breed: string | null;
  size: string | null;
  birthDate: string;
  bio: string | null;
  energyLevel: number | null;
  sociability: number | null;
  playfulness: number | null;
  photos?: PetPhoto[];
}

interface Connection {
  id: string;
  status: string;
  compatibility: number | null;
  algorithmVersion: string | null;
  createdAt: string;
  currentPet: Pet;
  otherPet: Pet;
}

function calculateAge(birthDate: string) {
  const birth = new Date(birthDate);

  if (Number.isNaN(birth.getTime())) {
    return null;
  }

  const today = new Date();

  let age =
    today.getFullYear() -
    birth.getFullYear();

  const monthDifference =
    today.getMonth() -
    birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return Math.max(0, age);
}

function formatSize(size: string | null) {
  if (size === 'SMALL') return 'Pequeño';
  if (size === 'MEDIUM') return 'Mediano';
  if (size === 'LARGE') return 'Grande';

  return 'Tamaño no especificado';
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

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase(),
    )
    .join('');
}

function getCompatibilityLabel(
  value: number | null,
) {
  if (value === null) {
    return 'Compatibilidad';
  }

  if (value >= 90) {
    return 'Muy alta compatibilidad';
  }

  if (value >= 80) {
    return 'Alta compatibilidad';
  }

  if (value >= 70) {
    return 'Buena compatibilidad';
  }

  return 'Compatibilidad';
}

function getCompatibilityWidth(
  value: number | null,
) {
  if (value === null) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, value),
  );
}

function getPhotoUrl(
  pet: Pet,
) {
  const photo =
    pet.photos
      ?.slice()
      .sort(
        (a, b) =>
          a.sortOrder -
          b.sortOrder,
      )[0];

  if (!photo?.storageKey) {
    return null;
  }

  return `${FILES_URL}/uploads/${photo.storageKey}`;
}

export default function ConnectionsPage() {
  const router = useRouter();

  const [connections, setConnections] =
    useState<Connection[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    async function loadConnections() {
      try {
        setLoading(true);
        setError('');

        const token =
          localStorage.getItem(
            'numao_access_token',
          );

        if (!token) {
          router.push('/login');
          return;
        }

        const response =
          await fetch(
            `${API_URL}/connections`,
            {
              method: 'GET',
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
              cache: 'no-store',
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

          router.push('/login');
          return;
        }

        if (!response.ok) {
          throw new Error(
            data?.message ||
              'No pudimos cargar tus conexiones.',
          );
        }

        setConnections(
          Array.isArray(data)
            ? data
            : [],
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : 'No pudimos cargar tus conexiones.',
        );
      } finally {
        setLoading(false);
      }
    }

    loadConnections();
  }, [router]);

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at 8% 0%, rgba(184, 227, 107, 0.16), transparent 28%), radial-gradient(circle at 92% 10%, rgba(18, 59, 74, 0.055), transparent 30%), #f7f8f5',
    color: '#243532',
    padding:
      '24px 20px 64px',
    boxSizing: 'border-box',
  };

  const maxWidthStyle: React.CSSProperties = {
    width: 'min(100%, 1080px)',
    margin: '0 auto',
  };

  if (loading) {
    return (
      <main style={pageStyle}>
        <div
          style={{
            ...maxWidthStyle,
            minHeight:
              'calc(100vh - 88px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 'min(100%, 500px)',
              padding:
                '48px 32px',
              borderRadius: '28px',
              background:
                'rgba(255,255,255,0.9)',
              border:
                '1px solid rgba(18,59,74,0.08)',
              boxShadow:
                '0 24px 70px rgba(18,59,74,0.10)',
              textAlign: 'center',
              backdropFilter:
                'blur(18px)',
            }}
          >
            <div
              style={{
                width: '58px',
                height: '58px',
                margin:
                  '0 auto 20px',
                borderRadius: '20px',
                background:
                  'linear-gradient(135deg, #dff5a8, #b8e36b)',
                display: 'grid',
                placeItems: 'center',
                fontSize: '27px',
                animation:
                  'numaoPulse 1.6s ease-in-out infinite',
              }}
            >
              🐾
            </div>

            <p
              style={{
                margin: 0,
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing:
                  '0.18em',
                color: '#31515a',
              }}
            >
              NUMAO
            </p>

            <h1
              style={{
                margin:
                  '10px 0 8px',
                color: '#123b4a',
                fontSize: '28px',
                letterSpacing:
                  '-0.035em',
              }}
            >
              Cargando conexiones
            </h1>

            <p
              style={{
                margin: 0,
                color: '#74817f',
                fontSize: '14px',
                lineHeight: 1.6,
              }}
            >
              Estamos preparando
              tus conexiones.
            </p>
          </div>
        </div>

        <style jsx>{`
          @keyframes numaoPulse {
            0%,
            100% {
              transform: scale(1);
              opacity: 1;
            }

            50% {
              transform: scale(1.06);
              opacity: 0.78;
            }
          }
        `}</style>
      </main>
    );
  }

  if (error) {
    return (
      <main style={pageStyle}>
        <div
          style={{
            ...maxWidthStyle,
            minHeight:
              'calc(100vh - 88px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 'min(100%, 540px)',
              padding:
                '46px 32px',
              borderRadius: '28px',
              background:
                'rgba(255,255,255,0.92)',
              border:
                '1px solid rgba(18,59,74,0.08)',
              boxShadow:
                '0 24px 70px rgba(18,59,74,0.10)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                margin:
                  '0 auto 18px',
                borderRadius: '22px',
                background:
                  '#eff7df',
                display: 'grid',
                placeItems: 'center',
                fontSize: '29px',
              }}
            >
              ⚠️
            </div>

            <p
              style={{
                margin: 0,
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing:
                  '0.17em',
                color: '#31515a',
              }}
            >
              CONEXIONES
            </p>

            <h1
              style={{
                margin:
                  '10px 0 10px',
                color: '#123b4a',
                fontSize: '27px',
                letterSpacing:
                  '-0.04em',
              }}
            >
              No pudimos cargar
              tus conexiones
            </h1>

            <p
              style={{
                margin:
                  '0 auto 24px',
                maxWidth: '420px',
                color: '#71807d',
                lineHeight: 1.65,
              }}
            >
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              style={{
                border: 0,
                borderRadius: '13px',
                padding:
                  '13px 23px',
                background:
                  '#b8e36b',
                color: '#123b4a',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              Intentar nuevamente
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={maxWidthStyle}>
        <header
          style={{
            minHeight: '66px',
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'space-between',
            gap: '18px',
            marginBottom: '34px',
          }}
        >
          <button
            type="button"
            onClick={() =>
              router.push('/')
            }
            aria-label="Volver al inicio"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              border: 0,
              background:
                'transparent',
              color: '#123b4a',
              fontWeight: 900,
              fontSize: '16px',
              letterSpacing:
                '0.14em',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '10px',
                background:
                  '#b8e36b',
                display: 'grid',
                placeItems: 'center',
                fontSize: '15px',
              }}
            >
              🐾
            </span>

            <span>NUMAO</span>
          </button>

          <div
            style={{
              display: 'flex',
              gap: '9px',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={() =>
                router.push(
                  '/descubrir',
                )
              }
              style={{
                border:
                  '1px solid rgba(18,59,74,0.12)',
                borderRadius: '12px',
                background:
                  'rgba(255,255,255,0.72)',
                padding:
                  '10px 14px',
                color: '#123b4a',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Descubrir
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  '/mis-mascotas',
                )
              }
              style={{
                border:
                  '1px solid rgba(18,59,74,0.12)',
                borderRadius: '12px',
                background:
                  'rgba(255,255,255,0.72)',
                padding:
                  '10px 14px',
                color: '#123b4a',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Mis mascotas
            </button>
          </div>
        </header>

        <section
          style={{
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding:
                '7px 11px',
              borderRadius: '999px',
              background:
                'rgba(184,227,107,0.18)',
              color: '#31515a',
              fontSize: '10px',
              fontWeight: 900,
              letterSpacing:
                '0.15em',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius:
                  '50%',
                background:
                  '#8ebc43',
              }}
            />

            CONEXIONES
          </div>

          <h1
            style={{
              margin:
                '15px 0 10px',
              color: '#123b4a',
              fontSize:
                'clamp(38px, 5vw, 58px)',
              lineHeight: 1,
              letterSpacing:
                '-0.055em',
              fontWeight: 800,
            }}
          >
            Tus conexiones
          </h1>

          <p
            style={{
              maxWidth: '610px',
              margin: 0,
              color: '#71807d',
              fontSize: '16px',
              lineHeight: 1.7,
            }}
          >
            Aquí aparecen las conexiones
            que se han producido cuando
            tú y otra mascota han mostrado
            interés mutuamente.
          </p>
        </section>

        {connections.length === 0 ? (
          <section
            style={{
              minHeight:
                '430px',
              display: 'grid',
              placeItems:
                'center',
              padding:
                '40px 24px',
              borderRadius: '30px',
              background:
                'rgba(255,255,255,0.82)',
              border:
                '1px solid rgba(18,59,74,0.08)',
              boxShadow:
                '0 25px 75px rgba(18,59,74,0.08)',
              textAlign: 'center',
              backdropFilter:
                'blur(14px)',
            }}
          >
            <div
              style={{
                maxWidth: '500px',
              }}
            >
              <div
                style={{
                  width: '82px',
                  height: '82px',
                  margin:
                    '0 auto 22px',
                  borderRadius: '28px',
                  background:
                    'linear-gradient(135deg, #eef8db, #dff3b5)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '38px',
                  boxShadow:
                    '0 14px 34px rgba(18,59,74,0.08)',
                }}
              >
                🐾
              </div>

              <p
                style={{
                  margin: 0,
                  color: '#31515a',
                  fontSize: '11px',
                  fontWeight: 900,
                  letterSpacing:
                    '0.16em',
                }}
              >
                TODAVÍA NO HAY MATCH
              </p>

              <h2
                style={{
                  margin:
                    '10px 0 12px',
                  color: '#123b4a',
                  fontSize: '30px',
                  letterSpacing:
                    '-0.04em',
                }}
              >
                Tu próxima conexión
                puede estar ahí afuera.
              </h2>

              <p
                style={{
                  margin:
                    '0 auto 25px',
                  maxWidth: '440px',
                  color: '#71807d',
                  lineHeight: 1.7,
                }}
              >
                Explora nuevos perfiles,
                encuentra mascotas compatibles
                y descubre con quién puede
                existir una conexión.
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    '/descubrir',
                  )
                }
                style={{
                  border: 0,
                  borderRadius: '14px',
                  padding:
                    '14px 25px',
                  background:
                    '#b8e36b',
                  color: '#123b4a',
                  fontWeight: 900,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow:
                    '0 12px 28px rgba(18,59,74,0.10)',
                }}
              >
                Descubrir mascotas
              </button>
            </div>
          </section>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'space-between',
                gap: '20px',
                marginBottom: '18px',
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: '#71807d',
                  fontSize: '13px',
                }}
              >
                {connections.length}{' '}
                {connections.length === 1
                  ? 'conexión activa'
                  : 'conexiones activas'}
              </p>


            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '18px',
              }}
            >
              {connections.map(
                (connection) => {
                  const pet =
                    connection.otherPet;

                  const age =
                    calculateAge(
                      pet.birthDate,
                    );

                  const compatibility =
                    connection.compatibility;

                  const photoUrl =
                    getPhotoUrl(pet);

                  return (
                    <article
                      key={
                        connection.id
                      }
                      style={{
                        position:
                          'relative',
                        overflow:
                          'hidden',
                        padding:
                          '24px',
                        borderRadius:
                          '25px',
                        background:
                          'rgba(255,255,255,0.9)',
                        border:
                          '1px solid rgba(18,59,74,0.08)',
                        boxShadow:
                          '0 20px 55px rgba(18,59,74,0.08)',
                        transition:
                          'transform 0.2s ease, box-shadow 0.2s ease',
                      }}
                    >
                      <div
                        style={{
                          position:
                            'absolute',
                          width: '150px',
                          height: '150px',
                          borderRadius:
                            '50%',
                          top: '-95px',
                          right:
                            '-75px',
                          background:
                            'rgba(184,227,107,0.16)',
                          pointerEvents:
                            'none',
                        }}
                      />

                      <div
                        style={{
                          display:
                            'flex',
                          alignItems:
                            'center',
                          gap: '15px',
                          marginBottom:
                            '21px',
                        }}
                      >
                        <div
                          style={{
                            width: '68px',
                            height: '68px',
                            flex:
                              '0 0 auto',
                            borderRadius:
                              '22px',
                            overflow:
                              'hidden',
                            background:
                              'linear-gradient(135deg, #e8f6c9, #cde990)',
                            display:
                              'grid',
                            placeItems:
                              'center',
                            color:
                              '#123b4a',
                            fontSize:
                              '21px',
                            fontWeight:
                              900,
                            boxShadow:
                              'inset 0 0 0 1px rgba(18,59,74,0.05)',
                          }}
                        >
                          {photoUrl ? (
                            <img
                              src={
                                photoUrl
                              }
                              alt={`Foto de ${pet.name}`}
                              style={{
                                width:
                                  '100%',
                                height:
                                  '100%',
                                objectFit:
                                  'cover',
                                display:
                                  'block',
                              }}
                              onError={(
                                event,
                              ) => {
                                event.currentTarget.style.display =
                                  'none';
                              }}
                            />
                          ) : (
                            getInitials(
                              pet.name,
                            )
                          )}
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >
                          <p
                            style={{
                              margin:
                                '0 0 4px',
                              color:
                                '#123b4a',
                              fontSize:
                                '22px',
                              fontWeight:
                                800,
                              letterSpacing:
                                '-0.035em',
                              whiteSpace:
                                'nowrap',
                              overflow:
                                'hidden',
                              textOverflow:
                                'ellipsis',
                            }}
                          >
                            {pet.name}
                          </p>

                          <p
                            style={{
                              margin: 0,
                              color:
                                '#71807d',
                              fontSize:
                                '12px',
                            }}
                          >
                            {pet.breed ||
                              'Raza no especificada'}
                          </p>
                        </div>
                      </div>

                      <div
                        style={{
                          display:
                            'flex',
                          flexWrap:
                            'wrap',
                          gap: '7px',
                          marginBottom:
                            '21px',
                        }}
                      >
                        {age !== null && (
                          <span
                            style={{
                              padding:
                                '7px 10px',
                              borderRadius:
                                '999px',
                              background:
                                '#f1f4ef',
                              color:
                                '#536562',
                              fontSize:
                                '11px',
                              fontWeight:
                                800,
                            }}
                          >
                            {age}{' '}
                            {age === 1
                              ? 'año'
                              : 'años'}
                          </span>
                        )}

                        <span
                          style={{
                            padding:
                              '7px 10px',
                            borderRadius:
                              '999px',
                            background:
                              '#f1f4ef',
                            color:
                              '#536562',
                            fontSize:
                              '11px',
                            fontWeight:
                              800,
                          }}
                        >
                          {formatSize(
                            pet.size,
                          )}
                        </span>

                        <span
                          style={{
                            padding:
                              '7px 10px',
                            borderRadius:
                              '999px',
                            background:
                              'rgba(184,227,107,0.18)',
                            color:
                              '#49621f',
                            fontSize:
                              '11px',
                            fontWeight:
                              900,
                          }}
                        >
                          ● Activa
                        </span>
                      </div>

                      <div
                        style={{
                          padding:
                            '17px',
                          borderRadius:
                            '17px',
                          background:
                            '#f8faf6',
                          border:
                            '1px solid rgba(18,59,74,0.055)',
                          marginBottom:
                            '17px',
                        }}
                      >
                        <div
                          style={{
                            display:
                              'flex',
                            alignItems:
                              'flex-end',
                            justifyContent:
                              'space-between',
                            gap: '12px',
                            marginBottom:
                              '10px',
                          }}
                        >
                          <div>
                            <p
                              style={{
                                margin: 0,
                                color:
                                  '#71807d',
                                fontSize:
                                  '10px',
                                fontWeight:
                                  900,
                                letterSpacing:
                                  '0.1em',
                                textTransform:
                                  'uppercase',
                              }}
                            >
                              Compatibilidad
                            </p>

                            <p
                              style={{
                                margin:
                                  '4px 0 0',
                                color:
                                  '#123b4a',
                                fontSize:
                                  '12px',
                                fontWeight:
                                  800,
                              }}
                            >
                              {getCompatibilityLabel(
                                compatibility,
                              )}
                            </p>
                          </div>

                          <strong
                            style={{
                              color:
                                '#123b4a',
                              fontSize:
                                '27px',
                              lineHeight:
                                1,
                              letterSpacing:
                                '-0.04em',
                            }}
                          >
                            {compatibility !==
                            null
                              ? `${Math.round(
                                  compatibility,
                                )}%`
                              : '—'}
                          </strong>
                        </div>

                        <div
                          style={{
                            height:
                              '7px',
                            overflow:
                              'hidden',
                            borderRadius:
                              '999px',
                            background:
                              '#e8ede5',
                          }}
                        >
                          <div
                            style={{
                              width: `${getCompatibilityWidth(
                                compatibility,
                              )}%`,
                              height:
                                '100%',
                              borderRadius:
                                '999px',
                              background:
                                'linear-gradient(90deg, #b8e36b, #8fbf43)',
                              transition:
                                'width 0.7s ease',
                            }}
                          />
                        </div>
                      </div>

                      {pet.bio && (
                        <p
                          style={{
                            margin:
                              '0 0 18px',
                            color:
                              '#687774',
                            fontSize:
                              '12px',
                            lineHeight:
                              1.65,
                            display:
                              '-webkit-box',
                            WebkitLineClamp:
                              2,
                            WebkitBoxOrient:
                              'vertical',
                            overflow:
                              'hidden',
                          }}
                        >
                          {pet.bio}
                        </p>
                      )}

                      <div
                        style={{
                          display:
                            'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'space-between',
                          gap: '12px',
                          paddingTop:
                            '16px',
                          borderTop:
                            '1px solid rgba(18,59,74,0.07)',
                        }}
                      >
                        <div>
                          <p
                            style={{
                              margin: 0,
                              color:
                                '#9aa5a2',
                              fontSize:
                                '10px',
                            }}
                          >
                            Conectados desde
                          </p>

                          <p
                            style={{
                              margin:
                                '3px 0 0',
                              color:
                                '#536562',
                              fontSize:
                                '11px',
                              fontWeight:
                                800,
                            }}
                          >
                            {formatDate(
                              connection.createdAt,
                            )}
                          </p>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '8px',
                            flexWrap: 'wrap',
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
                              border:
                                '1px solid rgba(18,59,74,0.12)',
                              borderRadius:
                                '12px',
                              padding:
                                '10px 13px',
                              background:
                                'rgba(255,255,255,0.86)',
                              color:
                                '#123b4a',
                              fontSize:
                                '11px',
                              fontWeight:
                                900,
                              cursor:
                                'pointer',
                            }}
                          >
                            Ver conexión
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/conexiones/${connection.id}/mensajes`,
                              )
                            }
                            style={{
                              border: 0,
                              borderRadius:
                                '12px',
                              padding:
                                '11px 15px',
                              background:
                                '#123b4a',
                              color:
                                '#ffffff',
                              fontSize:
                                '12px',
                              fontWeight:
                                900,
                              cursor:
                                'pointer',
                              boxShadow:
                                '0 9px 20px rgba(18,59,74,0.13)',
                            }}
                          >
                            Enviar mensaje
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
