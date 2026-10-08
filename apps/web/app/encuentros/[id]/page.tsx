'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { API_URL } from '../../../lib/config';

type Meetup = {
  id: string;
  startAt: string;
  placeName: string;
  placeAddress: string | null;
  status: 'PROPOSED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  proposedByUserId: string;
  petA: { id: string; name: string };
  petB: { id: string; name: string };
  petFriendlyPlace?: {
    id: string;
    name: string;
    address: string;
    commune: string;
    verified: boolean;
  } | null;
  connection: {
    id: string;
    status: string;
    userAId: string;
    userBId: string;
  };
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function EncuentroDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [item, setItem] = useState<Meetup | null>(null);
const [userId, setUserId] = useState('');
const [loading, setLoading] = useState(true);
const [working, setWorking] = useState(false);
const [error, setError] = useState('');
const [reviewed, setReviewed] = useState(false);
const [showReviewForm, setShowReviewForm] = useState(false);
const [overallRating, setOverallRating] = useState(0);
const [petBehaviorRating, setPetBehaviorRating] = useState(0);
const [reviewComment, setReviewComment] = useState('');
  async function load() {
    const token = localStorage.getItem('numao_access_token');
    const storedUser = localStorage.getItem('numao_user');

    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const parsed = storedUser ? JSON.parse(storedUser) : null;
      setUserId(parsed?.id || '');
    } catch {
      setUserId('');
    }

    const response = await fetch(`${API_URL}/meetups/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    const data = await response.json().catch(() => null);

    if (response.status === 401) {
      localStorage.removeItem('numao_access_token');
      localStorage.removeItem('numao_user');
      router.push('/login');
      return;
    }

    if (!response.ok) {
      throw new Error(data?.message || 'No pudimos cargar el encuentro.');
    }

    setItem(data);

    const reviewResponse = await fetch(
      `${API_URL}/reviews/meetups/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      },
    );

    const reviewData = await reviewResponse.json().catch(() => null);

    if (reviewResponse.ok) {
      setReviewed(Boolean(reviewData?.reviewed));
    }
  }

  useEffect(() => {
    load()
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : 'No pudimos cargar el encuentro.',
        ),
      )
      .finally(() => setLoading(false));
  }, [id]);

  async function changeStatus(
    status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED',
  ) {
    const token = localStorage.getItem('numao_access_token');
    if (!token || working) return;

    try {
      setWorking(true);
      setError('');

      const response = await fetch(`${API_URL}/meetups/${id}/status`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message || 'No pudimos actualizar el encuentro.',
        );
      }

      setItem(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No pudimos actualizar el encuentro.',
      );
    } finally {
      setWorking(false);
    }
  }
  async function submitReview() {
    const token =
      localStorage.getItem('numao_access_token');

    if (!token || working || overallRating === 0) {
      return;
    }

    try {
      setWorking(true);
      setError('');

      const response = await fetch(
        `${API_URL}/reviews/meetups/${id}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            overallRating,
            petBehaviorRating:
              petBehaviorRating > 0
                ? petBehaviorRating
                : undefined,
            comment:
              reviewComment.trim() || undefined,
          }),
        },
      );

      const data =
        await response.json().catch(() => null);

      if (response.status === 401) {
        localStorage.removeItem(
          'numao_access_token',
        );
        localStorage.removeItem('numao_user');
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(
          Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message ||
              'No pudimos guardar la evaluación.',
        );
      }

      setReviewed(true);
      setShowReviewForm(false);
      setOverallRating(0);
      setPetBehaviorRating(0);
      setReviewComment('');
      setError('');
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'No pudimos guardar la evaluación.',
      );
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <main
        style={{
          padding: 30,
          background: '#f7f8f5',
          minHeight: '100vh',
        }}
      >
        Cargando encuentro…
      </main>
    );
  }

  if (!item) {
    return (
      <main
        style={{
          padding: 30,
          background: '#f7f8f5',
          minHeight: '100vh',
        }}
      >
        <p>{error || 'Encuentro no encontrado.'}</p>
      </main>
    );
  }

  const canConfirm =
    item.status === 'PROPOSED' &&
    item.proposedByUserId !== userId;

  const canCancel =
    item.status === 'PROPOSED' || item.status === 'CONFIRMED';

  const canComplete = item.status === 'CONFIRMED';

  const meetupHasStarted =
    new Date(item.startAt).getTime() <= Date.now();

  const canReview =
    (item.status === 'CONFIRMED' || item.status === 'COMPLETED') &&
    meetupHasStarted &&
    !reviewed;

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
      <div style={{ width: 'min(100%, 760px)', margin: '0 auto' }}>
        <button
          onClick={() => router.push('/encuentros')}
          style={{
            border: 0,
            background: 'transparent',
            color: '#60716d',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          ← Encuentros
        </button>

        <section
          style={{
            marginTop: 22,
            background: '#fff',
            border: '1px solid rgba(18,59,74,0.08)',
            borderRadius: 28,
            padding: 28,
            boxShadow: '0 24px 70px rgba(18,59,74,0.08)',
          }}
        >
          <p
            style={{
              margin: 0,
              color: '#4c675d',
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            Encuentro NUMAO
          </p>

          <h1 style={{ color: '#123b4a', margin: '8px 0 6px' }}>
            {item.petA.name} · {item.petB.name}
          </h1>

          <span
            style={{
              display: 'inline-block',
              padding: '7px 11px',
              borderRadius: 999,
              background:
                item.status === 'CONFIRMED'
                  ? '#edf8dc'
                  : '#f2f6f0',
              color: '#4c675d',
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            {item.status === 'PROPOSED'
              ? 'Pendiente de confirmación'
              : item.status === 'CONFIRMED'
                ? 'Confirmado'
                : item.status === 'CANCELLED'
                  ? 'Cancelado'
                  : 'Completado'}
          </span>

          <div
            style={{
              marginTop: 26,
              display: 'grid',
              gap: 16,
            }}
          >
            <div>
              <strong>Fecha</strong>
              <p
                style={{
                  margin: '5px 0 0',
                  color: '#71807c',
                }}
              >
                {formatDate(item.startAt)}
              </p>
            </div>

            <div>
              <strong>Hora</strong>
              <p
                style={{
                  margin: '5px 0 0',
                  color: '#71807c',
                }}
              >
                {formatTime(item.startAt)}
              </p>
            </div>

            <div>
              <strong>Lugar</strong>
              <p
                style={{
                  margin: '5px 0 0',
                  color: '#71807c',
                }}
              >
                📍 {item.placeName}
              </p>

              {item.placeAddress && (
                <p
                  style={{
                    margin: '4px 0 0',
                    color: '#8a9692',
                  }}
                >
                  {item.placeAddress}
                </p>
              )}

              {item.petFriendlyPlace && (
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: 8,
                    padding: '6px 9px',
                    borderRadius: 999,
                    background: '#edf8dc',
                    color: '#527a26',
                    fontSize: 11,
                    fontWeight: 900,
                  }}
                >
                  🐾 Lugar pet friendly
                </span>
              )}
            </div>
          </div>

          {error && (
            <div
              style={{
                marginTop: 22,
                padding: 12,
                borderRadius: 12,
                background: '#fff3f1',
                color: '#9b493e',
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              marginTop: 28,
            }}
          >
            {canConfirm && (
              <button
                onClick={() => changeStatus('CONFIRMED')}
                disabled={working}
                style={{
                  border: 0,
                  borderRadius: 14,
                  padding: '13px 18px',
                  background: '#b8e36b',
                  color: '#123b4a',
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                Confirmar encuentro
              </button>
            )}

            {canComplete && (
              <button
                onClick={() => changeStatus('COMPLETED')}
                disabled={working}
                style={{
                  border: '1px solid rgba(18,59,74,0.12)',
                  borderRadius: 14,
                  padding: '13px 18px',
                  background: '#fff',
                  color: '#123b4a',
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                Marcar como completado
              </button>
            )}

            {canCancel && (
              <button
                onClick={() => changeStatus('CANCELLED')}
                disabled={working}
                style={{
                  border: '1px solid #efd2cc',
                  borderRadius: 14,
                  padding: '13px 18px',
                  background: '#fff',
                  color: '#9b493e',
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                Cancelar encuentro
              </button>
            )}

           {canReview && (
  <div
    style={{
      width: '100%',
      marginTop: 4,
      padding: 20,
      borderRadius: 20,
      background: '#f8faf7',
      border: '1px solid rgba(18,59,74,0.08)',
    }}
  >
    <div>
      <strong
        style={{
          display: 'block',
          color: '#123b4a',
          fontSize: 17,
        }}
      >
        ⭐ Evalúa tu encuentro
      </strong>

      <p
        style={{
          margin: '6px 0 0',
          color: '#71807c',
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        Cuéntanos cómo fue la experiencia para ayudar a
        mantener NUMAO como una comunidad segura y agradable.
      </p>
    </div>

    <div style={{ marginTop: 18 }}>
      <strong
        style={{
          display: 'block',
          color: '#4c675d',
          fontSize: 13,
        }}
      >
        ¿Cómo fue tu experiencia?
      </strong>

      <div
        style={{
          display: 'flex',
          gap: 6,
          marginTop: 9,
        }}
      >
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => setOverallRating(rating)}
            aria-label={`${rating} estrellas`}
            style={{
              border: 0,
              background: 'transparent',
              padding: 2,
              fontSize: 30,
              lineHeight: 1,
              cursor: 'pointer',
              opacity:
                rating <= overallRating ? 1 : 0.25,
            }}
          >
            ⭐
          </button>
        ))}
      </div>
    </div>

    <div style={{ marginTop: 18 }}>
      <strong
        style={{
          display: 'block',
          color: '#4c675d',
          fontSize: 13,
        }}
      >
        🐾 ¿Cómo se comportó la mascota?
        <span
          style={{
            marginLeft: 6,
            color: '#8a9692',
            fontWeight: 600,
          }}
        >
          opcional
        </span>
      </strong>

      <div
        style={{
          display: 'flex',
          gap: 6,
          marginTop: 9,
        }}
      >
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() =>
              setPetBehaviorRating(rating)
            }
            aria-label={`${rating} estrellas para comportamiento`}
            style={{
              border: 0,
              background: 'transparent',
              padding: 2,
              fontSize: 26,
              lineHeight: 1,
              cursor: 'pointer',
              opacity:
                rating <= petBehaviorRating
                  ? 1
                  : 0.25,
            }}
          >
            ⭐
          </button>
        ))}
      </div>
    </div>

    <div style={{ marginTop: 18 }}>
      <label
        style={{
          display: 'grid',
          gap: 7,
          color: '#4c675d',
          fontSize: 13,
          fontWeight: 800,
        }}
      >
        Comentario
        <span
          style={{
            color: '#8a9692',
            fontWeight: 600,
          }}
        >
          opcional
        </span>

        <textarea
          value={reviewComment}
          onChange={(event) =>
            setReviewComment(event.target.value)
          }
          maxLength={500}
          rows={4}
          placeholder="¿Cómo fue la experiencia?"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            resize: 'vertical',
            border:
              '1px solid rgba(18,59,74,0.12)',
            borderRadius: 12,
            padding: '11px 12px',
            background: '#ffffff',
            color: '#243532',
            fontSize: 13,
            fontFamily: 'inherit',
          }}
        />
      </label>
    </div>

    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 16,
      }}
    >
      <button
        type="button"
        onClick={() => {
          setOverallRating(0);
          setPetBehaviorRating(0);
          setReviewComment('');
          setError('');
        }}
        style={{
          border:
            '1px solid rgba(18,59,74,0.10)',
          borderRadius: 12,
          padding: '10px 15px',
          background: '#ffffff',
          color: '#60716d',
          fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        Limpiar
      </button>

            <button
        type="button"
        onClick={submitReview}
        disabled={overallRating === 0}
        style={{
          border: 0,
          borderRadius: 12,
          padding: '10px 17px',
          background:
            overallRating === 0
              ? '#d9e3d2'
              : '#b8e36b',
          color: '#123b4a',
          fontWeight: 900,
          cursor:
            overallRating === 0
              ? 'default'
              : 'pointer',
        }}
      >
        Enviar evaluación
      </button>
    </div>
  </div>
)}

            <button
              onClick={() =>
                router.push(`/conexiones/${item.connection.id}/mensajes`)
              }
              style={{
                border: '1px solid rgba(18,59,74,0.12)',
                borderRadius: 14,
                padding: '13px 18px',
                background: '#fff',
                color: '#123b4a',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              Volver al chat
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}