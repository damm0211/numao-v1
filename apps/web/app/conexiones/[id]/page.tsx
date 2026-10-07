'use client';

import {
  useEffect,
  useState,
} from 'react';

import {
  useParams,
  useRouter,
} from 'next/navigation';

import {
  API_URL,
  FILES_URL,
} from '../../../lib/config';

interface PetPhoto {
  id: string;
  storageKey: string;
  sortOrder: number;
  url?: string;
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

function calculateAge(
  birthDate: string,
) {
  const birth =
    new Date(birthDate);

  if (
    Number.isNaN(
      birth.getTime(),
    )
  ) {
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
    (
      monthDifference === 0 &&
      today.getDate() <
        birth.getDate()
    )
  ) {
    age--;
  }

  return Math.max(0, age);
}

function formatSize(
  size: string | null,
) {
  if (size === 'SMALL') {
    return 'Pequeña';
  }

  if (size === 'MEDIUM') {
    return 'Mediana';
  }

  if (size === 'LARGE') {
    return 'Grande';
  }

  return 'Tamaño no especificado';
}

function formatDate(
  value: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '';
  }

  return new Intl.DateTimeFormat(
    'es-CL',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  ).format(date);
}

function getInitials(
  name: string,
) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase(),
    )
    .join('');
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
  if (photo.url) {
    return photo.url;
}
  if (
    photo.storageKey.startsWith('http://') ||
    photo.storageKey.startsWith('https://')
  ) {
    return photo.storageKey;
  }

  const normalized =
    photo.storageKey.replace(/^\/+/, '');

  return `${FILES_URL}/uploads/${normalized}`;
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

function getTraitLabel(value: number | null, labels: string[]) {
  if (value === null || value === undefined) return '—';
  const level = Math.min(5, Math.max(1, Math.round(value)));
  return labels[level - 1];
}

function getTraitLevel(value: number | null) {
  if (value === null || value === undefined) return 0;
  return Math.min(5, Math.max(0, Math.round(value)));
}

