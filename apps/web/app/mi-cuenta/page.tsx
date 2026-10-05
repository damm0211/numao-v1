'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '../../lib/config';
type User = {
  id: string;
  email: string;
  displayName: string;
  dateOfBirth: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function MiCuentaPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);

  const [displayName, setDisplayName] =
    useState('');

  const [email, setEmail] = useState('');

  const [birthDate, setBirthDate] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  useEffect(() => {
    const token =
      localStorage.getItem(
        'numao_access_token',
      );

    if (!token) {
      router.push('/login');
      return;
    }

    async function loadAccount() {
      try {
        const response = await fetch(
          `${API_URL}/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              'No fue posible cargar la cuenta.',
          );
        }

        const accountUser =
          data.user;

        setUser(accountUser);
        setDisplayName(
          accountUser.displayName || '',
        );
        setEmail(
          accountUser.email || '',
        );

        if (accountUser.dateOfBirth) {
          setBirthDate(
            new Date(
              accountUser.dateOfBirth,
            )
              .toISOString()
              .split('T')[0],
          );
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'No fue posible cargar la cuenta.',
        );
      } finally {
        setLoading(false);
      }
    }

    loadAccount();
  }, [router]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token =
      localStorage.getItem(
        'numao_access_token',
      );

    if (!token) {
      router.push('/login');
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch(
        `${API_URL}/auth/me`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            displayName,
            email,
            birthDate,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        const errorMessage =
          Array.isArray(data.message)
            ? data.message.join(', ')
            : data.message ||
              'No fue posible actualizar la cuenta.';

        throw new Error(
          errorMessage,
        );
      }

      setUser(data.user);

      localStorage.setItem(
        'numao_user',
        JSON.stringify(data.user),
      );

      setMessage(
        'Tus datos se actualizaron correctamente.',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible actualizar la cuenta.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="shell">
        <div className="brandMark" aria-hidden="true">
          <span />
          <span />
        </div>

        <h1>NUMAO</h1>

        <p className="tagline">
          Conecta lo que importa.
        </p>

        <section className="card">
          <p className="eyebrow">
            MI CUENTA
          </p>

          <h2>Cargando tu cuenta…</h2>

          <p>
            Estamos recuperando tus datos.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="brandMark" aria-hidden="true">
        <span />
        <span />
      </div>

      <h1>NUMAO</h1>

      <p className="tagline">
        Conecta lo que importa.
      </p>

      <section className="card accountCard">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'space-between',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div>
            <p className="eyebrow">
              MI CUENTA
            </p>

            <h2>
              Tus datos personales.
            </h2>
          </div>

          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background:
                'rgba(0, 0, 0, 0.06)',
              fontSize: '20px',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {displayName
              ? displayName
                  .charAt(0)
                  .toUpperCase()
              : 'U'}
          </div>
        </div>

        <p>
          Revisa y actualiza la información
          de tu cuenta.
        </p>

        <form
          onSubmit={handleSubmit}
        >
          <label>
            Nombre
            <input
              type="text"
              value={displayName}
              onChange={(event) =>
                setDisplayName(
                  event.target.value,
                )
              }
              required
              minLength={2}
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
              required
            />
          </label>

          <label>
            Fecha de nacimiento
            <input
              type="date"
              value={birthDate}
              onChange={(event) =>
                setBirthDate(
                  event.target.value,
                )
              }
              required
            />
          </label>

          {message && (
            <p
              role="status"
              style={{
                marginTop: '12px',
                marginBottom: '12px',
              }}
            >
              {message}
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="error"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
          >
            {saving
              ? 'Guardando…'
              : 'Guardar cambios'}
          </button>
        </form>

        <button
          type="button"
          className="backButton"
          onClick={() =>
            router.push('/mis-mascotas')
          }
        >
          Volver a mis mascotas
        </button>

        {user && (
          <p
            style={{
              marginTop: '18px',
              fontSize: '12px',
              opacity: 0.55,
              textAlign: 'center',
            }}
          >
            Miembro desde{' '}
            {new Date(
              user.createdAt,
            ).toLocaleDateString(
              'es-CL',
            )}
          </p>
        )}
      </section>
    </main>
  );
}