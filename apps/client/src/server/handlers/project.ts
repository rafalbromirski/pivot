import { ResponseComposition, rest, RestContext, RestRequest } from 'msw';

import {
  findDeploymentsByProjectId,
  findEnvironmentsByProjectId,
  findFeaturesByProjectId,
  findProjectById,
  findProjectsByTeamId,
  findVariablesByProjectId,
} from '@pivot/fixtures';
import { sleep } from '@pivot/util/time';

const TEAM_ID = '76ce0d5e-6766-4592-b6ff-14ecebbff3e5';

export function projectHandlers(apiUrl: string, { isBrowser = false } = {}) {
  return [
    rest.get(`${apiUrl}/rest/v1/project`, getProject),
    rest.get(`${apiUrl}/rest/v1/environment`, getComponent('environments')),
    rest.get(`${apiUrl}/rest/v1/deployment`, getComponent('deployments')),
    rest.get(`${apiUrl}/rest/v1/feature`, getComponent('features')),
    rest.get(`${apiUrl}/rest/v1/variable`, getComponent('variables')),
  ];

  function getComponent(component: string) {
    return async function get(
      req: RestRequest,
      res: ResponseComposition,
      ctx: RestContext,
    ) {
      if (isBrowser) {
        await sleep(500);
      }

      const uuid = getProjectUuid(req);

      if (!uuid) {
        return res(ctx.status(200), ctx.json('Project not found'));
      }

      const project = await findProjectById(uuid);

      if (!project) {
        return res(ctx.status(200), ctx.json('Project not found'));
      }

      let result: any[] = [];

      switch (component) {
        case 'environments':
          result = await findEnvironmentsByProjectId(uuid);
          break;
        case 'deployments':
          result = await findDeploymentsByProjectId(uuid);
          break;
        case 'features':
          result = await findFeaturesByProjectId(uuid);
          break;
        case 'variables':
          result = await findVariablesByProjectId(uuid);
          break;
      }

      return res(ctx.status(200), ctx.json(result));
    };
  }

  async function getProject(
    req: RestRequest,
    res: ResponseComposition,
    ctx: RestContext,
  ) {
    if (isBrowser) {
      await sleep(500);
    }

    const uuid = getProjectUuid(req);

    const projects = await findProjectsByTeamId(TEAM_ID);

    if (!uuid) {
      return res(ctx.status(200), ctx.json(projects));
    }

    return res(
      ctx.status(200),
      ctx.json(projects.find((p: any) => p.uuid === uuid)),
    );
  }

  function getProjectUuid(req: RestRequest) {
    return req.url.searchParams.get('uuid')?.split('.')[1];
  }
}
