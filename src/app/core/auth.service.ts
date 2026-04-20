import { Injectable, computed, inject, signal } from '@angular/core';
import { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Profile } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sb = inject(SupabaseService);

  readonly session = signal<Session | null>(null);
  readonly user = computed<User | null>(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => !!this.session());
  readonly ready = signal(false);

  constructor() {
    this.sb.client.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
      this.ready.set(true);
    });
    this.sb.client.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
    });
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.sb.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async signUp(email: string, password: string, name: string) {
    const { data, error } = await this.sb.client.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
    return data;
  }

  async signOut() {
    await this.sb.client.auth.signOut();
  }

  async getProfile(): Promise<Profile | null> {
    const uid = this.user()?.id;
    if (!uid) return null;
    const { data, error } = await this.sb.client
      .from('profiles')
      .select('id,name,email,avatar_url,nickname')
      .eq('id', uid)
      .maybeSingle();
    if (error) throw error;
    return data as Profile | null;
  }

  async updateProfile(patch: Partial<Profile>): Promise<Profile> {
    const uid = this.user()?.id;
    if (!uid) throw new Error('No autenticado');
    const { data, error } = await this.sb.client
      .from('profiles')
      .update(patch)
      .eq('id', uid)
      .select()
      .single();
    if (error) throw error;
    return data as Profile;
  }

  async uploadAvatar(file: File): Promise<string> {
    const uid = this.user()?.id;
    if (!uid) throw new Error('No autenticado');
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${uid}/${Date.now()}.${ext}`;
    const { error } = await this.sb.client.storage
      .from('avatars')
      .upload(path, file, { upsert: true, cacheControl: '3600' });
    if (error) throw error;
    const { data } = this.sb.client.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  }
}
