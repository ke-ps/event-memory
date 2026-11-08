import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { EventApiService } from '../events/event-api.service';
import { EventDeleteConfirmComponent } from '../events/event-delete-confirm.component';
import { EventPublicationComponent } from '../events/event-publication.component';
import { EventEditFormComponent } from '../events/event-edit-form.component';
import { EventCreateFormComponent } from '../events/event-create-form.component';
import { EventRead } from '../events/event.models';
import { AuthService } from '../services/auth.service';
import { DashboardPageComponent } from './dashboard-page.component';

const event: EventRead = {
  id: 'event-1',
  event_type: 'wedding',
  title: 'Ana y Luis',
  slug: 'ana-y-luis',
  status: 'draft',
  event_date: null,
  start_time: null,
  timezone: 'Europe/Madrid',
  details: { partner_one_name: 'Ana', partner_two_name: 'Luis' },
  locations: [],
  created_at: '2026-11-05T10:00:00Z',
  updated_at: '2026-11-05T10:00:00Z',
};

async function setup(getMine: () => Promise<EventRead | null>) {
  const getMineMock = vi.fn(getMine);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { currentUser: signal({ email: 'a@b.c' }) } },
      {
        provide: EventApiService,
        useValue: {
          getMine: getMineMock,
          create: vi.fn(),
          update: vi.fn(),
          deleteMine: vi.fn(),
          publish: vi.fn(),
          unpublish: vi.fn(),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(DashboardPageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, getMine: getMineMock };
}

function text(fixture: ComponentFixture<DashboardPageComponent>): string {
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

describe('DashboardPageComponent', () => {
  it('shows the create form when the user has no event', async () => {
    const { fixture } = await setup(() => Promise.resolve(null));

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-event-create-form'),
    ).not.toBeNull();
  });

  it('shows the summary when the user has an event', async () => {
    const { fixture } = await setup(() => Promise.resolve(event));

    expect(text(fixture)).toContain('Ana y Luis');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-event-create-form'),
    ).toBeNull();
  });

  it('shows the error and retries loading the event', async () => {
    const { fixture, getMine } = await setup(() =>
      Promise.reject(new HttpErrorResponse({ status: 0 })),
    );

    expect(text(fixture)).toContain('No se pudo conectar con el servidor');
    const retry = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button.retry',
    )!;
    retry.click();
    await fixture.whenStable();

    expect(getMine).toHaveBeenCalledTimes(2);
  });

  it('shows the summary after the form emits created', async () => {
    const { fixture } = await setup(() => Promise.resolve(null));

    fixture.debugElement
      .query((node) => node.componentInstance instanceof EventCreateFormComponent)
      .componentInstance.created.emit(event);
    fixture.detectChanges();

    expect(text(fixture)).toContain('Ana y Luis');
  });

  it('shows the start time in the summary', async () => {
    const { fixture } = await setup(() =>
      Promise.resolve({ ...event, event_date: '2027-06-12', start_time: '18:30:00' }),
    );

    expect(text(fixture).replace(/\s+/g, ' ')).toContain('12 de junio de 2027, 18:30');
  });

  it('shows the start time even when the date is undecided', async () => {
    const { fixture } = await setup(() => Promise.resolve({ ...event, start_time: '18:30:00' }));

    expect(text(fixture).replace(/\s+/g, ' ')).toContain('Fecha por decidir, 18:30');
  });

  it('shows the date without a time suffix when there is no start time', async () => {
    const { fixture } = await setup(() =>
      Promise.resolve({ ...event, event_date: '2027-06-12', start_time: null }),
    );
    const summary = text(fixture).replace(/\s+/g, ' ');

    expect(summary).toContain('12 de junio de 2027');
    expect(summary).not.toContain('12 de junio de 2027,');
  });

  it('opens the edit form from the summary', async () => {
    const { fixture } = await setup(() => Promise.resolve(event));
    const root = fixture.nativeElement as HTMLElement;

    clickEdit(fixture);

    expect(root.querySelector('app-event-edit-form')).not.toBeNull();
    expect(root.querySelector('app-event-summary')).toBeNull();
  });

  it('returns to the summary with the saved event', async () => {
    const { fixture } = await setup(() => Promise.resolve(event));
    clickEdit(fixture);

    editForm(fixture).saved.emit({ ...event, title: 'Nuestra boda' });
    fixture.detectChanges();

    expect(text(fixture)).toContain('Nuestra boda');
    expect((fixture.nativeElement as HTMLElement).querySelector('app-event-edit-form')).toBeNull();
  });

  it('returns to the summary on cancel', async () => {
    const { fixture } = await setup(() => Promise.resolve(event));
    clickEdit(fixture);

    editForm(fixture).cancelled.emit();
    fixture.detectChanges();

    expect(text(fixture)).toContain('Ana y Luis');
    expect((fixture.nativeElement as HTMLElement).querySelector('app-event-edit-form')).toBeNull();
  });

  it('asks for confirmation before deleting', async () => {
    const { fixture } = await setup(() => Promise.resolve(event));
    const root = fixture.nativeElement as HTMLElement;

    clickButton(fixture, 'Eliminar boda');

    expect(root.querySelector('app-event-delete-confirm')).not.toBeNull();
    expect(root.querySelector('app-event-summary')).toBeNull();
  });

  it('returns to the summary when the deletion is cancelled', async () => {
    const { fixture } = await setup(() => Promise.resolve(event));
    clickButton(fixture, 'Eliminar boda');

    deleteConfirm(fixture).cancelled.emit();
    fixture.detectChanges();

    expect(text(fixture)).toContain('Ana y Luis');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-event-delete-confirm'),
    ).toBeNull();
  });

  it('shows the create form after deleting the event', async () => {
    const { fixture } = await setup(() => Promise.resolve(event));
    clickButton(fixture, 'Eliminar boda');

    deleteConfirm(fixture).deleted.emit();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-event-create-form')).not.toBeNull();
    expect(text(fixture)).not.toContain('Ana y Luis');
  });

  it('publishing updates the summary', async () => {
    const { fixture } = await setup(() => Promise.resolve(event));

    fixture.debugElement
      .query(By.directive(EventPublicationComponent))
      .componentInstance.changed.emit({ ...event, status: 'published' });
    fixture.detectChanges();

    expect(text(fixture)).toContain('Publicada');
  });
});

function clickButton(fixture: ComponentFixture<DashboardPageComponent>, label: string): void {
  const button = Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
  ).find((b) => b.textContent?.trim() === label)!;
  button.click();
  fixture.detectChanges();
}

function clickEdit(fixture: ComponentFixture<DashboardPageComponent>): void {
  clickButton(fixture, 'Editar');
}

function deleteConfirm(fixture: ComponentFixture<DashboardPageComponent>) {
  return fixture.debugElement.query(By.directive(EventDeleteConfirmComponent))
    .componentInstance as EventDeleteConfirmComponent;
}

function editForm(fixture: ComponentFixture<DashboardPageComponent>) {
  return fixture.debugElement.query(By.directive(EventEditFormComponent))
    .componentInstance as EventEditFormComponent;
}
