import { asyncQueue } from '@pivot/lib/async-queue';

import { ResourceSlice } from './slice';
import { Config, Service } from './types';

export function resourceService<
  Data,
  Error,
  ReadParams extends any[],
  CreateParams extends any[],
  DeleteParams extends any[],
  UpdateParams extends any[],
>(
  config: Config<Data, ReadParams, CreateParams, DeleteParams, UpdateParams>,
  slice: ResourceSlice<Data, Error>,
): Service<Data, Error, ReadParams, CreateParams, DeleteParams, UpdateParams> {
  const { api, select } = slice;
  const queue = asyncQueue();
  let readParams: ReadParams;

  return {
    create,
    delete: del,
    read,
    update,
  };

  async function read(...params: ReadParams): Promise<Data | Error> {
    const { pollingInterval, query } = config.read;

    if (!readParams) {
      readParams = params;
    }

    const current = select();

    api.set({
      loading: !current.loaded,
      updating: current.loaded,
    });

    if (pollingInterval !== undefined) {
      setTimeout(() => read(...params), pollingInterval);
    }

    try {
      const res = await query(...params);

      api.set({
        data: res,
        loading: false,
        loaded: true,
        updating: false,
        error: null,
      });

      return res;
    } catch (error: unknown) {
      api.set({
        loading: false,
        updating: false,
        error: error as Error,
      });

      return error as Error;
    }
  }

  async function update(...params: UpdateParams) {
    return mutate(config.update, ...params);
  }

  async function create(...params: CreateParams) {
    return mutate(config.create, ...params);
  }

  async function del(...params: DeleteParams) {
    return mutate(config.delete, ...params);
  }

  async function mutate(
    conf: typeof config.create | typeof config.delete | typeof config.update,
    ...params: DeleteParams | UpdateParams | CreateParams
  ): Promise<Data | Error> {
    const res = queue.add(doMutation);

    return res;

    async function doMutation() {
      if (!readParams) {
        throw new Error('Cannot mutate before reading');
      }

      if (!conf) {
        throw new Error('No mutation config provided');
      }

      const { optimistic, query, transform } = conf;

      const oldData = select();

      if (optimistic) {
        api.set({
          data: optimistic(...params)(oldData.data),
        });
      }

      try {
        const res = await query(...params);

        if (transform) {
          const data = transform(res)(oldData.data);

          api.set({ data });

          return data;
        }
      } catch (error: unknown) {
        api.set({
          loading: false,
          updating: false,
          error: error as Error,
        });
      }

      return read(...readParams);
    }
  }
}
