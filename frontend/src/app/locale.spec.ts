import { formatDate } from '@angular/common';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

describe('application locale', () => {
  it('uses Spanish as the locale', () => {
    expect(TestBed.inject(LOCALE_ID)).toBe('es');
  });

  it('formats dates in Spanish', () => {
    const locale = TestBed.inject(LOCALE_ID);

    expect(formatDate('2026-11-04', 'longDate', locale)).toBe('4 de noviembre de 2026');
  });
});
