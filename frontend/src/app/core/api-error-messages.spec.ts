import { HttpErrorResponse } from '@angular/common/http';

import { apiErrorMessage, apiFieldErrors } from './api-error-messages';

const httpError = (status: number, body: unknown) => new HttpErrorResponse({ status, error: body });

describe('apiErrorMessage', () => {
  it('returns the translated message for a known code', () => {
    const error = httpError(409, { code: 'event_already_exists', message: 'x' });

    expect(apiErrorMessage(error)).toBe('Ya tienes una boda creada.');
  });

  it('returns the generic message for an unknown code', () => {
    const error = httpError(418, { code: 'teapot', message: 'x' });

    expect(apiErrorMessage(error)).toBe('Ha ocurrido un error inesperado. Inténtalo de nuevo.');
  });

  it('returns the network message when the server is unreachable', () => {
    const error = httpError(0, null);

    expect(apiErrorMessage(error)).toBe(
      'No se pudo conectar con el servidor. Comprueba tu conexión.',
    );
  });

  it('returns the generic message for a non-HTTP error', () => {
    expect(apiErrorMessage(new Error('boom'))).toBe(
      'Ha ocurrido un error inesperado. Inténtalo de nuevo.',
    );
  });
});

describe('apiFieldErrors', () => {
  it('maps validation errors to a message per field', () => {
    const error = httpError(422, {
      code: 'validation_error',
      message: 'x',
      errors: [
        { field: 'details.partner_one_name', code: 'string_too_short' },
        { field: 'details.partner_two_name', code: 'string_too_long' },
        { field: 'event_date', code: 'date_from_datetime_parsing' },
      ],
    });

    expect(apiFieldErrors(error)).toEqual({
      'details.partner_one_name': 'Este campo es obligatorio.',
      'details.partner_two_name': 'El texto es demasiado largo.',
      event_date: 'El valor no es válido.',
    });
  });

  it('returns an empty object for other errors', () => {
    const error = httpError(409, { code: 'event_already_exists', message: 'x' });

    expect(apiFieldErrors(error)).toEqual({});
    expect(apiFieldErrors(new Error('boom'))).toEqual({});
  });
});
