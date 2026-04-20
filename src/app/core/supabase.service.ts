import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { environment } from '../../../src/environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly platformId = inject(PLATFORM_ID);
  readonly client: SupabaseClient;

  constructor() {
    const browser = isPlatformBrowser(this.platformId);
    this.client = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        persistSession: browser,
        autoRefreshToken: browser,
        detectSessionInUrl: browser,
        storage: browser ? window.localStorage : undefined,
      },
    });
  }
}
