import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Profile } from '../../core/models';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './profile-edit.html',
})
export class ProfileEditPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly profile = signal<Profile | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    nickname: [''],
  });

  constructor() {
    this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      const p = await this.auth.getProfile();
      this.profile.set(p);
      if (p) {
        this.form.reset({
          name: p.name ?? '',
          nickname: p.nickname ?? '',
        });
      }
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error');
    } finally {
      this.loading.set(false);
    }
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.info.set(null);
    try {
      const v = this.form.getRawValue();
      const updated = await this.auth.updateProfile({
        name: v.name,
        nickname: v.nickname || null,
      });
      this.profile.set(updated);
      this.info.set('Perfil actualizado.');
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error');
    } finally {
      this.saving.set(false);
    }
  }

  async onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.error.set(null);
    try {
      const url = await this.auth.uploadAvatar(file);
      const updated = await this.auth.updateProfile({ avatar_url: url });
      this.profile.set(updated);
      this.info.set('Foto actualizada.');
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error');
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }

  initial(): string {
    const p = this.profile();
    const n = p?.nickname || p?.name || p?.email || '?';
    return n.charAt(0).toUpperCase();
  }
}
