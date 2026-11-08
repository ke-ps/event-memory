import { WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormGroup, ValidationErrors } from '@angular/forms';

export function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.length > 0 && control.value.trim().length === 0 ? { blank: true } : null;
}

/** Must be called from a constructor (injection context): uses takeUntilDestroyed(). */
export function clearApiErrorOnEdit(
  form: FormGroup,
  apiFields: Record<string, string>,
  apiErrors: WritableSignal<Record<string, string>>,
): void {
  for (const [controlName, apiField] of Object.entries(apiFields)) {
    form
      .get(controlName)
      ?.valueChanges.pipe(takeUntilDestroyed())
      .subscribe(() => {
        apiErrors.update((errors) =>
          Object.fromEntries(Object.entries(errors).filter(([key]) => key !== apiField)),
        );
      });
  }
}

export function hasVisibleFieldError(
  fieldErrors: Record<string, string>,
  apiFields: Record<string, string>,
): boolean {
  return Object.values(apiFields).some((field) => field in fieldErrors);
}