function renderTraitBar(value: number | null) {
  const level = getTraitLevel(value);
  if (!level) return <span style={{ color: '#9aa5a2' }}>—</span>;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }} aria-label={`${level} de 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} aria-hidden="true" style={{ color: index < level ? '#b8e36b' : '#e5ebe7', fontSize: '13px', lineHeight: 1 }}>■</span>
      ))}
    </span>
  );
}

export default function ConnectionDetailPage() {
  const router =
    useRouter();

  const params =
    useParams();

  const connectionId =
    params.id as string;

  const [
    connection,
    setConnection,
  ] =
    useState<Connection | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState('');

  useEffect(() => {
    async function loadConnection() {
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
            `${API_URL}/connections/${connectionId}`,
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

        if (
          response.status === 401
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

        if (!response.ok) {
          throw new Error(
            Array.isArray(
              data?.message,
            )
              ? data.message.join(
                  ', ',
                )
              : data?.message ||
                'No pudimos cargar esta conexión.',
          );
        }

        setConnection(data);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : 'No pudimos cargar esta conexión.',
        );
      } finally {
        setLoading(false);
      }
    }

    if (connectionId) {
      loadConnection();
    }
  }, [
    connectionId,
    router,
  ]);

  const pageStyle:
    React.CSSProperties = {
    minHeight:
      '100vh',
    background:
      'radial-gradient(circle at 8% 0%, rgba(184, 227, 107, 0.16), transparent 28%), radial-gradient(circle at 92% 10%, rgba(18, 59, 74, 0.055), transparent 30%), #f7f8f5',
    color: '#243532',
    padding:
      '24px 20px 64px',
    boxSizing:
      'border-box',
  };

  const maxWidthStyle:
    React.CSSProperties = {
    width:
      'min(100%, 1080px)',
    margin: '0 auto',
  };

  if (loading) {
    return (
      <main
        style={pageStyle}
      >
        <div
          style={{
            ...maxWidthStyle,
            minHeight:
              'calc(100vh - 88px)',
            display: 'flex',
            alignItems:
              'center',
            justifyContent:
              'center',
          }}
        >
          <div
            style={{
              width:
                'min(100%, 500px)',
              padding:
                '48px 32px',
              borderRadius:
                '28px',
              background:
                'rgba(255,255,255,0.9)',
              border:
                '1px solid rgba(18,59,74,0.08)',
              boxShadow:
                '0 24px 70px rgba(18,59,74,0.10)',
              textAlign:
                'center',
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
                borderRadius:
                  '20px',
                background:
                  'linear-gradient(135deg, #dff5a8, #b8e36b)',
                display: 'grid',
                placeItems:
                  'center',
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
              Cargando conexión
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
              los detalles de tu
              conexión.
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

  if (
    error ||
    !connection
  ) {
    return (
      <main
        style={pageStyle}
      >
        <div
          style={{
            ...maxWidthStyle,
            minHeight:
              'calc(100vh - 88px)',
            display: 'flex',
            alignItems:
              'center',
            justifyContent:
              'center',
          }}
        >
          <div
            style={{
              width:
                'min(100%, 540px)',
              padding:
                '46px 32px',
              borderRadius:
                '28px',
              background:
                'rgba(255,255,255,0.92)',
              border:
                '1px solid rgba(18,59,74,0.08)',
              boxShadow:
                '0 24px 70px rgba(18,59,74,0.10)',
              textAlign:
                'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                margin:
                  '0 auto 18px',
                borderRadius:
                  '22px',
                background:
                  '#eff7df',
                display: 'grid',
                placeItems:
                  'center',
                fontSize: '29px',
              }}
            >
              ✦
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
              CONEXIÓN
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
              esta conexión
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
              {error ||
                'La conexión no fue encontrada.'}
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'center',
                gap: '10px',
                flexWrap:
                  'wrap',
              }}
            >
              <button
                type="button"
                onClick={() =>
                  router.push(
                    '/conexiones',
                  )
                }
                style={{
                  border:
                    '1px solid rgba(18,59,74,0.12)',
                  borderRadius:
                    '13px',
                  padding:
                    '13px 23px',
                  background:
                    '#ffffff',
                  color:
                    '#123b4a',
                  fontWeight: 900,
                  cursor:
                    'pointer',
                }}
              >
                Mis conexiones
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    '/mis-mascotas',
                  )
                }
                style={{
                  border: 0,
                  borderRadius:
                    '13px',
                  padding:
                    '13px 23px',
                  background:
                    '#b8e36b',
                  color:
                    '#123b4a',
                  fontWeight: 900,
                  cursor:
                    'pointer',
                }}
              >
                Mis mascotas
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const currentPet =
    connection.currentPet;

  const otherPet =
    connection.otherPet;

  const currentAge =
    calculateAge(
      currentPet.birthDate,
    );

  const otherAge =
    calculateAge(
      otherPet.birthDate,
    );

  const compatibility =
    connection.compatibility;

  return (
    <main
      style={pageStyle}
    >
      <div
        style={maxWidthStyle}
      >
        <header
          style={{
            minHeight: '66px',
            display: 'flex',
            alignItems:
              'center',
            justifyContent:
              'space-between',
            gap: '18px',
            marginBottom:
              '30px',
          }}
        >
          <button
            type="button"
            onClick={() =>
              router.push(
                '/conexiones',
              )
            }
            style={{
              display: 'flex',
              alignItems:
                'center',
              gap: '10px',
              border: 0,
              background:
                'transparent',
              color: '#123b4a',
              fontWeight: 900,
              fontSize: '15px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ← Volver a conexiones
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
              borderRadius:
                '12px',
              background:
                'rgba(255,255,255,0.72)',
              padding:
                '10px 14px',
              color: '#123b4a',
              fontWeight: 800,
              cursor:
                'pointer',
            }}
          >
            Mis mascotas
          </button>
        </header>

        <section
          style={{
            marginBottom:
              '24px',
          }}
        >
          <div
            style={{
              display:
                'inline-flex',
              alignItems:
                'center',
              gap: '8px',
              padding:
                '7px 11px',
              borderRadius:
                '999px',
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

            NUEVA CONEXIÓN
          </div>

          <h1
            style={{
              margin:
                '15px 0 10px',
              color: '#123b4a',
              fontSize:
                'clamp(36px, 5vw, 58px)',
              lineHeight: 1,
              letterSpacing:
                '-0.055em',
              fontWeight: 800,
            }}
          >
            Tú y {otherPet.name}
          </h1>

          <p
            style={{
              maxWidth:
                '650px',
              margin: 0,
              color: '#71807d',
              fontSize: '16px',
              lineHeight: 1.7,
            }}
          >
            Han mostrado interés
            mutuamente. Aquí puedes
            revisar los detalles de
            esta conexión.
          </p>
        </section>

        <section
          style={{
            padding:
              '28px',
            borderRadius:
              '30px',
            background:
              'rgba(255,255,255,0.9)',
            border:
              '1px solid rgba(18,59,74,0.08)',
            boxShadow:
              '0 25px 75px rgba(18,59,74,0.08)',
            marginBottom:
              '20px',
          }}
        >
          <div
            style={{
              display:
                'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '18px',
              alignItems:
                'stretch',
            }}
          >
            <article
              style={{
                padding:
                  '22px',
                borderRadius:
                  '23px',
                background:
                  '#f8faf6',
                border:
                  '1px solid rgba(18,59,74,0.055)',
              }}
            >
              <p
                style={{
                  margin:
                    '0 0 15px',
                  color: '#7b8783',
                  fontSize: '10px',
                  fontWeight: 900,
                  letterSpacing:
                    '0.12em',
                }}
              >
                TU MASCOTA
              </p>

              <div
                style={{
                  display:
                    'flex',
                  alignItems:
                    'center',
                  gap: '14px',
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
                    fontWeight: 900,
                    overflow: 'hidden',
                  }}
                >
                  {getPhotoUrl(
                    currentPet,
                  ) ? (
                    <img
                      src={getPhotoUrl(
                        currentPet,
                      ) as string}
                      alt={`Fotografía de ${currentPet.name}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    getInitials(
                      currentPet.name,
                    )
                  )}
                </div>

                <div>
                  <h2
                    style={{
                      margin: 0,
                      color:
                        '#123b4a',
                      fontSize:
                        '23px',
                      letterSpacing:
                        '-0.035em',
                    }}
                  >
                    {currentPet.name}
                  </h2>

                  <p
                    style={{
                      margin:
                        '5px 0 0',
                      color:
                        '#71807d',
                      fontSize:
                        '12px',
                    }}
                  >
                    {currentPet.breed ||
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
                  marginTop:
                    '18px',
                }}
              >
                {currentAge !==
                  null && (
                  <span
                    style={{
                      padding:
                        '7px 10px',
                      borderRadius:
                        '999px',
                      background:
                        '#ffffff',
                      color:
                        '#536562',
                      fontSize:
                        '11px',
                      fontWeight:
                        800,
                    }}
                  >
                    {currentAge}{' '}
                    {currentAge ===
                    1
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
                      '#ffffff',
                    color:
                      '#536562',
                    fontSize:
                      '11px',
                    fontWeight:
                      800,
                  }}
                >
                  {formatSize(
                    currentPet.size,
                  )}
                </span>
              </div>
            </article>

            <div
              style={{
                display:
                  'grid',
                placeItems:
                  'center',
                padding:
                  '10px',
              }}
            >
              <div
                style={{
                  width:
                    '112px',
                  height:
                    '112px',
                  borderRadius:
                    '50%',
                  background:
                    'linear-gradient(135deg, #dff5a8, #b8e36b)',
                  display:
                    'grid',
                  placeItems:
                    'center',
                  boxShadow:
                    '0 15px 35px rgba(18,59,74,0.10)',
                }}
              >
                <div
                  style={{
                    width:
                      '94px',
                    height:
                      '94px',
                    borderRadius:
                      '50%',
                    background:
                      '#ffffff',
                    display:
                      'grid',
                    placeItems:
                      'center',
                    textAlign:
                      'center',
                  }}
                >
                  <div>
                    <strong
                      style={{
                        display:
                          'block',
                        color:
                          '#123b4a',
                        fontSize:
                          '27px',
                        lineHeight:
                          1,
                      }}
                    >
                      {compatibility !==
                      null
                        ? `${Math.round(
                            compatibility,
                          )}%`
                        : '—'}
                    </strong>

                    <span
                      style={{
                        display:
                          'block',
                        marginTop:
                          '5px',
                        color:
                          '#71807d',
                        fontSize:
                          '9px',
                        fontWeight:
                          900,
                        letterSpacing:
                          '0.08em',
                      }}
                    >
                      COMPATIBLES
                    </span>
                  </div>
                </div>
              </div>

              <p
                style={{
                  margin:
                    '12px 0 0',
                  color:
                    '#31515a',
                  fontSize:
                    '11px',
                  fontWeight:
                    900,
                  textAlign:
                    'center',
                }}
              >
                {getCompatibilityLabel(
                  compatibility,
                )}
              </p>
            </div>

            <article
              style={{
                padding:
                  '22px',
                borderRadius:
                  '23px',
                background:
                  '#f8faf6',
                border:
                  '1px solid rgba(18,59,74,0.055)',
              }}
            >
              <p
                style={{
                  margin:
                    '0 0 15px',
                  color:
                    '#7b8783',
                  fontSize:
                    '10px',
                  fontWeight:
                    900,
                  letterSpacing:
                    '0.12em',
                }}
              >
                NUEVA CONEXIÓN
              </p>

              <div
                style={{
                  display:
                    'flex',
                  alignItems:
                    'center',
                  gap: '14px',
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
                    fontWeight: 900,
                    overflow: 'hidden',
                  }}
                >
                  {getPhotoUrl(
                    otherPet,
                  ) ? (
                    <img
                      src={getPhotoUrl(
                        otherPet,
                      ) as string}
                      alt={`Fotografía de ${otherPet.name}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    getInitials(
                      otherPet.name,
                    )
                  )}
                </div>

                <div>
                  <h2
                    style={{
                      margin: 0,
                      color:
                        '#123b4a',
                      fontSize:
                        '23px',
                      letterSpacing:
                        '-0.035em',
                    }}
                  >
                    {otherPet.name}
                  </h2>

                  <p
                    style={{
                      margin:
                        '5px 0 0',
                      color:
                        '#71807d',
                      fontSize:
                        '12px',
                    }}
                  >
                    {otherPet.breed ||
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
                  marginTop:
                    '18px',
                }}
              >
                {otherAge !==
                  null && (
                  <span
                    style={{
                      padding:
                        '7px 10px',
                      borderRadius:
                        '999px',
                      background:
                        '#ffffff',
                      color:
                        '#536562',
                      fontSize:
                        '11px',
                      fontWeight:
                        800,
                    }}
                  >
                    {otherAge}{' '}
                    {otherAge ===
                    1
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
                      '#ffffff',
                    color:
                      '#536562',
                    fontSize:
                      '11px',
                    fontWeight:
                      800,
                  }}
                >
                  {formatSize(
                    otherPet.size,
                  )}
                </span>
              </div>
            </article>
          </div>
        </section>

        <section
          style={{
            display:
              'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '18px',
          }}
        >
          <article
            style={{
              padding:
                '24px',
              borderRadius:
                '25px',
              background:
                'rgba(255,255,255,0.9)',
              border:
                '1px solid rgba(18,59,74,0.08)',
              boxShadow:
                '0 20px 55px rgba(18,59,74,0.07)',
            }}
          >
            <p
              style={{
                margin: '0 0 14px',
                color: '#31515a',
                fontSize: '10px',
                fontWeight: 900,
                letterSpacing:
                  '0.14em',
              }}
            >
              SOBRE LA CONEXIÓN
            </p>

            <h2
              style={{
                margin:
                  '0 0 10px',
                color: '#123b4a',
                fontSize: '24px',
                letterSpacing:
                  '-0.035em',
              }}
            >
              Una conexión mutua
            </h2>

            <p
              style={{
                margin: 0,
                color: '#71807d',
                lineHeight: 1.7,
                fontSize: '14px',
              }}
            >
              {currentPet.name} y{' '}
              {otherPet.name}{' '}
              mostraron interés
              mutuamente y la
              conexión fue registrada
              por NUMAO.
            </p>

            <div
              style={{
                marginTop:
                  '20px',
                paddingTop:
                  '17px',
                borderTop:
                  '1px solid rgba(18,59,74,0.07)',
              }}
            >
              <span
                style={{
                  display:
                    'block',
                  color:
                    '#9aa5a2',
                  fontSize:
                    '10px',
                }}
              >
                Conectados desde
              </span>

              <strong
                style={{
                  display:
                    'block',
                  marginTop:
                    '4px',
                  color:
                    '#536562',
                  fontSize:
                    '13px',
                }}
              >
                {formatDate(
                  connection.createdAt,
                )}
              </strong>
            </div>
          </article>

          <article
            style={{
              padding:
                '24px',
              borderRadius:
                '25px',
              background:
                'rgba(255,255,255,0.9)',
              border:
                '1px solid rgba(18,59,74,0.08)',
              boxShadow:
                '0 20px 55px rgba(18,59,74,0.07)',
            }}
          >
            <p
              style={{
                margin:
                  '0 0 14px',
                color:
                  '#31515a',
                fontSize:
                  '10px',
                fontWeight:
                  900,
                letterSpacing:
                  '0.14em',
              }}
            >
              PERFIL
            </p>

            <h2
              style={{
                margin:
                  '0 0 10px',
                color:
                  '#123b4a',
                fontSize:
                  '24px',
                letterSpacing:
                  '-0.035em',
              }}
            >
              Conoce mejor a{' '}
              {otherPet.name}
            </h2>

            {otherPet.bio ? (
              <p
                style={{
                  margin:
                    '0 0 18px',
                  color:
                    '#71807d',
                  lineHeight:
                    1.7,
                  fontSize:
                    '14px',
                }}
              >
                {otherPet.bio}
              </p>
            ) : (
              <p
                style={{
                  margin:
                    '0 0 18px',
                  color:
                    '#9aa5a2',
                  lineHeight:
                    1.7,
                  fontSize:
                    '14px',
                }}
              >
                Esta mascota aún
                no tiene una
                descripción.
              </p>
            )}

            <div
              style={{
                display:
                  'grid',
                gridTemplateColumns:
                  'repeat(3, 1fr)',
                gap: '8px',
                marginBottom:
                  '18px',
              }}
            >
              <div
                style={{
                  padding:
                    '12px 8px',
                  borderRadius:
                    '14px',
                  background:
                    '#f5f8f3',
                  textAlign:
                    'center',
                }}
              >
                <span
                  style={{
                    display:
                      'block',
                    color:
                      '#7d8985',
                    fontSize:
                      '10px',
                  }}
                >
                  Energía
                </span>

                <strong
                  style={{
                    display:
                      'block',
                    marginTop:
                      '5px',
                    color:
                      '#123b4a',
                    fontSize:
                      '11px',
                    letterSpacing:
                      '1px',
                  }}
                >
                  <span style={{ display: 'block' }}>
                      {renderTraitBar(otherPet.energyLevel)}
                      <span style={{ display: 'block', marginTop: '4px', color: '#536562', fontSize: '10px', letterSpacing: 0 }}>
                        {getTraitLabel(otherPet.energyLevel, ['Muy baja', 'Baja', 'Media', 'Alta', 'Muy alta'])}
                        {getTraitLevel(otherPet.energyLevel) > 0 ? ` · ${getTraitLevel(otherPet.energyLevel)}/5` : ''}
                      </span>
                    </span>
                </strong>
              </div>

              <div
                style={{
                  padding:
                    '12px 8px',
                  borderRadius:
                    '14px',
                  background:
                    '#f5f8f3',
                  textAlign:
                    'center',
                }}
              >
                <span
                  style={{
                    display:
                      'block',
                    color:
                      '#7d8985',
                    fontSize:
                      '10px',
                  }}
                >
                  Sociabilidad
                </span>

                <strong
                  style={{
                    display:
                      'block',
                    marginTop:
                      '5px',
                    color:
                      '#123b4a',
                    fontSize:
                      '11px',
                    letterSpacing:
                      '1px',
                  }}
                >
                  <span style={{ display: 'block' }}>
                      {renderTraitBar(otherPet.sociability)}
                      <span style={{ display: 'block', marginTop: '4px', color: '#536562', fontSize: '10px', letterSpacing: 0 }}>
                        {getTraitLabel(otherPet.sociability, ['Muy baja', 'Baja', 'Media', 'Alta', 'Muy alta'])}
                        {getTraitLevel(otherPet.sociability) > 0 ? ` · ${getTraitLevel(otherPet.sociability)}/5` : ''}
                      </span>
                    </span>
                </strong>
              </div>

              <div
                style={{
                  padding:
                    '12px 8px',
                  borderRadius:
                    '14px',
                  background:
                    '#f5f8f3',
                  textAlign:
                    'center',
                }}
              >
                <span
                  style={{
                    display:
                      'block',
                    color:
                      '#7d8985',
                    fontSize:
                      '10px',
                  }}
                >
                  Juego
                </span>

                <strong
                  style={{
                    display:
                      'block',
                    marginTop:
                      '5px',
                    color:
                      '#123b4a',
                    fontSize:
                      '11px',
                    letterSpacing:
                      '1px',
                  }}
                >
                  <span style={{ display: 'block' }}>
                      {renderTraitBar(otherPet.playfulness)}
                      <span style={{ display: 'block', marginTop: '4px', color: '#536562', fontSize: '10px', letterSpacing: 0 }}>
                        {getTraitLabel(otherPet.playfulness, ['Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto'])}
                        {getTraitLevel(otherPet.playfulness) > 0 ? ` · ${getTraitLevel(otherPet.playfulness)}/5` : ''}
                      </span>
                    </span>
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  `/conexiones/${connection.id}/mensajes`,
                )
              }
              style={{
                width: '100%',
                border: 0,
                borderRadius: '13px',
                padding: '13px 18px',
                background: '#123b4a',
                color: '#ffffff',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 10px 24px rgba(18,59,74,0.12)',
                marginBottom: '10px',
              }}
            >
              Comenzar conversación
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  `/mascotas/${otherPet.id}`,
                )
              }
              style={{
                width: '100%',
                border: 0,
                borderRadius:
                  '13px',
                padding:
                  '13px 18px',
                background:
                  '#b8e36b',
                color:
                  '#123b4a',
                fontWeight:
                  900,
                cursor:
                  'pointer',
                boxShadow:
                  '0 10px 24px rgba(18,59,74,0.10)',
              }}
            >
              Ver perfil completo de{' '}
              {otherPet.name}
            </button>
          </article>
        </section>
      </div>
    </main>
  );
}
