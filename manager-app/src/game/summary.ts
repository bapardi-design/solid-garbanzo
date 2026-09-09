import Engine from 'sim-engine';
import type { CareerSummary } from './store';

type Game = ReturnType<typeof Engine.createGame>;

export function summarise(game: Game, clubId: string): CareerSummary {
  const { world } = game;
  const club = world.clubs[clubId];
  const status = Engine.boardStatus(game.ctx);
  const league = Engine.leagueOf(world, clubId);
  return {
    tier: Engine.tierFromLeagueId(club.leagueId),
    position: status?.position ?? 0,
    balance: club.balance,
    careerOver: world.careerOver !== null,
    nationId: club.nationId,
    leagueName: league?.name ?? '',
    world: world.config.world,
  };
}
