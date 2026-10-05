'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  API_URL,
  API_ORIGIN,
} from '../../../lib/config';
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
}

interface PetPhoto {
  id: string;
  petId: string;
  storageKey: string;
  sortOrder: number;
  createdAt: string;
}

interface PetPreferences {
  play: boolean;
  walk: boolean;
  socialize: boolean;
  reproduction: boolean;
}

interface ConnectionPet {
  id: string;
  name: string;
  breed: string | null;
  size: string | null;
  birthDate: string;
  bio: string | null;
  energyLevel: number | null;
  sociability: number | null;
  playfulness: number | null;
}

interface Connection {
  id: string;
  status: string;
  compatibility: number;
  algorithmVersion: string;
  createdAt: string;
  currentPet: ConnectionPet;
  otherPet: ConnectionPet;
}

export default function PetProfilePage() {
  const router = useRouter();
  const params = useParams();

  const petId = params.id as string;

  const [pet, setPet] = useState<Pet | null>(null);
  const [photos, setPhotos] = useState<PetPhoto[]>([]);
  const [preferences, setPreferences] =
    useState<PetPreferences | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [connection, setConnection] =
    useState<Connection | null>(null);

  const [loading, setLoading] = useState(true);
  const [connectionLoading, setConnectionLoading] =
    useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPet() {
      try {
        const token =
          localStorage.getItem('numao_access_token');

        if (!token) {
          router.push('/login');
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [profileResponse, connectionsResponse] =
          await Promise.all([
            fetch(
              `${API_URL}/pets/${petId}/public-profile`,
              {
                method: 'GET',
                headers,
                cache: 'no-store',
              },
            ),
            fetch(`${API_URL}/connections`, {
              method: 'GET',
              headers,
              cache: 'no-store',
            }),
          ]);

        const profileData =
          await profileResponse.json();

        const connectionsData =
          await connectionsResponse.json();

        if (!profileResponse.ok) {
          const message = Array.isArray(
            profileData.message,
          )
            ? profileData.message.join(', ')
            : profileData.message ||
              'No fue posible cargar el perfil.';

          throw new Error(message);
        }

        setPet(profileData.pet);
        setPhotos(
          Array.isArray(profileData.photos)
            ? profileData.photos
            : [],
        );
        setPreferences(
          profileData.preferences || null,
        );
        setIsOwner(Boolean(profileData.isOwner));

        if (connectionsResponse.ok) {
          const userConnections =
            Array.isArray(connectionsData)
              ? connectionsData
              : [];

          const petConnection =
            userConnections.find(
              (item: Connection) =>
                item.status === 'ACTIVE' &&
                (item.currentPet?.id === petId ||
                  item.otherPet?.id === petId),
            );

          setConnection(
            petConnection || null,
          );
        } else {
          setConnection(null);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Ocurrió un error al cargar el perfil.',
        );
      } finally {
        setLoading(false);
        setConnectionLoading(false);
      }
    }

    if (petId) {
      loadPet();
    }
  }, [petId, router]);

  async function togglePetStatus() {
    if (!pet || !isOwner) return;

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

      setPet((current) =>
        current ? { ...current, status: nextStatus } : current,
      );
      setError('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible cambiar el estado del perfil.',
      );
    }
  }

  function goToDiscover() {
    if (!pet || !isOwner) return;

    if (pet.status !== 'ACTIVE') {
      setError(
        'Activa el perfil de esta mascota para comenzar a descubrir nuevas conexiones.',
      );
      return;
    }

    localStorage.setItem('numao_active_pet_id', pet.id);
    router.push(`/descubrir?petId=${encodeURIComponent(pet.id)}`);
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

    return age;
  }

  function getTraitLevel(value: number | null) {
    if (value === null || value === undefined) return 0;

    return Math.min(5, Math.max(0, Math.round(value)));
  }

  function getTraitLabel(
    value: number | null,
    labels: string[],
  ) {
    const level = getTraitLevel(value);

    if (level === 0) return 'Sin especificar';

    return labels[level - 1];
  }

  function renderTrait(
    value: number | null,
    labels: string[],
  ) {
    const level = getTraitLevel(value);

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginTop: '6px',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '4px',
            flex: 1,
            minWidth: 0,
          }}
          aria-label={
            level > 0
              ? `${getTraitLabel(value, labels)} · ${level}/5`
              : 'Sin especificar'
          }
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <span
              key={index}
              style={{
                height: '5px',
                flex: 1,
                borderRadius: '999px',
                background:
                  index < level ? '#b8e36b' : '#e5ebe7',
              }}
            />
          ))}
        </div>

        <span
          style={{
            color: '#6f7c77',
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {level > 0
            ? `${getTraitLabel(value, labels)} · ${level}/5`
            : 'Sin especificar'}
        </span>
      </div>
    );
  }

  function getActivePreferences() {
    if (!preferences) return [];

    const active: {
      icon: string;
      label: string;
    }[] = [];

    if (preferences.play) {
      active.push({
        icon: '🎾',
        label: 'Jugar',
      });
    }

    if (preferences.walk) {
      active.push({
        icon: '🐕',
        label: 'Pasear',
      });
    }

    if (preferences.socialize) {
      active.push({
        icon: '🤝',
        label: 'Socializar',
      });
    }

    if (preferences.reproduction) {
      active.push({
        icon: '❤️',
        label: 'Reproducción',
      });
    }

    return active;
  }

  function getPhotoUrl(
    storageKey: string,
  ) {
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

  if (loading) {
    return (
      <main className="shell petsShell">
        <div className="stateCard">
          <div className="loadingDot" />
          <p>Cargando perfil…</p>
        </div>
      </main>
    );
  }

  if (error || !pet) {
    return (
      <main className="shell petsShell">
        <div className="stateCard errorCard">
          <h2>No pudimos cargar este perfil</h2>

          <p>
            {error ||
              'Mascota no encontrada.'}
          </p>

          <button
            type="button"
            className="primaryButton"
            onClick={() =>
              router.push('/mis-mascotas')
            }
          >
            Volver a mis mascotas
          </button>
        </div>
      </main>
    );
  }

  const age = calculateAge(
    pet.birthDate,
  );

  const activePreferences =
    getActivePreferences();

  const primaryPhoto =
    [...photos].sort(
      (a, b) =>
        a.sortOrder - b.sortOrder,
    )[0] || null;

  const connectedPet = connection
    ? connection.currentPet?.id === pet.id
      ? connection.otherPet
      : connection.currentPet
    : null;

  return (
    <main className="shell petsShell">
      <header className="topBar">
        <button
          type="button"
          className="logoButton"
          onClick={() => router.push('/')}
          aria-label="Volver al inicio"
        >
          <span
            className="miniBrandMark"
            aria-hidden="true"
          >
            <span />
            <span />
          </span>

          <span>NUMAO</span>
        </button>

        <button
          type="button"
          className="profileButton"
          onClick={() =>
            router.push(
              isOwner ? '/mis-mascotas' : '/descubrir',
            )
          }
        >
          {isOwner ? 'Mis mascotas' : 'Descubrir'}
        </button>
      </header>

      <section className="petsContainer">
        <button
          type="button"
          className="backLink"
          onClick={() =>
            router.push(
              isOwner ? '/mis-mascotas' : '/descubrir',
            )
          }
        >
          {isOwner
            ? '← Volver a mis mascotas'
            : '← Volver a descubrir'}
        </button>

        {connection && (
          <section
            className="connectionNotice"
            style={{
              marginBottom: '24px',
              padding: '22px',
              borderRadius: '20px',
              background:
                'linear-gradient(135deg, #f1f8f4 0%, #ffffff 100%)',
              border:
                '1px solid #d7e8de',
              boxShadow:
                '0 10px 30px rgba(34, 67, 48, 0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent:
                  'space-between',
                gap: '20px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <p
                  className="eyebrow"
                  style={{
                    marginBottom: '8px',
                  }}
                >
                  NUEVA CONEXIÓN
                </p>

                <h2
                  style={{
                    margin:
                      '0 0 8px',
                    fontSize: '24px',
                  }}
                >
                  Tienes una conexión con{' '}
                  {connectedPet?.name || 'esta mascota'}
                </h2>

                <p
                  style={{
                    margin: 0,
                    color: '#66736c',
                    lineHeight: 1.5,
                  }}
                >
                  {pet.name} y{' '}
                  {connectedPet?.name || 'esta mascota'}{' '}
                  han mostrado interés
                  mutuo.
                </p>
              </div>

              <div
                style={{
                  minWidth: '110px',
                  textAlign: 'center',
                  padding:
                    '12px 16px',
                  borderRadius: '14px',
                  background: '#ffffff',
                  border:
                    '1px solid #e1ebe5',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    color: '#7a857f',
                    marginBottom:
                      '4px',
                  }}
                >
                  Compatibilidad
                </span>

                <strong
                  style={{
                    fontSize: '24px',
                    color: '#274b38',
                  }}
                >
                  {connection.compatibility}%
                </strong>
              </div>
            </div>

            <button
              type="button"
              className="primaryButton"
              style={{
                marginTop: '18px',
                width: '100%',
              }}
              onClick={() =>
                router.push(
                  `/conexiones/${connection.id}`,
                )
              }
            >
              Ver conexión
            </button>
          </section>
        )}

        <article className="petProfileCard">
          <div
            className="petPhoto"
            style={{
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {primaryPhoto ? (
              <img
                src={getPhotoUrl(
                  primaryPhoto.storageKey,
                )}
                alt={`Fotografía de ${pet.name}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  background:
                    '#f4f6f5',
                }}
              />
            ) : (
              <div className="photoPlaceholder">
                <span>
                  Foto de {pet.name}
                </span>
              </div>
            )}

            <span className="activeBadge">
              <span className="activeDot" />
              {pet.status === 'ACTIVE'
                ? 'Activa'
                : 'Pausada'}
            </span>
          </div>

          <div className="petContent">
            <p className="eyebrow">
              PERFIL DE MASCOTA
            </p>

            <div className="petHeader">
              <div>
                <h1 className="petProfileName">
                  {pet.name}
                </h1>

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
                  {age}{' '}
                  {age === 1
                    ? 'año'
                    : 'años'}
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
              <section className="profileSection">
                <p className="sectionLabel">
                  Sobre {pet.name}
                </p>

                <p className="petBio">
                  {pet.bio}
                </p>
              </section>
            )}

            <section className="profileSection">
              <p className="sectionLabel">
                Personalidad
              </p>

              <div className="petTraits">
                <div className="trait">
                  <span>Energía</span>
                  {renderTrait(pet.energyLevel, [
                    'Muy baja',
                    'Baja',
                    'Media',
                    'Alta',
                    'Muy alta',
                  ])}
                </div>

                <div className="trait">
                  <span>Sociabilidad</span>
                  {renderTrait(pet.sociability, [
                    'Muy baja',
                    'Baja',
                    'Media',
                    'Alta',
                    'Muy alta',
                  ])}
                </div>

                <div className="trait">
                  <span>Juego</span>
                  {renderTrait(pet.playfulness, [
                    'Muy bajo',
                    'Bajo',
                    'Medio',
                    'Alto',
                    'Muy alto',
                  ])}
                </div>
              </div>
            </section>

            <section className="profileSection">
              <p className="sectionLabel">
                Preferencias de conexión
              </p>

              {activePreferences.length >
              0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginTop: '12px',
                  }}
                >
                  {activePreferences.map(
                    (preference) => (
                      <div
                        key={
                          preference.label
                        }
                        style={{
                          display:
                            'inline-flex',
                          alignItems:
                            'center',
                          gap: '8px',
                          padding:
                            '10px 14px',
                          borderRadius:
                            '999px',
                          background:
                            '#f3f6f4',
                          border:
                            '1px solid #dfe7e2',
                          color:
                            '#25332b',
                          fontSize:
                            '14px',
                          fontWeight: 600,
                        }}
                      >
                        <span
                          style={{
                            fontSize:
                              '17px',
                            lineHeight: 1,
                          }}
                        >
                          {
                            preference.icon
                          }
                        </span>

                        <span>
                          {
                            preference.label
                          }
                        </span>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p
                  style={{
                    marginTop: '10px',
                    color: '#7b847f',
                    fontSize: '14px',
                  }}
                >
                  Aún no hay
                  preferencias de
                  conexión
                  seleccionadas.
                </p>
              )}
            </section>

            {isOwner ? (
              <section className="profileActions">
                <button
                  type="button"
                  className="primaryButton"
                  onClick={() =>
                    router.push(
                      `/mascotas/${pet.id}/editar`,
                    )
                  }
                >
                  Editar perfil
                </button>

                <button
                  type="button"
                  className="secondaryButton"
                  onClick={() =>
                    router.push(
                      `/mascotas/${pet.id}/preferencias`,
                    )
                  }
                >
                  Preferencias de
                  conexión
                </button>

                <button
                  type="button"
                  className="primaryButton"
                  onClick={goToDiscover}
                  disabled={pet.status !== 'ACTIVE'}
                  style={{ marginTop: '10px' }}
                >
                  ✨ Descubrir mascotas
                </button>

                <button
                  type="button"
                  className="secondaryButton"
                  onClick={togglePetStatus}
                  style={{ marginTop: '10px' }}
                >
                  {pet.status === 'ACTIVE'
                    ? '⏸ Pausar perfil'
                    : '▶ Activar perfil'}
                </button>

                <p
                  style={{
                    margin: '10px 0 0',
                    textAlign: 'center',
                    color: '#748078',
                    fontSize: '13px',
                  }}
                >
                  {pet.status === 'ACTIVE'
                    ? 'Tu mascota puede aparecer en Descubrir.'
                    : 'Tu mascota está pausada y no aparecerá en nuevos descubrimientos.'}
                </p>
              </section>
            ) : (
              <section
                className="profileActions"
                style={{
                  marginTop: '28px',
                }}
              >
                <button
                  type="button"
                  className="secondaryButton"
                  onClick={() =>
                    router.push('/descubrir')
                  }
                >
                  ← Seguir descubriendo
                </button>
              </section>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
