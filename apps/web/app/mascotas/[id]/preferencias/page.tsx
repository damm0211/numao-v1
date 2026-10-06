'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { API_URL } from '../../../../lib/config';

interface Preferences {
  play: boolean;
  walk: boolean;
  socialize: boolean;
  reproduction: boolean;
}

interface Pet {
  id: string;
  name: string;
}

export default function PetPreferencesPage() {
  const router = useRouter();
  const params = useParams();

  const petId = params.id as string;

  const [pet, setPet] = useState<Pet | null>(null);

  const [preferences, setPreferences] = useState<Preferences>({
    play: false,
    walk: false,
    socialize: false,
    reproduction: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function loadPreferences() {
      try {
        const token = localStorage.getItem('numao_access_token');

        if (!token) {
          router.push('/login');
          return;
        }

        const petResponse = await fetch(`${API_URL}/pets/${petId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        });

        const petData = await petResponse.json();

        if (!petResponse.ok) {
          const message = Array.isArray(petData.message)
            ? petData.message.join(', ')
            : petData.message || 'No fue posible cargar la mascota.';

          throw new Error(message);
        }

        setPet({
          id: petData.id,
          name: petData.name,
        });

        const preferencesResponse = await fetch(
          `${API_URL}/pets/${petId}/preferences`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: 'no-store',
          },
        );

        const preferencesData = await preferencesResponse.json();

        if (!preferencesResponse.ok) {
          const message = Array.isArray(preferencesData.message)
            ? preferencesData.message.join(', ')
            : preferencesData.message ||
              'No fue posible cargar las preferencias.';

          throw new Error(message);
        }

        setPreferences({
          play: Boolean(preferencesData.play),
          walk: Boolean(preferencesData.walk),
          socialize: Boolean(preferencesData.socialize),
          reproduction: Boolean(preferencesData.reproduction),
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Ocurrió un error al cargar las preferencias.',
        );
      } finally {
        setLoading(false);
      }
    }

    if (petId) {
      loadPreferences();
    }
  }, [petId, router]);

  function togglePreference(
    preference: keyof Preferences,
  ) {
    setPreferences((current) => ({
      ...current,
      [preference]: !current[preference],
    }));

    setError('');
    setSuccess('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const token = localStorage.getItem('numao_access_token');

      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(
        `${API_URL}/pets/${petId}/preferences`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(preferences),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const message = Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message ||
            'No fue posible guardar las preferencias.';

        throw new Error(message);
      }

      setPreferences({
        play: Boolean(data.play),
        walk: Boolean(data.walk),
        socialize: Boolean(data.socialize),
        reproduction: Boolean(data.reproduction),
      });

      setSuccess(
        'Preferencias actualizadas correctamente.',
      );

      setTimeout(() => {
        router.push(`/mascotas/${petId}`);
      }, 800);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al guardar las preferencias.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="shell petsShell">
        <div className="stateCard">
          <div className="loadingDot" />
          <p>Cargando preferencias…</p>
        </div>
      </main>
    );
  }

  if (!pet) {
    return (
      <main className="shell petsShell">
        <div className="stateCard errorCard">
          <h2>No pudimos cargar la mascota</h2>

          <p>
            {error || 'Mascota no encontrada.'}
          </p>

          <button
            type="button"
            className="primaryButton"
            onClick={() => router.push('/mis-mascotas')}
          >
            Volver a mis mascotas
          </button>
        </div>
      </main>
    );
  }

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

        <button
          type="button"
          className="profileButton"
          onClick={() => router.push('/mis-mascotas')}
        >
          Mis mascotas
        </button>
      </header>

      <section className="petsContainer">
        <button
          type="button"
          className="backLink"
          onClick={() => router.push(`/mascotas/${petId}`)}
        >
          ← Volver al perfil
        </button>

        <div className="editHeader">
          <p className="eyebrow">CONEXIÓN NUMAO</p>

          <h1 className="editTitle">
            Preferencias de {pet.name}
          </h1>

          <p className="editDescription">
            Indica qué tipo de conexión buscas para {pet.name}.
            Estas preferencias ayudarán posteriormente a NUMAO
            a encontrar mascotas compatibles.
          </p>
        </div>

        <section className="editCard">
          <form onSubmit={handleSubmit}>
            <div className="preferenceList">

              <button
                type="button"
                className={`preferenceCard ${
                  preferences.play ? 'selected' : ''
                }`}
                onClick={() => togglePreference('play')}
                aria-pressed={preferences.play}
              >
                <span className="preferenceIcon">
                  🎾
                </span>

                <span className="preferenceText">
                  <strong>Jugar</strong>

                  <small>
                    Encontrar compañeros para jugar,
                    correr y compartir.
                  </small>
                </span>

                <span className="checkCircle">
                  {preferences.play ? '✓' : ''}
                </span>
              </button>

              <button
                type="button"
                className={`preferenceCard ${
                  preferences.walk ? 'selected' : ''
                }`}
                onClick={() => togglePreference('walk')}
                aria-pressed={preferences.walk}
              >
                <span className="preferenceIcon">
                  🐕
                </span>

                <span className="preferenceText">
                  <strong>Pasear</strong>

                  <small>
                    Encontrar otras mascotas para pasear
                    y explorar.
                  </small>
                </span>

                <span className="checkCircle">
                  {preferences.walk ? '✓' : ''}
                </span>
              </button>

              <button
                type="button"
                className={`preferenceCard ${
                  preferences.socialize ? 'selected' : ''
                }`}
                onClick={() =>
                  togglePreference('socialize')
                }
                aria-pressed={preferences.socialize}
              >
                <span className="preferenceIcon">
                  🤝
                </span>

                <span className="preferenceText">
                  <strong>Socializar</strong>

                  <small>
                    Conocer otras mascotas y compartir
                    tiempo juntos.
                  </small>
                </span>

                <span className="checkCircle">
                  {preferences.socialize ? '✓' : ''}
                </span>
              </button>

              <button
                type="button"
                className={`preferenceCard ${
                  preferences.reproduction
                    ? 'selected'
                    : ''
                }`}
                onClick={() =>
                  togglePreference('reproduction')
                }
                aria-pressed={preferences.reproduction}
              >
                <span className="preferenceIcon">
                  ❤️
                </span>

                <span className="preferenceText">
                  <strong>Reproducción</strong>

                  <small>
                    Buscar una conexión con intención
                    reproductiva.
                  </small>
                </span>

                <span className="checkCircle">
                  {preferences.reproduction ? '✓' : ''}
                </span>
              </button>

            </div>

            <div className="preferenceNotice">
              <strong>
                Puedes seleccionar más de una opción.
              </strong>

              <span>
                NUMAO utilizará estas preferencias junto
                con otros criterios para calcular la
                compatibilidad.
              </span>
            </div>

            {error && (
              <p
                role="alert"
                className="error"
              >
                {error}
              </p>
            )}

            {success && (
              <p
                role="status"
                className="successMessage"
              >
                {success}
              </p>
            )}

            <div className="editActions">
              <button
                type="button"
                className="secondaryButton"
                onClick={() =>
                  router.push(`/mascotas/${petId}`)
                }
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="primaryButton"
                disabled={saving}
              >
                {saving
                  ? 'Guardando…'
                  : 'Guardar preferencias'}
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}
