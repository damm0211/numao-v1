'use client';

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  API_URL,
  API_ORIGIN,
} from '../../../../lib/config';

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

interface PetForm {
  name: string;
  birthDate: string;
  breed: string;
  size: string;
  energyLevel: number;
  sociability: number;
  playfulness: number;
  bio: string;
}

interface PetPhoto {
  id: string;
  petId: string;
  storageKey: string;
  sortOrder: number;
  createdAt: string;
}

export default function EditPetPage() {
  const router = useRouter();
  const params = useParams();

  const petId = params.id as string;

  const [form, setForm] = useState<PetForm>({
    name: '',
    birthDate: '',
    breed: '',
    size: '',
    energyLevel: 3,
    sociability: 3,
    playfulness: 3,
    bio: '',
  });

  const [photos, setPhotos] = useState<PetPhoto[]>([]);
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);
  const [previewUrl, setPreviewUrl] =
    useState<string>('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);
  const [deletingPhotoId, setDeletingPhotoId] =
    useState<string | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [photoError, setPhotoError] =
    useState('');
  const [photoSuccess, setPhotoSuccess] =
    useState('');

  useEffect(() => {
    async function loadPet() {
      try {
        const token =
          localStorage.getItem(
            'numao_access_token',
          );

        if (!token) {
          router.push('/login');
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [
          petResponse,
          photosResponse,
        ] = await Promise.all([
          fetch(`${API_URL}/pets/${petId}`, {
            method: 'GET',
            headers,
            cache: 'no-store',
          }),

          fetch(
            `${API_URL}/pets/${petId}/photos`,
            {
              method: 'GET',
              headers,
              cache: 'no-store',
            },
          ),
        ]);

        const data: Pet =
          await petResponse.json();

        if (!petResponse.ok) {
          const petErrorData =
            data as unknown as {
              message?:
                | string
                | string[];
            };

          const message = Array.isArray(
            petErrorData.message,
          )
            ? petErrorData.message.join(
                ', ',
              )
            : petErrorData.message ||
              'No fue posible cargar la mascota.';

          throw new Error(message);
        }

        setForm({
          name: data.name || '',
          birthDate: data.birthDate
            ? data.birthDate.substring(0, 10)
            : '',
          breed: data.breed || '',
          size: data.size || '',
          energyLevel:
            data.energyLevel ?? 3,
          sociability:
            data.sociability ?? 3,
          playfulness:
            data.playfulness ?? 3,
          bio: data.bio || '',
        });

        if (photosResponse.ok) {
          const photosData =
            await photosResponse.json();

          setPhotos(
            Array.isArray(photosData)
              ? photosData
              : [],
          );
        } else {
          setPhotos([]);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Ocurrió un error al cargar la mascota.',
        );
      } finally {
        setLoading(false);
      }
    }

    if (petId) {
      loadPet();
    }
  }, [petId, router]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleChange(
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } =
      event.target;

    setForm((current) => ({
      ...current,
      [name]:
        name === 'energyLevel' ||
        name === 'sociability' ||
        name === 'playfulness'
          ? Number(value)
          : value,
    }));

    setSuccess('');
    setError('');
  }

  function getTraitLabel(
    value: number,
    labels: string[],
  ) {
    const level = Math.min(
      5,
      Math.max(1, Math.round(value)),
    );

    return labels[level - 1];
  }

  function renderTraitControl(
    field:
      | 'energyLevel'
      | 'sociability'
      | 'playfulness',
    value: number,
    labels: string[],
  ) {
    const level = Math.min(
      5,
      Math.max(1, Math.round(value)),
    );

    return (
      <div
        role="group"
        aria-label={`Nivel ${field}`}
        style={{
          display: 'flex',
          gap: '6px',
          marginTop: '10px',
        }}
      >
        {Array.from({ length: 5 }).map(
          (_, index) => {
            const segmentLevel = index + 1;
            const selected =
              segmentLevel <= level;

            return (
              <button
                key={segmentLevel}
                type="button"
                aria-label={`Nivel ${segmentLevel} de 5`}
                aria-pressed={selected}
                onClick={() => {
                  setForm((current) => ({
                    ...current,
                    [field]: segmentLevel,
                  }));
                  setSuccess('');
                  setError('');
                }}
                style={{
                  flex: 1,
                  height: '10px',
                  minWidth: 0,
                  padding: 0,
                  border: 0,
                  borderRadius: '999px',
                  background: selected
                    ? '#b8e36b'
                    : '#e5ebe7',
                  cursor: 'pointer',
                  transition:
                    'background .18s ease, transform .18s ease',
                }}
              />
            );
          },
        )}

        <span
          style={{
            marginLeft: '4px',
            minWidth: '62px',
            textAlign: 'right',
            color: '#55752e',
            fontSize: '12px',
            fontWeight: 800,
          }}
        >
          {getTraitLabel(value, labels)} · {level}/5
        </span>
      </div>
    );
  }

  function getPhotoUrl(
    storageKey: string,
  ) {
    if (
      storageKey.startsWith(
        'http://',
      ) ||
      storageKey.startsWith(
        'https://',
      )
    ) {
      return storageKey;
    }

    const normalizedKey =
      storageKey.startsWith('/')
        ? storageKey.slice(1)
        : storageKey;

    return `${API_ORIGIN}/uploads/${normalizedKey}`;
  }

  function handlePhotoSelect(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setPhotoError('');
    setPhotoSuccess('');

    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (
      !allowedTypes.includes(
        file.type,
      )
    ) {
      setPhotoError(
        'Solo se permiten imágenes JPG, PNG o WEBP.',
      );

      event.target.value = '';
      return;
    }

    if (
      file.size >
      8 * 1024 * 1024
    ) {
      setPhotoError(
        'La fotografía no puede superar los 8 MB.',
      );

      event.target.value = '';
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl,
      );
    }

    const newPreviewUrl =
      URL.createObjectURL(file);

    setSelectedFile(file);
    setPreviewUrl(
      newPreviewUrl,
    );
  }

  function clearSelectedPhoto() {
    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl,
      );
    }

    setSelectedFile(null);
    setPreviewUrl('');
    setPhotoError('');
  }

  async function uploadPhoto() {
    if (!selectedFile) {
      setPhotoError(
        'Selecciona una fotografía primero.',
      );
      return;
    }

    setPhotoError('');
    setPhotoSuccess('');
    setUploadingPhoto(true);

    try {
      const token =
        localStorage.getItem(
          'numao_access_token',
        );

      if (!token) {
        router.push('/login');
        return;
      }

      const formData =
        new FormData();

      formData.append(
        'file',
        selectedFile,
      );

      const response =
        await fetch(
          `${API_URL}/pets/${petId}/photos`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        const message =
          Array.isArray(
            data.message,
          )
            ? data.message.join(
                ', ',
              )
            : data.message ||
              'No fue posible subir la fotografía.';

        throw new Error(message);
      }

      setPhotos((current) => [
        ...current,
        data,
      ]);

      clearSelectedPhoto();

      setPhotoSuccess(
        'Fotografía actualizada correctamente.',
      );
    } catch (err) {
      setPhotoError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al subir la fotografía.',
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function deletePhoto(
    photoId: string,
  ) {
    const confirmed =
      window.confirm(
        '¿Quieres eliminar esta fotografía del perfil?',
      );

    if (!confirmed) {
      return;
    }

    setPhotoError('');
    setPhotoSuccess('');
    setDeletingPhotoId(photoId);

    try {
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
          `${API_URL}/pets/${petId}/photos/${photoId}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        const message =
          Array.isArray(
            data.message,
          )
            ? data.message.join(
                ', ',
              )
            : data.message ||
              'No fue posible eliminar la fotografía.';

        throw new Error(message);
      }

      setPhotos((current) =>
        current.filter(
          (photo) =>
            photo.id !== photoId,
        ),
      );

      setPhotoSuccess(
        'Fotografía eliminada correctamente.',
      );
    } catch (err) {
      setPhotoError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al eliminar la fotografía.',
      );
    } finally {
      setDeletingPhotoId(null);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError('');
    setSuccess('');
    setSaving(true);

    try {
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
          `${API_URL}/pets/${petId}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify(
              form,
            ),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        const message =
          Array.isArray(
            data.message,
          )
            ? data.message.join(
                ', ',
              )
            : data.message ||
              'No fue posible guardar los cambios.';

        throw new Error(message);
      }

      setSuccess(
        'Perfil actualizado correctamente.',
      );

      setTimeout(() => {
        router.push(
          `/mascotas/${petId}`,
        );
      }, 700);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al guardar los cambios.',
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
          <p>
            Cargando perfil…
          </p>
        </div>
      </main>
    );
  }

  const orderedPhotos =
    [...photos].sort(
      (a, b) =>
        a.sortOrder -
        b.sortOrder,
    );

  return (
    <main className="shell petsShell">
      <header className="topBar">
        <button
          type="button"
          className="logoButton"
          onClick={() =>
            router.push('/')
          }
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
              '/mis-mascotas',
            )
          }
        >
          Mis mascotas
        </button>
      </header>

      <section className="petsContainer">
        <button
          type="button"
          className="backLink"
          onClick={() =>
            router.push(
              `/mascotas/${petId}`,
            )
          }
        >
          ← Volver al perfil
        </button>

        <div className="editHeader">
          <p className="eyebrow">
            PERFIL DE MASCOTA
          </p>

          <h1 className="editTitle">
            Editar perfil
          </h1>

          <p className="editDescription">
            Mantén actualizada la
            información de tu mascota
            para que NUMAO pueda
            encontrar conexiones más
            compatibles.
          </p>
        </div>

        <section className="editCard">
          <form
            onSubmit={handleSubmit}
          >
            <div className="formSection">
              <p className="sectionLabel">
                Fotografía
              </p>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {orderedPhotos.length >
                0 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'minmax(180px, 280px)',
                      gap: '16px',
                    }}
                  >
                    {orderedPhotos.map(
                      (photo) => (
                        <div
                          key={photo.id}
                          style={{
                            position:
                              'relative',
                            overflow:
                              'hidden',
                            borderRadius:
                              '18px',
                            border:
                              '1px solid #e1e7e3',
                            background:
                              '#f4f6f5',
                          }}
                        >
                          <div
                            style={{
                              width:
                                '100%',
                              aspectRatio:
                                '1 / 1',
                              display:
                                'flex',
                              alignItems:
                                'center',
                              justifyContent:
                                'center',
                              background:
                                '#f4f6f5',
                            }}
                          >
                            <img
                              src={getPhotoUrl(
                                photo.storageKey,
                              )}
                              alt="Fotografía de la mascota"
                              style={{
                                width:
                                  '100%',
                                height:
                                  '100%',
                                objectFit:
                                  'contain',
                                display:
                                  'block',
                              }}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              deletePhoto(
                                photo.id,
                              )
                            }
                            disabled={
                              deletingPhotoId ===
                              photo.id
                            }
                            style={{
                              position:
                                'absolute',
                              right:
                                '10px',
                              top:
                                '10px',
                              border:
                                'none',
                              borderRadius:
                                '999px',
                              padding:
                                '8px 12px',
                              background:
                                'rgba(255,255,255,0.94)',
                              color:
                                '#9b3434',
                              fontSize:
                                '13px',
                              fontWeight:
                                600,
                              cursor:
                                deletingPhotoId ===
                                photo.id
                                  ? 'default'
                                  : 'pointer',
                              boxShadow:
                                '0 4px 14px rgba(0,0,0,0.12)',
                            }}
                          >
                            {deletingPhotoId ===
                            photo.id
                              ? 'Eliminando…'
                              : 'Eliminar'}
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '420px',
                      minHeight:
                        '180px',
                      border:
                        '1px dashed #cbd6cf',
                      borderRadius:
                        '18px',
                      background:
                        '#f7f9f8',
                      display:
                        'flex',
                      alignItems:
                        'center',
                      justifyContent:
                        'center',
                      textAlign:
                        'center',
                      padding:
                        '24px',
                      color:
                        '#748078',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize:
                            '38px',
                          marginBottom:
                            '10px',
                        }}
                      >
                        📷
                      </div>

                      <strong
                        style={{
                          display:
                            'block',
                          color:
                            '#3c4942',
                          marginBottom:
                            '5px',
                        }}
                      >
                        Sin fotografía
                      </strong>

                      <span
                        style={{
                          fontSize:
                            '14px',
                        }}
                      >
                        Agrega una foto
                        para completar
                        el perfil de tu
                        mascota.
                      </span>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    maxWidth: '420px',
                  }}
                >
                  <label
                    htmlFor="petPhoto"
                    style={{
                      display:
                        'inline-flex',
                      alignItems:
                        'center',
                      justifyContent:
                        'center',
                      minHeight:
                        '46px',
                      padding:
                        '0 18px',
                      borderRadius:
                        '12px',
                      border:
                        '1px solid #d8e1db',
                      background:
                        '#ffffff',
                      color:
                        '#294335',
                      fontWeight:
                        600,
                      cursor:
                        'pointer',
                    }}
                  >
                    {selectedFile
                      ? 'Cambiar fotografía'
                      : photos.length > 0
                        ? 'Reemplazar fotografía'
                        : 'Seleccionar fotografía'}

                    <input
                      id="petPhoto"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={
                        handlePhotoSelect
                      }
                      style={{
                        display:
                          'none',
                      }}
                    />
                  </label>

                  {selectedFile && (
                    <div
                      style={{
                        border:
                          '1px solid #dfe7e2',
                        borderRadius:
                          '16px',
                        padding:
                          '12px',
                        background:
                          '#f8faf9',
                      }}
                    >
                      <p
                        style={{
                          margin:
                            '0 0 10px',
                          fontSize:
                            '13px',
                          color:
                            '#66736c',
                        }}
                      >
                        Vista previa
                      </p>

                      <div
                        style={{
                          width:
                            '100%',
                          aspectRatio:
                            '16 / 10',
                          borderRadius:
                            '12px',
                          overflow:
                            'hidden',
                          background:
                            '#eef2ef',
                          display:
                            'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'center',
                        }}
                      >
                        {previewUrl && (
                          <img
                            src={
                              previewUrl
                            }
                            alt="Vista previa de la nueva fotografía"
                            style={{
                              width:
                                '100%',
                              height:
                                '100%',
                              objectFit:
                                'contain',
                              display:
                                'block',
                            }}
                          />
                        )}
                      </div>

                      <p
                        style={{
                          margin:
                            '10px 0 0',
                          fontSize:
                            '13px',
                          color:
                            '#66736c',
                          wordBreak:
                            'break-word',
                        }}
                      >
                        {
                          selectedFile.name
                        }
                      </p>

                      <div
                        style={{
                          display:
                            'flex',
                          gap: '10px',
                          marginTop:
                            '12px',
                        }}
                      >
                        <button
                          type="button"
                          className="primaryButton"
                          onClick={
                            uploadPhoto
                          }
                          disabled={
                            uploadingPhoto
                          }
                        >
                          {uploadingPhoto
                            ? 'Subiendo…'
                            : 'Guardar fotografía'}
                        </button>

                        <button
                          type="button"
                          className="secondaryButton"
                          onClick={
                            clearSelectedPhoto
                          }
                          disabled={
                            uploadingPhoto
                          }
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  <p
                    style={{
                      margin: 0,
                      fontSize: '13px',
                      color: '#7a857f',
                      lineHeight: 1.5,
                    }}
                  >
                    JPG, PNG o WEBP.
                    Máximo 8 MB.
                  </p>
                </div>

                {photoError && (
                  <p
                    role="alert"
                    className="error"
                  >
                    {photoError}
                  </p>
                )}

                {photoSuccess && (
                  <p
                    role="status"
                    className="successMessage"
                  >
                    {photoSuccess}
                  </p>
                )}
              </div>
            </div>

            <div className="formSection">
              <p className="sectionLabel">
                Información básica
              </p>

              <label>
                Nombre
                <input
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={
                    handleChange
                  }
                  required
                  minLength={2}
                  placeholder="Nombre de tu mascota"
                />
              </label>

              <label>
                Fecha de nacimiento
                <input
                  name="birthDate"
                  type="date"
                  value={
                    form.birthDate
                  }
                  onChange={
                    handleChange
                  }
                  required
                />
              </label>

              <label>
                Raza
                <input
                  name="breed"
                  type="text"
                  value={form.breed}
                  onChange={
                    handleChange
                  }
                  placeholder="Ej. Mestiza, Labrador..."
                />
              </label>

              <label>
                Tamaño
                <select
                  name="size"
                  value={form.size}
                  onChange={
                    handleChange
                  }
                >
                  <option value="">
                    Selecciona un tamaño
                  </option>

                  <option value="SMALL">
                    Pequeña
                  </option>

                  <option value="MEDIUM">
                    Mediana
                  </option>

                  <option value="LARGE">
                    Grande
                  </option>
                </select>
              </label>
            </div>

            <div className="formSection">
              <p className="sectionLabel">
                Personalidad
              </p>

              <div className="rangeGroup">
                <div className="rangeHeader">
                  <label>
                    Energía
                  </label>
                </div>

                {renderTraitControl(
                  'energyLevel',
                  form.energyLevel,
                  [
                    'Muy baja',
                    'Baja',
                    'Media',
                    'Alta',
                    'Muy alta',
                  ],
                )}
              </div>

              <div className="rangeGroup">
                <div className="rangeHeader">
                  <label>
                    Sociabilidad
                  </label>
                </div>

                {renderTraitControl(
                  'sociability',
                  form.sociability,
                  [
                    'Muy baja',
                    'Baja',
                    'Media',
                    'Alta',
                    'Muy alta',
                  ],
                )}
              </div>

              <div className="rangeGroup">
                <div className="rangeHeader">
                  <label>
                    Juego
                  </label>
                </div>

                {renderTraitControl(
                  'playfulness',
                  form.playfulness,
                  [
                    'Muy bajo',
                    'Bajo',
                    'Medio',
                    'Alto',
                    'Muy alto',
                  ],
                )}
              </div>
            </div>

            <div className="formSection">
              <p className="sectionLabel">
                Sobre tu mascota
              </p>

              <label>
                Biografía
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={
                    handleChange
                  }
                  rows={5}
                  maxLength={500}
                  placeholder="Cuéntanos un poco sobre su personalidad..."
                />
              </label>

              <p className="characterHint">
                {form.bio.length}/500
                caracteres
              </p>
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
                  router.push(
                    `/mascotas/${petId}`,
                  )
                }
                disabled={
                  saving ||
                  uploadingPhoto
                }
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="primaryButton"
                disabled={
                  saving ||
                  uploadingPhoto
                }
              >
                {saving
                  ? 'Guardando…'
                  : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}