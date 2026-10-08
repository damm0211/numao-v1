'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  API_URL,
  FILES_URL,
} from '../../lib/config';
type InterestType =
  | 'PLAY'
  | 'WALK'
  | 'SOCIALIZE'
  | 'REPRODUCTION';

interface PetPhoto {
  id: string;
  storageKey: string;
  sortOrder: number;
  url?: string;
}

interface Pet {
  id: string;
  name: string;
  birthDate: string;
  commune: string;
  breed: string | null;
  size: string | null;
  energyLevel: number | null;
  sociability: number | null;
  playfulness: number | null;
  bio: string | null;
  status: string;
  preferences: InterestType[];
  commonPreferences: InterestType[];
  photos?: PetPhoto[];
}

interface OwnPet {
  id: string;
  name: string;
  photos?: PetPhoto[];
}
function getPhotoUrl(
  photo: PetPhoto,
) {
  if (photo.url) {
    return photo.url;
  }

  if (
    photo.storageKey.startsWith('http://') ||
    photo.storageKey.startsWith('https://')
  ) {
    return photo.storageKey;
  }

  const normalizedKey =
    photo.storageKey.startsWith('/')
      ? photo.storageKey.slice(1)
      : photo.storageKey;

  return `${FILES_URL}/uploads/${normalizedKey}`;
}
const interestLabels: Record<InterestType, string> = {
  PLAY: 'Jugar',
  WALK: 'Pasear',
  SOCIALIZE: 'Socializar',
  REPRODUCTION: 'Reproducción',
};

const interestIcons: Record<InterestType, string> = {
  PLAY: '🎮',
  WALK: '🚶',
  SOCIALIZE: '🤝',
  REPRODUCTION: '❤️',
};

const interestDescriptions: Record<InterestType, string> = {
  PLAY: 'Compartir juegos y energía',
  WALK: 'Salir y pasear juntos',
  SOCIALIZE: 'Conocer y socializar',
  REPRODUCTION: 'Buscar una conexión reproductiva',
};

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
  if (size === 'SMALL') return 'Pequeña';
  if (size === 'MEDIUM') return 'Mediana';
  if (size === 'LARGE') return 'Grande';

  return 'Tamaño no especificado';
}

function formatTrait(
  value: number | null,
  labels: string[],
) {
  if (
    value === null ||
    value === undefined
  ) {
    return '—';
  }

  const level = Math.min(
    5,
    Math.max(1, Math.round(value)),
  );

  return labels[level - 1];
}

