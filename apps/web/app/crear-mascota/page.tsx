'use client';
import { CHILEAN_COMMUNES, DOG_BREEDS } from "../../lib/pet-options";
import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '../../lib/config';
const MAX_PHOTOS = 5;

type PreferenceKey = 'play' | 'walk' | 'socialize' | 'reproduction';

const preferenceOptions: Array<{
  key: PreferenceKey;
  icon: string;
  title: string;
  description: string;
}> = [
  { key: 'play', icon: '🎾', title: 'Jugar', description: 'Compartir juegos y energía.' },
  { key: 'walk', icon: '🐕', title: 'Pasear', description: 'Salir y pasear juntos.' },
  { key: 'socialize', icon: '🤝', title: 'Socializar', description: 'Conocer otros perros.' },
  { key: 'reproduction', icon: '❤️', title: 'Reproducción', description: 'Buscar una conexión reproductiva.' },
];

export default function CrearMascotaPage() {
  const router = useRouter();

 const [form, setForm] = useState({
   name: '',
   birthDate: '',
   sex: '',
   commune: '',
   breed: '',
   size: '',
   energyLevel: '',
   sociability: '',
   playfulness: '',
   bio: '',
 });

  const [preferences, setPreferences] = useState<Record<PreferenceKey, boolean>>({
    play: false,
    walk: false,
    socialize: false,
    reproduction: false,
  });

  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedPreferenceCount = useMemo(
    () => Object.values(preferences).filter(Boolean).length,
    [preferences],
  );

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function togglePreference(key: PreferenceKey) {
    setPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));
    setError('');
  }

  function renderTraitSelector(
    name: 'energyLevel' | 'sociability' | 'playfulness',
    value: string,
    labels: string[],
  ) {
    const level = value ? Number(value) : 0;

    return (
      <div style={{ marginTop: 8 }}>
        <div
          role="radiogroup"
          aria-label={name}
          style={{
            display: 'flex',
            gap: 6,
            width: '100%',
          }}
        >
          {Array.from({ length: 5 }).map((_, index) => {
            const segmentLevel = index + 1;
            const selected = level === segmentLevel;

            return (
              <button
                key={segmentLevel}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${segmentLevel} de 5: ${labels[index]}`}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    [name]: String(segmentLevel),
                  }))
                }
                disabled={loading}
                style={{
                  flex: 1,
                  height: 12,
                  border: 0,
                  borderRadius: 999,
                  padding: 0,
                  background:
                    segmentLevel <= level ? '#b8e36b' : '#e5ebe7',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background .18s ease, transform .18s ease',
                  transform: selected ? 'scaleY(1.25)' : 'none',
                }}
              />
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            marginTop: 8,
            color: '#71807d',
            fontSize: 11,
          }}
        >
          <span>{level ? labels[level - 1] : 'Selecciona un nivel'}</span>
          <span>{level ? `${level}/5` : '—'}</span>
        </div>
      </div>
    );
  }

  function handlePhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    const selected = files
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, MAX_PHOTOS - photos.length);

    const urls = selected.map((file) => URL.createObjectURL(file));

    setPhotos([...photos, ...selected]);
    setPreviews([...previews, ...urls]);
    event.target.value = '';
  }

  function removePhoto(index: number) {
    const newPhotos = [...photos];
    const newPreviews = [...previews];
    URL.revokeObjectURL(newPreviews[index]);
    newPhotos.splice(index, 1);
    newPreviews.splice(index, 1);
    setPhotos(newPhotos);
    setPreviews(newPreviews);
  }

  async function uploadPhotos(petId: string, token: string) {
    for (const file of photos) {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/pets/${petId}/photos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('No fue posible subir una fotografía.');
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (selectedPreferenceCount === 0) {
      setError('Selecciona al menos una preferencia de conexión.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('numao_access_token');

      if (!token) {
        router.push('/login');
        return;
      }

      const body = {
        name: form.name,
        birthDate: form.birthDate,
        sex: form.sex,
        commune: form.commune.trim(),
        breed: form.breed || undefined,
        size: form.size || undefined,
        energyLevel: form.energyLevel ? Number(form.energyLevel) : undefined,
        sociability: form.sociability ? Number(form.sociability) : undefined,
        playfulness: form.playfulness ? Number(form.playfulness) : undefined,
        bio: form.bio || undefined,
        preferences,
      };

      const response = await fetch(`${API_URL}/pets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = Array.isArray(data?.message)
          ? data.message.join(', ')
          : data?.message || 'No fue posible crear la mascota.';
        throw new Error(message);
      }

      if (photos.length > 0) {
        await uploadPhotos(data.id, token);
      }

      localStorage.setItem('numao_active_pet_id', data.id);
      router.push('/mis-mascotas');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Ocurrió un error al crear el perfil.',
      );
    } finally {
      setLoading(false);
    }
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
          onClick={() => router.push('/mis-mascotas')}
        >
          ← Volver a mis mascotas
        </button>

        <section className="card" style={{ maxWidth: 760, margin: '0 auto' }}>
          <p className="eyebrow">NUEVO PERFIL</p>
          <h1>Cuéntanos sobre tu mascota.</h1>
          <p>
            Completa sus datos, agrega fotografías y deja configuradas sus preferencias
            desde el primer momento.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="formSection">
              <p className="sectionLabel">Fotografías</p>

              <label>
                Agregar fotografías
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handlePhotos}
                  disabled={photos.length >= MAX_PHOTOS || loading}
                />
              </label>

              {previews.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: 12,
                    marginTop: 14,
                  }}
                >
                  {previews.map((preview, index) => (
                    <div
                      key={preview}
                      style={{
                        position: 'relative',
                        overflow: 'hidden',
                        borderRadius: 16,
                        border: '1px solid rgba(0,0,0,.08)',
                        background: '#f5f7f5',
                      }}
                    >
                      <img
                        src={preview}
                        alt={`Vista previa ${index + 1}`}
                        style={{
                          display: 'block',
                          width: '100%',
                          aspectRatio: '1',
                          objectFit: 'cover',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        style={{
                          position: 'absolute',
                          right: 7,
                          top: 7,
                          border: 0,
                          borderRadius: 999,
                          padding: '5px 8px',
                          background: 'rgba(0,0,0,.72)',
                          color: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="formSection">
              <p className="sectionLabel">Datos básicos</p>

              <label>
                Nombre
                <input name="name" value={form.name} onChange={handleChange} required />
              </label>

              <label>
  Fecha de nacimiento
  <input
    name="birthDate"
    type="date"
    value={form.birthDate}
    onChange={handleChange}
    required
  />
</label>

<label>
  Sexo
  <select
    name="sex"
    value={form.sex}
    onChange={handleChange}
    required
  >
    <option value="">Seleccionar</option>
    <option value="MALE">Macho</option>
    <option value="FEMALE">Hembra</option>
  </select>
</label>

<label>
  Comuna
  <select
    name="commune"
    value={form.commune}
    onChange={handleChange}
    required
  >
    <option value="">Seleccionar comuna</option>
    {CHILEAN_COMMUNES.map((commune) => (
      <option key={commune} value={commune}>
        {commune}
      </option>
    ))}
  </select>
</label>

<label>
  Raza
  <select
    name="breed"
    value={form.breed}
    onChange={handleChange}
  >
    <option value="">Seleccionar raza</option>
    {DOG_BREEDS.map((breed) => (
      <option key={breed} value={breed}>
        {breed}
      </option>
    ))}
  </select>
</label>
              <label>
                Tamaño
                <select name="size" value={form.size} onChange={handleChange}>
                  <option value="">Seleccionar</option>
                  <option value="SMALL">Pequeño</option>
                  <option value="MEDIUM">Mediano</option>
                  <option value="LARGE">Grande</option>
                </select>
              </label>
            </div>

            <div className="formSection">
              <p className="sectionLabel">Personalidad</p>

              <label>
                Nivel de energía
                {renderTraitSelector(
                  'energyLevel',
                  form.energyLevel,
                  ['Muy baja', 'Baja', 'Media', 'Alta', 'Muy alta'],
                )}
              </label>

              <label>
                Sociabilidad
                {renderTraitSelector(
                  'sociability',
                  form.sociability,
                  ['Muy baja', 'Baja', 'Media', 'Alta', 'Muy alta'],
                )}
              </label>

              <label>
                Ganas de jugar
                {renderTraitSelector(
                  'playfulness',
                  form.playfulness,
                  ['Muy bajas', 'Bajas', 'Medias', 'Altas', 'Muy altas'],
                )}
              </label>
            </div>

            <div className="formSection">
              <p className="sectionLabel">Sobre tu mascota</p>

              <label>
                Descripción
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  rows={5}
                  maxLength={500}
                  placeholder="Cuéntanos un poco sobre su personalidad..."
                />
              </label>
              <p className="characterHint">{form.bio.length}/500 caracteres</p>
            </div>

            <div className="formSection">
              <p className="sectionLabel">Preferencias de conexión</p>
              <p style={{ marginTop: 0, color: '#71807d', lineHeight: 1.6 }}>
                Selecciona qué tipo de conexiones buscas. Puedes modificar estas opciones
                más adelante desde el perfil.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: 10,
                }}
              >
                {preferenceOptions.map((option) => {
                  const selected = preferences[option.key];
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => togglePreference(option.key)}
                      aria-pressed={selected}
                      style={{
                        textAlign: 'left',
                        border: selected ? '2px solid #b8e36b' : '1px solid #e2e8e4',
                        borderRadius: 18,
                        padding: '15px 16px',
                        background: selected ? '#f3f9e8' : '#fff',
                        cursor: 'pointer',
                        transition: 'all .18s ease',
                        boxShadow: selected ? '0 10px 25px rgba(18,59,74,.08)' : 'none',
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{option.icon}</span>
                      <strong style={{ display: 'block', marginTop: 7 }}>{option.title}</strong>
                      <span style={{ display: 'block', marginTop: 4, color: '#71807d', fontSize: 13 }}>
                        {option.description}
                      </span>
                      <span style={{ display: 'block', marginTop: 9, color: selected ? '#55752e' : '#9aa4a1', fontSize: 12, fontWeight: 800 }}>
                        {selected ? '✓ Seleccionado' : 'Seleccionar'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="characterHint" style={{ marginTop: 10 }}>
                {selectedPreferenceCount} seleccionada{selectedPreferenceCount === 1 ? '' : 's'}
              </p>
            </div>

            {error && <p role="alert" className="error">{error}</p>}

            <button type="submit" className="primaryButton" disabled={loading}>
              {loading ? 'Creando perfil...' : 'Crear perfil y comenzar'}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}

