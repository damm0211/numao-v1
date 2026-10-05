'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <main className="homePage">
      <div className="homeGlow homeGlowOne" />
      <div className="homeGlow homeGlowTwo" />

      <section className="homeHero">
        <div className="homeBrand">
          <div className="brandMark" aria-hidden="true">
            <span />
            <span />
          </div>

          <div className="homeBrandName">NUMAO</div>
        </div>

        <div className="homeContent">
          <p className="homeEyebrow">
            CONEXIONES QUE IMPORTAN
          </p>

          <h1>
            Donde las mascotas
            <br />
            <span>encuentran su lugar.</span>
          </h1>

          <p className="homeDescription">
            Conecta a tu mascota con nuevos amigos,
            compañeros de juego y experiencias que
            realmente encajen con su personalidad.
          </p>

          <div className="homeActions">
            <button
              type="button"
              className="homePrimaryButton"
              onClick={() => router.push('/registro')}
            >
              Comenzar
              <span aria-hidden="true">→</span>
            </button>

            <button
              type="button"
              className="homeSecondaryButton"
              onClick={() => router.push('/login')}
            >
              Ya tengo una cuenta
            </button>
          </div>
        </div>

        <div className="homeVisual" aria-hidden="true">
          <div className="homeOrb homeOrbBack" />

          <div className="homeOrb homeOrbFront">
            <div className="homePaw">
              <span>🐾</span>
            </div>
          </div>

          <div className="homeFloatingCard homeFloatingCardTop">
            <span className="homeFloatingIcon">♡</span>

            <div>
              <strong>Conexiones reales</strong>
              <small>Basadas en compatibilidad</small>
            </div>
          </div>

          <div className="homeFloatingCard homeFloatingCardBottom">
            <span className="homeStatusDot" />

            <div>
              <strong>Tu mascota está lista</strong>
              <small>Descubre nuevas conexiones</small>
            </div>
          </div>
        </div>
      </section>

      <footer className="homeFooter">
        <span>NUMAO</span>
        <span>Conecta lo que importa.</span>
      </footer>
    </main>
  );
}