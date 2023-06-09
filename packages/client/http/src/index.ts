import { CRUX_ACCESS_TOKEN_CACHE_KEY } from '@pivot/client/auth';
import { Cache } from '@pivot/client/cache';
import { Service as Env, Variable } from '@pivot/client/env';

export type Http = ReturnType<typeof http>;

export function http(env: Env, cache: Cache) {
  return {
    get,
  };

  async function get<T>(path: string, baseUrl?: string): Promise<T> {
    const token = cache.get(CRUX_ACCESS_TOKEN_CACHE_KEY);

    return fetch(`${baseUrl ?? env.get(Variable.SUPABASE_API_URL)}${path}`, {
      headers: {
        apiKey: env.get(Variable.SUPABASE_API_KEY),
        authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      method: 'GET',
    }).then((res) => res.json());
  }
}
