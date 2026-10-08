'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '../../lib/config';
export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: '',
    password: '',
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

    if (error) {
      setError('');
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/auth/login`,
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
            'Email o contraseña incorrectos.';

        throw new Error(message);
      }

      localStorage.setItem(
        'numao_access_token',
        data.accessToken,
      );
      
      window.dispatchEvent(new Event('numao:auth-changed'));      

      localStorage.setItem(
        'numao_user',
        JSON.stringify(data.user),
      );

      router.push('/mis-mascotas');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al iniciar sesión.',
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
          aria-label="Ir al inicio"
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
          onClick={() => router.push('/registro')}
        >
          Crear una cuenta
        </button>
      </header>

      <section className="authLayout">
        <div className="authIntro">
          <p className="authEyebrow">
            BIENVENIDO DE VUELTA
          </p>

          <h1>
            Vuelve a conectar
            <br />
            <span>lo que importa.</span>
          </h1>

          <p className="authDescription">
            Ingresa a tu cuenta y continúa descubriendo
            conexiones, experiencias y nuevos compañeros
            para tu mascota.
          </p>

          <div className="authHighlights">
            <div>
              <span className="authHighlightIcon">
                ♡
              </span>

              <div>
                <strong>
                  Tus conexiones te esperan
                </strong>

                <small>
                  Continúa donde lo dejaste y descubre
                  nuevas posibilidades.
                </small>
              </div>
            </div>

            <div>
              <span className="authHighlightIcon">
                ✓
              </span>

              <div>
                <strong>
                  Tu mascota, tu experiencia
                </strong>

                <small>
                  Mantén el control de tus perfiles y
                  preferencias.
                </small>
              </div>
            </div>
          </div>
        </div>

        <section className="authCard">
          <div className="authCardHeader">
            <p className="authEyebrow">
              INICIAR SESIÓN
            </p>

            <h2>
              Bienvenido de vuelta.
            </h2>

            <p>
              Ingresa a tu cuenta para continuar.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="authForm"
          >
            <label>
              <span>Email</span>

              <input
                name="email"
                type="email"
                placeholder="tu@email.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </label>

            <label>
              <span>Contraseña</span>

              <input
                name="password"
                type="password"
                placeholder="Tu contraseña"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
            </label>

            {error && (
              <div
                role="alert"
                className="authError"
              >
                <span
                  className="authErrorIcon"
                  aria-hidden="true"
                >
                  !
                </span>

                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="authPrimaryButton"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span
                    className="authSpinner"
                    aria-hidden="true"
                  />

                  Ingresando...
                </>
              ) : (
                <>
                  Iniciar sesión

                  <span aria-hidden="true">
                    →
                  </span>
                </>
              )}
            </button>
          </form>

          <div className="authDivider">
            <span />
            <span>o</span>
            <span />
          </div>

          <button
            type="button"
            className="authSecondaryButton"
            onClick={() => router.push('/registro')}
          >
            Crear una cuenta
          </button>

          <p className="authLegal">
            ¿Aún no tienes una cuenta? Puedes crearla
            en pocos pasos.
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
