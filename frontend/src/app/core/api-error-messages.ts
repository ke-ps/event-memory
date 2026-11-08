import { HttpErrorResponse } from '@angular/common/http';

interface ApiFieldError {
  field: string;
  code: string;
}

interface ApiErrorBody {
  code?: string;
  errors?: ApiFieldError[];
}

const messages: Record<string, () => string> = {
  event_already_exists: () => $localize`:@@errors.event_already_exists:Ya tienes una boda creada.`,
  unsupported_event_type: () =>
    $localize`:@@errors.unsupported_event_type:Este tipo de evento todavía no está disponible.`,
  validation_error: () => $localize`:@@errors.validation_error:Revisa los datos del formulario.`,
  event_not_found: () => $localize`:@@errors.event_not_found:Todavía no has creado tu boda.`,
  missing_token: () =>
    $localize`:@@errors.missing_token:Tu sesión ha caducado. Vuelve a iniciar sesión.`,
  invalid_token: () =>
    $localize`:@@errors.invalid_token:Tu sesión ha caducado. Vuelve a iniciar sesión.`,
  auth_unavailable: () =>
    $localize`:@@errors.auth_unavailable:El servicio de autenticación no está disponible. Inténtalo más tarde.`,
  slug_taken: () => $localize`:@@errors.slug_taken:Esa dirección ya está en uso.`,
  slug_locked: () =>
    $localize`:@@errors.slug_locked:Para cambiar la dirección, despublica la boda.`,
  event_date_required: () =>
    $localize`:@@errors.event_date_required:Añade la fecha para poder publicar.`,
  slug_conflict: () =>
    $localize`:@@errors.slug_conflict:No se pudo generar la dirección de tu boda. Inténtalo de nuevo.`,
};

const networkMessage = () =>
  $localize`:@@errors.network:No se pudo conectar con el servidor. Comprueba tu conexión.`;
const unknownMessage = () =>
  $localize`:@@errors.unknown:Ha ocurrido un error inesperado. Inténtalo de nuevo.`;

function fieldMessage(code: string): string {
  switch (code) {
    case 'string_too_short':
    case 'missing':
      return $localize`:@@errors.field.required:Este campo es obligatorio.`;
    case 'string_too_long':
      return $localize`:@@errors.field.tooLong:El texto es demasiado largo.`;
    case 'slug_taken':
      return $localize`:@@errors.field.slug_taken:Esa dirección ya está en uso.`;
    case 'slug_locked':
      return $localize`:@@errors.field.slug_locked:Para cambiar la dirección, despublica la boda.`;
    case 'event_date_required':
      return $localize`:@@errors.field.event_date_required:Añade la fecha para poder publicar.`;
    case 'string_pattern_mismatch':
      return $localize`:@@errors.field.slug_pattern:Usa solo minúsculas, números y guiones.`;
    default:
      return $localize`:@@errors.field.invalid:El valor no es válido.`;
  }
}

function errorBody(error: unknown): ApiErrorBody | null {
  if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
    return error.error as ApiErrorBody;
  }
  return null;
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 0) {
    return networkMessage();
  }
  const code = errorBody(error)?.code;
  const message = code ? messages[code] : undefined;
  return message ? message() : unknownMessage();
}

export function apiFieldErrors(error: unknown): Record<string, string> {
  const body = errorBody(error);
  if (!Array.isArray(body?.errors)) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const { field, code } of body.errors ?? []) {
    result[field] = fieldMessage(code);
  }
  return result;
}
