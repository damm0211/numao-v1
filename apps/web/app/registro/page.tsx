'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '../../lib/config';

export default function RegistroPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    birthDate: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/auth/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const message = Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message ||
            'No fue posible crear la cuenta.';

        throw new Error(message);
      }

      localStorage.setItem(
        'numao_access_token',
        data.accessToken,
      );

      localStorage.setItem(
        'numao_user',
        JSON.stringify(data.user),
      );

      router.push('/crear-mascota');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al crear la cuenta.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authPage">
      <div className="authGlow authGlowOne" />
      <div className="authGlow authGlowTwo" />

      <header className="authHeader">
        <button
          type="button"
          className="authBrand"
          onClick={() => router.push('/')}
          aria-label="Volver al inicio"
        >
          <div className="brandMark" aria-hidden="true">
            <span />
            <span />
          </div>

          <span>NUMAO</span>
        </button>

        <button
          type="button"
          className="authHeaderLink"
          onClick={() => router.push('/login')}
        >
          Iniciar sesión
        </button>
      </header>

      <section className="authLayout">
        <div className="authIntro">
          <p className="authEyebrow">
            ÚNETE A NUMAO
          </p>

          <h1>
            Comienza a crear
            <br />
            <span>nuevas conexiones.</span>
          </h1>

          <p className="authDescription">
            Crea tu cuenta y descubre una nueva forma
            de conectar a tu mascota con compañeros
            compatibles y nuevas experiencias.
          </p>

          <div className="authHighlights">
            <div>
              <span className="authHighlightIcon">♡</span>
              <div>
                <strong>Conexiones compatibles</strong>
                <small>
                  Pensadas según la personalidad de tu mascota.
                </small>
              </div>
            </div>

            <div>
              <span className="authHighlightIcon">✓</span>
              <div>
                <strong>Tu espacio, tu ritmo</strong>
                <small>
                  Tú decides cuándo y con quién conectar.
                </small>
              </div>
            </div>
          </div>
        </div>

        <section className="authCard">
          <div className="authCardHeader">
            <p className="eyebrow">CREAR CUENTA</p>

            <h2>Bienvenido a NUMAO.</h2>

            <p>
              Completa tus datos para comenzar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="authForm">
            <label>
              <span>Nombre</span>

              <input
                name="name"
                type="text"
                placeholder="Tu nombre"
                value={form.name}
                onChange={handleChange}
                required
                minLength={2}
                autoComplete="name"
              />
            </label>

            <label>
              <span>Email</span>

              <input
                name="email"
                type="email"
                placeholder="tu@email.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </label>

            <label>
              <span>Contraseña</span>

              <input
                name="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>

            <label>
              <span>Fecha de nacimiento</span>

              <input
                name="birthDate"
                type="date"
                value={form.birthDate}
                onChange={handleChange}
                required
                autoComplete="bday"
              />
            </label>

            {error && (
              <p
                role="alert"
                className="authError"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="authPrimaryButton"
              disabled={loading}
            >
              {loading
                ? 'Creando cuenta…'
                : 'Crear mi cuenta'}

              {!loading && (
                <span aria-hidden="true">→</span>
              )}
            </button>
          </form>

          <div className="authSwitch">
            <span>¿Ya tienes una cuenta?</span>

            <button
              type="button"
              onClick={() => router.push('/login')}
            >
              Iniciar sesión
            </button>
          </div>

          <p className="authLegal">
            Al crear tu cuenta podrás comenzar a
            configurar el perfil de tu mascota.
          </p>
        </section>
      </section>

      <footer className="authFooter">
        <span>NUMAO</span>
        <span>Conecta lo que importa.</span>
      </footer>
    </main>
  );
}