function getTraitLevel(value: number | null) {
  if (
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  return Math.min(
    5,
    Math.max(0, Math.round(value)),
  );
}

export default function DiscoverPage() {
  const router = useRouter();

  const [pets, setPets] =
    useState<Pet[]>([]);

  const [ownPets, setOwnPets] =
    useState<OwnPet[]>([]);

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [sendingInterest, setSendingInterest] =
    useState(false);

  const [interestSent, setInterestSent] =
    useState(false);

  const [selectedInterest, setSelectedInterest] =
    useState<InterestType | null>(null);

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');
const [matchOpen, setMatchOpen] =
  useState(false);

const [matchedConnectionId, setMatchedConnectionId] =
  useState<string | null>(null);

const [matchedCompatibility, setMatchedCompatibility] =
  useState<number | null>(null);

  const [photoErrorPetId, setPhotoErrorPetId] =
    useState<string | null>(null);

  const searchParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : null;

  const sourcePetId =
    searchParams?.get('petId') ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('numao_active_pet_id')
      : null);

  const targetPetId =
    searchParams?.get('targetPetId');

  const sourcePet =
    sourcePetId
      ? ownPets.find((pet) => pet.id === sourcePetId) ?? null
      : ownPets[0] ?? null;

  const currentPet =
    pets[currentIndex] ?? null;

  const commonPreferences =
    useMemo(() => {
      if (!currentPet) {
        return [];
      }

      return currentPet.commonPreferences ?? [];
    }, [currentPet]);

  useEffect(() => {
    setInterestSent(false);
    setMessage('');
    setError('');

    if (commonPreferences.length === 1) {
      setSelectedInterest(
        commonPreferences[0],
      );
    } else {
      setSelectedInterest(null);
    }
  }, [
    currentIndex,
    commonPreferences,
  ]);

  useEffect(() => {
    async function loadData() {
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

        const [
          discoverResponse,
          petsResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/pets/discover?${new URLSearchParams({
              ...(sourcePetId ? { sourcePetId } : {}),
              ...(targetPetId ? { targetPetId } : {}),
            }).toString()}`,
            {
              method: 'GET',
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          ),

          fetch(`${API_URL}/pets`, {
            method: 'GET',
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }),
        ]);

        if (
          discoverResponse.status === 401 ||
          petsResponse.status === 401
        ) {
          localStorage.removeItem(
            'numao_access_token',
          );

          router.push('/login');
          return;
        }

        if (!discoverResponse.ok) {
          const data =
            await discoverResponse
              .json()
              .catch(() => null);

          throw new Error(
            data?.message ||
              'No pudimos cargar los perfiles.',
          );
        }

        if (!petsResponse.ok) {
          const data =
            await petsResponse
              .json()
              .catch(() => null);

          throw new Error(
            data?.message ||
              'No pudimos cargar tus mascotas.',
          );
        }

        const discoverData =
          await discoverResponse.json();

        const ownPetsData =
          await petsResponse.json();

        setPets(
          Array.isArray(discoverData)
            ? discoverData
            : [],
        );

        setOwnPets(
          Array.isArray(ownPetsData)
            ? ownPetsData
                .filter(
                  (pet: any) =>
                    pet.status ===
                    'ACTIVE',
                )
                .map(
                  (pet: any) => ({
                    id: pet.id,
                    name: pet.name,
                    photos: Array.isArray(pet.photos)
                      ? pet.photos
                      : [],
                  }),
                )
            : [],
        );

        setCurrentIndex(0);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : 'No pudimos cargar los perfiles.',
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  function handleSkip() {
    if (sendingInterest) {
      return;
    }

    setInterestSent(false);
    setSelectedInterest(null);
    setMessage('');
    setError('');

    if (
      currentIndex <
      pets.length - 1
    ) {
      setCurrentIndex(
        (current) => current + 1,
      );
    } else {
      setCurrentIndex(
        pets.length,
      );
    }
  }

  async function handleInterest() {
    if (
      !sourcePet ||
      !currentPet ||
      !selectedInterest ||
      sendingInterest ||
      interestSent
    ) {
      return;
    }

    try {
      setSendingInterest(true);
      setError('');
      setMessage('');

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
          `${API_URL}/pets/${sourcePet.id}/interests`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              toPetId:
                currentPet.id,

              type:
                selectedInterest,
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

        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'No pudimos enviar el interés.',
        );
      }

setInterestSent(true);

if (data?.status === 'MATCHED') {
  setMatchedConnectionId(
    data?.connection?.id ?? null,
  );

  setMatchedCompatibility(
    typeof data?.connection?.compatibility === 'number'
      ? data.connection.compatibility
      : null,
  );

  setMatchOpen(true);

  setMessage('');
} else {
  setMessage(
    `interés enviado: ${interestLabels[selectedInterest]}.`,
  );

  window.setTimeout(() => {
    setMessage('');
    setInterestSent(false);
    setSelectedInterest(null);

    setCurrentIndex((current) => {
      if (current < pets.length - 1) {
        return current + 1;
      }

      return pets.length;
    });
  }, 1200);
}
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'No pudimos enviar el interés.',
      );
    } finally {
      setSendingInterest(false);
    }
  }

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at 10% 0%, rgba(184, 227, 107, 0.16), transparent 28%), radial-gradient(circle at 90% 12%, rgba(18, 59, 74, 0.06), transparent 30%), #f7f8f5',
    color: '#243532',
    padding:
      '28px 20px 60px',
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
              width: 'min(100%, 520px)',
              padding: '48px 32px',
              borderRadius: '28px',
              background:
                'rgba(255,255,255,0.88)',
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
                  '0 auto 22px',
                borderRadius: '20px',
                background:
                  'linear-gradient(135deg, #dff5a8, #b8e36b)',
                display: 'grid',
                placeItems: 'center',
                fontSize: '28px',
              }}
            >
              🎮
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
                fontSize: '28px',
                letterSpacing:
                  '-0.035em',
                color: '#123b4a',
              }}
            >
              Descubriendo conexiones
            </h1>

            <p
              style={{
                margin: 0,
                color: '#74817f',
                fontSize: '14px',
                lineHeight: 1.6,
              }}
            >
              Estamos buscando
              perfiles compatibles
              contigo.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (
    error &&
    pets.length === 0
  ) {
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
              padding: '44px 32px',
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
                fontSize: '42px',
                marginBottom: '14px',
              }}
            >
              ✨
            </div>

            <h2
              style={{
                margin:
                  '0 0 10px',
                color: '#123b4a',
                fontSize: '25px',
              }}
            >
              No pudimos cargar
              los perfiles
            </h2>

            <p
              style={{
                margin:
                  '0 auto 24px',
                maxWidth: '410px',
                color: '#71807d',
                lineHeight: 1.6,
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
                  '13px 22px',
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

  if (!sourcePet) {
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
              width: 'min(100%, 560px)',
              padding: '46px 32px',
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
                width: '70px',
                height: '70px',
                margin:
                  '0 auto 20px',
                borderRadius: '24px',
                background:
                  '#eff7df',
                display: 'grid',
                placeItems: 'center',
                fontSize: '34px',
              }}
            >
              🚶
            </div>

            <p
              style={{
                margin: 0,
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing:
                  '0.16em',
                color: '#31515a',
              }}
            >
              EMPECEMOS
            </p>

            <h2
              style={{
                margin:
                  '9px 0 10px',
                color: '#123b4a',
                fontSize: '28px',
                letterSpacing:
                  '-0.035em',
              }}
            >
              Necesitas una
              mascota activa
            </h2>

            <p
              style={{
                margin:
                  '0 auto 25px',
                maxWidth: '420px',
                color: '#71807d',
                lineHeight: 1.65,
              }}
            >
              Crea o activa una
              mascota para comenzar
              a descubrir perfiles
              compatibles.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  '/mis-mascotas',
                )
              }
              style={{
                border: 0,
                borderRadius: '13px',
                padding:
                  '14px 24px',
                background:
                  '#b8e36b',
                color: '#123b4a',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              Ir a mis mascotas
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!currentPet) {
    return (
      <main style={pageStyle}>
        <div
          style={maxWidthStyle}
        >
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                'space-between',
              gap: '20px',
              marginBottom: '30px',
            }}
          >
            <button
              type="button"
              onClick={() =>
                router.push('/mi-cuenta')
              }
              style={{
                border: 0,
                background:
                  'transparent',
                color: '#123b4a',
                fontWeight: 900,
                fontSize: '16px',
                letterSpacing:
                  '0.12em',
                cursor: 'pointer',
              }}
            >
              NUMAO
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
                  'rgba(255,255,255,0.7)',
                padding:
                  '10px 15px',
                color: '#123b4a',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Mis mascotas
            </button>
          </header>

          <div
            style={{
              minHeight:
                'calc(100vh - 170px)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <div
              style={{
                width: 'min(100%, 600px)',
                padding: '52px 34px',
                borderRadius: '30px',
                background:
                  'rgba(255,255,255,0.9)',
                border:
                  '1px solid rgba(18,59,74,0.08)',
                boxShadow:
                  '0 25px 75px rgba(18,59,74,0.10)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '50px',
                  marginBottom: '12px',
                }}
              >
                ✨
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
                TODO DESCUBIERTO
              </p>

              <h1
                style={{
                  margin:
                    '10px 0 12px',
                  color: '#123b4a',
                  fontSize: '30px',
                  letterSpacing:
                    '-0.04em',
                }}
              >
                No hay más perfiles
                por ahora
              </h1>

              <p
                style={{
                  margin:
                    '0 auto 26px',
                  maxWidth: '450px',
                  color: '#71807d',
                  lineHeight: 1.65,
                }}
              >
                No encontramos más
                mascotas disponibles
                para conectar con{' '}
                <strong>
                  {sourcePet.name}
                </strong>
                .
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    '/mis-mascotas',
                  )
                }
                style={{
                  border: 0,
                  borderRadius: '13px',
                  padding:
                    '14px 23px',
                  background:
                    '#b8e36b',
                  color: '#123b4a',
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                Volver a mis mascotas
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const age =
    calculateAge(
      currentPet.birthDate,
    );

  const primaryPhoto =
    currentPet.photos &&
    currentPet.photos.length > 0
      ? [...currentPet.photos].sort(
          (a, b) =>
            a.sortOrder - b.sortOrder,
        )[0]
      : null;

  const showPrimaryPhoto =
    Boolean(primaryPhoto) &&
    photoErrorPetId !== currentPet.id;

  const compatibilityBase =
    commonPreferences.length *
    25;

  const personalityValues = [
    currentPet.energyLevel,
    currentPet.sociability,
    currentPet.playfulness,
  ].filter(
    (value): value is number =>
      value !== null &&
      value !== undefined,
  );

  const personalityAverage =
    personalityValues.length > 0
      ? Math.round(
          personalityValues.reduce(
            (sum, value) =>
              sum + value,
            0,
          ) /
            personalityValues.length,
        )
      : null;

  const compatibility =
    commonPreferences.length > 0
      ? Math.min(
          98,
          Math.max(
            64,
            58 +
              compatibilityBase +
              (personalityAverage
                ? Math.round(
                    personalityAverage /
                      15,
                  )
                : 0),
          ),
        )
      : null;

  return (
    <main style={pageStyle}>
    {matchOpen && currentPet && sourcePet && (
      <div
        className="numaoMatchOverlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="numao-match-title"
      >
        <div className="numaoMatchGlow numaoMatchGlowOne" />
        <div className="numaoMatchGlow numaoMatchGlowTwo" />

        <div className="numaoMatchDecor numaoMatchDecorOne" />
        <div className="numaoMatchDecor numaoMatchDecorTwo" />
        <div className="numaoMatchDecor numaoMatchDecorThree" />

        <section className="numaoMatchCard">

          <div className="numaoMatchEyebrow">
            CONEXIÓN ENCONTRADA
          </div>

          <h1 id="numao-match-title">
            ¡Es un match!
          </h1>

          <p className="numaoMatchSubtitle">
            Tú y {currentPet.name} tienen una gran
            <br />
            compatibilidad.
          </p>

          <div className="numaoMatchPets">

            <div className="numaoMatchPet">
              <div className="numaoMatchPhoto">
                {sourcePet.photos?.length ? (
                  <img
                    src={getPhotoUrl(
                      [...sourcePet.photos].sort(
                        (a, b) =>
                          a.sortOrder - b.sortOrder,
                     )[0],
                )}
                    alt={sourcePet.name}
                  />
                ) : (
                  <div className="numaoMatchInitial">
                    {sourcePet.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </div>

              <strong>
                {sourcePet.name}
              </strong>
            </div>

            <div className="numaoMatchHeart">
              ♥️
            </div>

            <div className="numaoMatchPet">
              <div className="numaoMatchPhoto">

                {currentPet.photos?.[0]?.storageKey ? (
                  <img
                    src={getPhotoUrl(currentPet.photos[0])}
                    alt={currentPet.name}
                  />
                ) : (
                  <div className="numaoMatchInitial">
                    {currentPet.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

              </div>

              <strong>
                {currentPet.name}
              </strong>
            </div>

          </div>

          <div className="numaoMatchCompatibility">

            <strong>
              {matchedCompatibility ?? '—'}
              {matchedCompatibility !== null && '%'}
            </strong>

            <span>
              {matchedCompatibility !== null
                ? matchedCompatibility >= 90
                  ? 'Muy alta compatibilidad'
                  : matchedCompatibility >= 80
                    ? 'Alta compatibilidad'
                    : matchedCompatibility >= 70
                      ? 'Buena compatibilidad'
                      : 'Compatibilidad'
                : 'Compatibilidad'}
            </span>

          </div>

          <div className="numaoMatchReasons">

            {commonPreferences
              .slice(0, 4)
              .map((interest) => (
                <div
                  className="numaoMatchReason"
                  key={interest}
                >
                  <span>✓</span>

                  <div>
                    <strong>
                      {interestLabels[interest]}
                    </strong>

                    <small>
                      {interestDescriptions[interest]}
                    </small>
                  </div>
                </div>
              ))}

            {currentPet.energyLevel !== null && (
              <div className="numaoMatchReason">
                <span>✓</span>

                <div>
                  <strong>
                    Energía compatible
                  </strong>

                  <small>
                    Niveles de actividad similares
                  </small>
                </div>
              </div>
            )}

          </div>

          <div className="numaoMatchActions">

            <button
              type="button"
              className="numaoMatchPrimary"
              onClick={() => {
                if (matchedConnectionId) {
                  router.push(
                    `/conexiones/${matchedConnectionId}/mensajes`,
                  );
                } else {
                  router.push('/conexiones');
                }
              }}
            >
              Enviar mensaje
            </button>

            <button
              type="button"
              className="numaoMatchSecondary"
              onClick={() => {
                setMatchOpen(false);

                router.push(
                  `/mascotas/${currentPet.id}`,
                );
              }}
            >
              Ver perfil
            </button>

            <button
              type="button"
              className="numaoMatchContinue"
              onClick={() => {
                setMatchOpen(false);
                setInterestSent(false);
                setSelectedInterest(null);
                setMatchedConnectionId(null);
                setMatchedCompatibility(null);

                setCurrentIndex((current) => {
                  if (current < pets.length - 1) {
                    return current + 1;
                  }

                  return pets.length;
                });
              }}
            >
              Seguir descubriendo
            </button>

          </div>

        </section>
      </div>
    )}
      <div
        style={maxWidthStyle}
      >
        <header
          style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'space-between',
            marginBottom: '22px',
          }}
        >
          <button
            type="button"
            onClick={() =>
              router.push('/mi-cuenta')
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
                width: '25px',
                height: '25px',
                borderRadius:
                  '9px',
                background:
                  'linear-gradient(135deg, #123b4a 0%, #31515a 100%)',
                display: 'inline-block',
                position:
                  'relative',
              }}
            >
              <span
                style={{
                  position:
                    'absolute',
                  width: '8px',
                  height: '8px',
                  borderRadius:
                    '50%',
                  background:
                    '#b8e36b',
                  left: '5px',
                  top: '5px',
                }}
              />

              <span
                style={{
                  position:
                    'absolute',
                  width: '8px',
                  height: '8px',
                  borderRadius:
                    '50%',
                  background:
                    '#b8e36b',
                  right: '5px',
                  bottom: '5px',
                }}
              />
            </span>

            NUMAO
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
                '10px 15px',
              color: '#123b4a',
              fontSize: '12px',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow:
                '0 6px 18px rgba(18,59,74,0.04)',
            }}
          >
            Mis mascotas
          </button>
        </header>

        <section
          style={{
            marginBottom: '22px',
            display: 'flex',
            alignItems:
              'flex-end',
            justifyContent:
              'space-between',
            gap: '20px',
          }}
        >
          <div>
            <p
              style={{
                margin:
                  '0 0 8px',
                color: '#31515a',
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing:
                  '0.18em',
              }}
            >
              DESCUBRIR
            </p>

            <h1
              style={{
                margin: 0,
                color: '#123b4a',
                fontSize:
                  'clamp(32px, 5vw, 46px)',
                lineHeight: 1,
                letterSpacing:
                  '-0.055em',
                fontWeight: 850,
              }}
            >
              Nuevas conexiones.
            </h1>

            <p
              style={{
                margin:
                  '12px 0 0',
                color: '#71807d',
                fontSize: '14px',
                lineHeight: 1.6,
              }}
            >
              Descubre mascotas
              compatibles con{' '}
              <strong
                style={{
                  color: '#31515a',
                }}
              >
                {sourcePet.name}
              </strong>
              .
            </p>
          </div>

          <div
            style={{
              flex:
                '0 0 auto',
              minWidth: '86px',
              padding:
                '10px 13px',
              borderRadius: '15px',
              background:
                'rgba(255,255,255,0.75)',
              border:
                '1px solid rgba(18,59,74,0.08)',
              textAlign: 'center',
              boxShadow:
                '0 8px 24px rgba(18,59,74,0.05)',
            }}
          >
            <span
              style={{
                display: 'block',
                color: '#87918f',
                fontSize: '10px',
                fontWeight: 800,
                marginBottom:
                  '2px',
              }}
            >
              PERFIL
            </span>

            <strong
              style={{
                color: '#123b4a',
                fontSize: '15px',
              }}
            >
              {currentIndex + 1}
              <span
                style={{
                  color: '#a1aaa7',
                  fontWeight: 500,
                }}
              >
                {' '}
                / {pets.length}
              </span>
            </strong>
          </div>
        </section>

        <article
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(290px, 0.82fr) minmax(0, 1fr)',
            overflow: 'hidden',
            borderRadius: '30px',
            background:
              'rgba(255,255,255,0.94)',
            border:
              '1px solid rgba(18,59,74,0.08)',
            boxShadow:
              '0 28px 80px rgba(18,59,74,0.11), 0 5px 18px rgba(18,59,74,0.04)',
            minHeight: '610px',
          }}
        >
          <div
            style={{
              position: 'relative',
              minHeight: '610px',
              background:
                'linear-gradient(145deg, #dce8df 0%, #eef4ed 45%, #d9e7df 100%)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: '360px',
                height: '360px',
                borderRadius:
                  '50%',
                top: '-120px',
                right: '-110px',
                background:
                  'rgba(184,227,107,0.25)',
              }}
            />

            <div
              style={{
                position: 'absolute',
                width: '260px',
                height: '260px',
                borderRadius:
                  '50%',
                bottom: '-110px',
                left: '-110px',
                background:
                  'rgba(18,59,74,0.07)',
              }}
            />

            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                padding: '40px',
              }}
            >
              <div
                style={{
                  width:
                    'min(300px, 72%)',
                  aspectRatio: '1',
                  borderRadius:
                    '38px',
                  background:
                    'rgba(255,255,255,0.56)',
                  border:
                    '1px solid rgba(255,255,255,0.75)',
                  boxShadow:
                    '0 30px 70px rgba(18,59,74,0.12)',
                  display: 'flex',
                  flexDirection:
                    'column',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  backdropFilter:
                    'blur(12px)',
                }}
              >
                {showPrimaryPhoto && primaryPhoto ? (
                  <img
                    src={getPhotoUrl(primaryPhoto)}
                    alt={`Foto de ${currentPet.name}`}
                    onError={() =>
                      setPhotoErrorPetId(currentPet.id)
                    }
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      objectPosition: 'center',
                      display: 'block',
                      borderRadius: '38px',
                    }}
                  />
                ) : (
                  <>
                    <div
                      style={{
                        width: '116px',
                        height: '116px',
                        borderRadius: '50%',
                        background:
                          'linear-gradient(135deg, #dff2ad 0%, #b8e36b 100%)',
                        display: 'grid',
                        placeItems: 'center',
                        color: '#123b4a',
                        fontSize: '38px',
                        fontWeight: 900,
                        letterSpacing: '0.03em',
                        boxShadow:
                          '0 18px 40px rgba(18,59,74,0.12)',
                      }}
                    >
                      {currentPet.name
                        .trim()
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) =>
                          part.charAt(0).toUpperCase(),
                        )
                        .join('') || '?'}
                    </div>

                    <span
                      style={{
                        marginTop:
                          '18px',
                        color: '#31515a',
                        fontSize: '11px',
                        fontWeight: 900,
                        letterSpacing:
                          '0.16em',
                      }}
                    >
                      PERFIL NUMAO
                    </span>
                  </>
                )}
              </div>
            </div>

            <div
              style={{
                position:
                  'absolute',
                top: '22px',
                left: '22px',
                padding:
                  '8px 12px',
                borderRadius:
                  '999px',
                background:
                  'rgba(255,255,255,0.86)',
                border:
                  '1px solid rgba(255,255,255,0.9)',
                color: '#31515a',
                fontSize: '11px',
                fontWeight: 900,
                display: 'flex',
                alignItems:
                  'center',
                gap: '7px',
                boxShadow:
                  '0 8px 20px rgba(18,59,74,0.07)',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius:
                    '50%',
                  background:
                    currentPet.status ===
                    'ACTIVE'
                      ? '#82b83c'
                      : '#a3aaa8',
                  boxShadow:
                    currentPet.status ===
                    'ACTIVE'
                      ? '0 0 0 4px rgba(130,184,60,0.14)'
                      : 'none',
                }}
              />

              {currentPet.status ===
              'ACTIVE'
                ? 'Perfil activo'
                : 'Perfil pausado'}
            </div>

            {compatibility !== null && (
              <div
                style={{
                  position:
                    'absolute',
                  right: '22px',
                  top: '22px',
                  width: '84px',
                  height: '84px',
                  borderRadius:
                    '50%',
                  background:
                    'rgba(255,255,255,0.92)',
                  border:
                    '5px solid rgba(184,227,107,0.72)',
                  boxShadow:
                    '0 12px 30px rgba(18,59,74,0.10)',
                  display: 'flex',
                  flexDirection:
                    'column',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                }}
              >
                <strong
                  style={{
                    color: '#123b4a',
                    fontSize: '20px',
                    lineHeight: 1,
                  }}
                >
                  {compatibility}%
                </strong>

                <span
                  style={{
                    marginTop:
                      '4px',
                    color: '#7a8784',
                    fontSize: '8px',
                    fontWeight: 900,
                    letterSpacing:
                      '0.08em',
                  }}
                >
                  COMPATIBLE
                </span>
              </div>
            )}
          </div>

          <div
            style={{
              padding:
                '38px 38px 32px',
              display: 'flex',
              flexDirection:
                'column',
              minWidth: 0,
            }}
          >
            <div>
              <p
                style={{
                  margin:
                    '0 0 7px',
                  color: '#31515a',
                  fontSize: '10px',
                  fontWeight: 900,
                  letterSpacing:
                    '0.17em',
                }}
              >
                CONOCE A
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems:
                    'flex-start',
                  justifyContent:
                    'space-between',
                  gap: '16px',
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      color: '#123b4a',
                      fontSize:
                        'clamp(30px, 4vw, 42px)',
                      lineHeight: 1,
                      letterSpacing:
                        '-0.055em',
                    }}
                  >
                    {currentPet.name}
                  </h2>

                  <p
                    style={{
                      margin:
                        '9px 0 0',
                      color: '#6f7c79',
                      fontSize: '13px',
                    }}
                  >
                    {currentPet.breed ||
                      'Raza no especificada'}
                  </p>
                  <p style={{ margin: '5px 0 0', color: '#6f7c79', fontSize: '13px' }}>{`\u{1F4CD}`} {currentPet.commune}</p>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginTop:
                    '18px',
                }}
              >
                {[
                  age !== null
                    ? `${age} ${
                        age === 1
                          ? 'año'
                          : 'años'
                      }`
                    : null,
                  currentPet.size
                    ? formatSize(
                        currentPet.size,
                      )
                    : null,
                ]
                  .filter(Boolean)
                  .map((item) => (
                    <span
                      key={item}
                      style={{
                        padding:
                          '7px 11px',
                        borderRadius:
                          '999px',
                        background:
                          '#f1f5f2',
                        border:
                          '1px solid #e1e9e4',
                        color:
                          '#4d6259',
                        fontSize:
                          '11px',
                        fontWeight: 800,
                      }}
                    >
                      {item}
                    </span>
                  ))}
              </div>
            </div>

            {currentPet.bio && (
              <section
                style={{
                  marginTop:
                    '25px',
                  padding:
                    '18px 19px',
                  borderRadius:
                    '17px',
                  background:
                    '#f7f9f7',
                  border:
                    '1px solid #e6ece8',
                }}
              >
                <p
                  style={{
                    margin:
                      '0 0 7px',
                    color: '#31515a',
                    fontSize:
                      '10px',
                    fontWeight:
                      900,
                    letterSpacing:
                      '0.12em',
                  }}
                >
                  SOBRE {currentPet.name.toUpperCase()}
                </p>

                <p
                  style={{
                    margin: 0,
                    color: '#5f6e69',
                    fontSize:
                      '13px',
                    lineHeight:
                      1.65,
                  }}
                >
                  {currentPet.bio}
                </p>
              </section>
            )}

            <section
              style={{
                marginTop:
                  '24px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'space-between',
                  marginBottom:
                    '12px',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: '#31515a',
                    fontSize:
                      '10px',
                    fontWeight:
                      900,
                    letterSpacing:
                      '0.13em',
                  }}
                >
                  PERSONALIDAD
                </p>

                <span
                  style={{
                    color: '#9aa5a2',
                    fontSize:
                      '10px',
                  }}
                >
                  Perfil de comportamiento
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(3, 1fr)',
                  gap: '8px',
                }}
              >
                {[
                  {
                    label: 'Energía',
                    value:
                      currentPet.energyLevel,
                    text: formatTrait(
                      currentPet.energyLevel,
                      [
                        'Muy baja',
                        'Baja',
                        'Media',
                        'Alta',
                        'Muy alta',
                      ],
                    ),
                  },
                  {
                    label:
                      'Sociabilidad',
                    value:
                      currentPet.sociability,
                    text: formatTrait(
                      currentPet.sociability,
                      [
                        'Muy baja',
                        'Baja',
                        'Media',
                        'Alta',
                        'Muy alta',
                      ],
                    ),
                  },
                  {
                    label: 'Juego',
                    value:
                      currentPet.playfulness,
                    text: formatTrait(
                      currentPet.playfulness,
                      [
                        'Muy bajo',
                        'Bajo',
                        'Medio',
                        'Alto',
                        'Muy alto',
                      ],
                    ),
                  },
                ].map((trait) => {
                  const level =
                    getTraitLevel(
                      trait.value,
                    );

                  return (
                    <div
                      key={trait.label}
                      style={{
                        padding:
                          '13px 12px',
                        borderRadius:
                          '15px',
                        background:
                          '#fbfcfb',
                        border:
                          '1px solid #e7ece9',
                      }}
                    >
                      <span
                        style={{
                          display:
                            'block',
                          color:
                            '#74817d',
                          fontSize:
                            '10px',
                          fontWeight:
                            700,
                        }}
                      >
                        {trait.label}
                      </span>

                      <strong
                        style={{
                          display:
                            'block',
                          marginTop:
                            '5px',
                          color:
                            '#31515a',
                          fontSize:
                            '11px',
                        }}
                      >
                        {trait.text}
                      </strong>

                      <div
                        style={{
                          display:
                            'flex',
                          gap: '3px',
                          marginTop:
                            '8px',
                        }}
                      >
                        {Array.from({
                          length: 5,
                        }).map(
                          (
                            _,
                            index,
                          ) => (
                            <span
                              key={
                                index
                              }
                              style={{
                                height:
                                  '4px',
                                flex: 1,
                                borderRadius:
                                  '99px',
                                background:
                                  index <
                                  level
                                    ? '#b8e36b'
                                    : '#e5ebe7',
                              }}
                            />
                          ),
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section
              style={{
                marginTop:
                  '24px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'space-between',
                  marginBottom:
                    '11px',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: '#31515a',
                    fontSize:
                      '10px',
                    fontWeight:
                      900,
                    letterSpacing:
                      '0.13em',
                  }}
                >
                  CONEXIÓN
                </p>

                {commonPreferences.length >
                  0 && (
                  <span
                    style={{
                      color:
                        '#82a74b',
                      fontSize:
                        '10px',
                      fontWeight:
                        900,
                    }}
                  >
                    {commonPreferences.length}{' '}
                    {commonPreferences.length ===
                    1
                      ? 'coincidencia'
                      : 'coincidencias'}
                  </span>
                )}
              </div>

              {commonPreferences.length >
              0 ? (
                <>
                  <div
                    style={{
                      display:
                        'grid',
                      gridTemplateColumns:
                        'repeat(2, minmax(0, 1fr))',
                      gap: '8px',
                    }}
                  >
                    {commonPreferences.map(
                      (
                        interest,
                      ) => {
                        const selected =
                          selectedInterest ===
                          interest;

                        return (
                          <button
                            key={
                              interest
                            }
                            type="button"
                            disabled={
                              sendingInterest ||
                              interestSent
                            }
                            onClick={() =>
                              setSelectedInterest(
                                interest,
                              )
                            }
                            style={{
                              display:
                                'flex',
                              alignItems:
                                'center',
                              gap: '9px',
                              minWidth: 0,
                              padding:
                                '11px 12px',
                              borderRadius:
                                '14px',
                              border: selected
                                ? '1.5px solid #9cc85b'
                                : '1px solid #e3eae5',
                              background:
                                selected
                                  ? '#f1f8df'
                                  : '#fbfcfb',
                              color:
                                '#31515a',
                              textAlign:
                                'left',
                              cursor:
                                sendingInterest ||
                                interestSent
                                  ? 'default'
                                  : 'pointer',
                              transition:
                                'all 0.18s ease',
                              opacity:
                                sendingInterest ||
                                interestSent
                                  ? 0.65
                                  : 1,
                            }}
                          >
                            <span
                              style={{
                                width:
                                  '31px',
                                height:
                                  '31px',
                                flex:
                                  '0 0 auto',
                                borderRadius:
                                  '10px',
                                background:
                                  selected
                                    ? '#dff2ad'
                                    : '#eef3ef',
                                display:
                                  'grid',
                                placeItems:
                                  'center',
                                fontSize:
                                  '15px',
                              }}
                            >
                              {
                                interestIcons[
                                  interest
                                ]
                              }
                            </span>

                            <span
                              style={{
                                minWidth:
                                  0,
                              }}
                            >
                              <strong
                                style={{
                                  display:
                                    'block',
                                  fontSize:
                                    '11px',
                                }}
                              >
                                {
                                  interestLabels[
                                    interest
                                  ]
                                }
                              </strong>

                              <small
                                style={{
                                  display:
                                    'block',
                                  marginTop:
                                    '2px',
                                  color:
                                    '#8a9692',
                                  fontSize:
                                    '9px',
                                  whiteSpace:
                                    'nowrap',
                                  overflow:
                                    'hidden',
                                  textOverflow:
                                    'ellipsis',
                                }}
                              >
                                {
                                  interestDescriptions[
                                    interest
                                  ]
                                }
                              </small>
                            </span>
                          </button>
                        );
                      },
                    )}
                  </div>

                  <p
                    style={{
                      margin:
                        '9px 0 0',
                      color:
                        '#8a9692',
                      fontSize:
                        '10px',
                      lineHeight:
                        1.5,
                    }}
                  >
                    Selecciona cómo te
                    gustaría conectar.
                  </p>
                </>
              ) : (
                <div
                  style={{
                    padding:
                      '14px 15px',
                    borderRadius:
                      '14px',
                    background:
                      '#f8f9f8',
                    border:
                      '1px solid #e7ece9',
                    color:
                      '#7b8783',
                    fontSize:
                      '12px',
                    lineHeight:
                      1.5,
                  }}
                >
                  Por ahora no
                  encontramos
                  intereses en común
                  con {sourcePet.name}.
                </div>
              )}
            </section>

            {message && (
              <div
                style={{
                  marginTop:
                    '16px',
                  padding:
                    '13px 15px',
                  borderRadius:
                    '14px',
                  background:
                    '#eff8df',
                  border:
                    '1px solid #d5eab1',
                  color:
                    '#47652b',
                  fontSize:
                    '12px',
                  fontWeight:
                    800,
                  lineHeight:
                    1.5,
                }}
              >
                ✨ {message}
              </div>
            )}

            {error && (
              <div
                style={{
                  marginTop:
                    '16px',
                  padding:
                    '13px 15px',
                  borderRadius:
                    '14px',
                  background:
                    '#fff4f3',
                  border:
                    '1px solid #f0d4d1',
                  color:
                    '#a34c45',
                  fontSize:
                    '12px',
                  lineHeight:
                    1.5,
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                marginTop:
                  'auto',
                paddingTop:
                  '24px',
              }}
            >
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/mascotas/${currentPet.id}`,
                  )
                }
                style={{
                  width: '100%',
                  minHeight:
                    '42px',
                  border:
                    '1px solid #dfe7e2',
                  borderRadius:
                    '12px',
                  background:
                    '#ffffff',
                  color:
                    '#31515a',
                  fontSize:
                    '11px',
                  fontWeight:
                    900,
                  cursor:
                    'pointer',
                  transition:
                    'all 0.2s ease',
                }}
              >
                Ver perfil completo →
              </button>

              <div
                style={{
                  display:
                    'grid',
                  gridTemplateColumns:
                    '0.72fr 1.28fr',
                  gap: '9px',
                  marginTop:
                    '9px',
                }}
              >
                <button
                  type="button"
                  onClick={
                    handleSkip
                  }
                  disabled={
                    sendingInterest
                  }
                  style={{
                    minHeight:
                      '48px',
                    border:
                      '1px solid #dfe6e2',
                    borderRadius:
                      '13px',
                    background:
                      '#ffffff',
                    color:
                      '#64726d',
                    fontSize:
                      '12px',
                    fontWeight:
                      900,
                    cursor:
                      sendingInterest
                        ? 'wait'
                        : 'pointer',
                    opacity:
                      sendingInterest
                        ? 0.55
                        : 1,
                  }}
                >
                  Pasar
                </button>

                <button
                  type="button"
                  onClick={
                    handleInterest
                  }
                  disabled={
                    sendingInterest ||
                    interestSent ||
                    !selectedInterest
                  }
                  style={{
                    minHeight:
                      '48px',
                    border: 0,
                    borderRadius:
                      '13px',
                    background:
                      selectedInterest &&
                      !interestSent
                        ? '#b8e36b'
                        : '#e5ece7',
                    color:
                      selectedInterest &&
                      !interestSent
                        ? '#123b4a'
                        : '#8a9692',
                    fontSize:
                      '12px',
                    fontWeight:
                      900,
                    cursor:
                      selectedInterest &&
                      !sendingInterest &&
                      !interestSent
                        ? 'pointer'
                        : 'default',
                    boxShadow:
                      selectedInterest &&
                      !interestSent
                        ? '0 10px 24px rgba(18,59,74,0.10)'
                        : 'none',
                    transition:
                      'all 0.2s ease',
                  }}
                >
                  {sendingInterest
                    ? 'Enviando…'
                    : interestSent
                      ? '✓ Enviado'
                      : selectedInterest
                        ? `Me interesa · ${interestLabels[selectedInterest]}`
                        : 'Selecciona una opción'}
                </button>
              </div>
            </div>
          </div>
        </article>

        <footer
          style={{
            padding:
              '18px 4px 0',
            display: 'flex',
            justifyContent:
              'space-between',
            gap: '15px',
            color: '#9aa4a1',
            fontSize: '9px',
            lineHeight: 1.5,
          }}
        >
          <span>
            NUMAO · CONECTA LO QUE IMPORTA
          </span>

          <span>
            {sourcePet.name}
          </span>
        </footer>
      </div>

      <style jsx>{`
        @media (max-width: 820px) {
          article {
            grid-template-columns: 1fr !important;
          }

          article > div:first-child {
            min-height: 360px !important;
          }

          article > div:last-child {
            padding: 30px 24px 26px !important;
          }
        }

        @media (max-width: 560px) {
          main {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          article > div:first-child {
            min-height: 310px !important;
          }

          article > div:last-child {
            padding: 25px 18px 21px !important;
          }

          footer {
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}


