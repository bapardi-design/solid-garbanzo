/**
 * Nations, their league pyramids, and naming pools. Club names are fictional
 * but patterned on real cities and each nation's naming conventions.
 */
import type { Rng } from '../core/rng.js';

export interface NationSpec {
  id: string;
  name: string;
  adjective: string;
  /** Clubs per tier, top tier first. */
  tiers: number[];
  /** Human-readable league names, top tier first. */
  leagueNames: string[];
  cupName: string;
  /** Second domestic cup (league cup), if the nation runs one. */
  leagueCupName: string | null;
  /** 1-100; drives reputation, money and continental slots. */
  coefficient: number;
  /** Continental cup places for the top tier. */
  continentalSlots: number;
  /** Clubs swapped between adjacent tiers, top boundary first. */
  exchange?: number[];
  /** Season prize money by tier position: base and per-place step, in k. */
  prize: { base: number[]; perPlace: number[] };
  currency: string;
}

export const NATIONS: Record<string, NationSpec> = {
  ENG: {
    id: 'ENG', name: 'England', adjective: 'English',
    tiers: [20, 24, 24, 24],
    leagueNames: ['Premier Division', 'Championship', 'League One', 'League Two'],
    cupName: 'English Cup', leagueCupName: 'League Cup',
    coefficient: 95, continentalSlots: 4, exchange: [3, 3, 4],
    prize: { base: [90000, 8000, 1500, 800], perPlace: [2200, 250, 60, 30] },
    currency: '£',
  },
  ESP: {
    id: 'ESP', name: 'Spain', adjective: 'Spanish',
    tiers: [20, 22],
    leagueNames: ['Primera División', 'Segunda División'],
    cupName: 'Copa Nacional', leagueCupName: null,
    coefficient: 88, continentalSlots: 4, exchange: [3],
    prize: { base: [45000, 4000], perPlace: [1800, 150] },
    currency: '€',
  },
  GER: {
    id: 'GER', name: 'Germany', adjective: 'German',
    tiers: [18, 18],
    leagueNames: ['Bundesliga', '2. Bundesliga'],
    cupName: 'German Cup', leagueCupName: null,
    coefficient: 86, continentalSlots: 4, exchange: [2],
    prize: { base: [40000, 5000], perPlace: [1900, 200] },
    currency: '€',
  },
  ITA: {
    id: 'ITA', name: 'Italy', adjective: 'Italian',
    tiers: [20, 20],
    leagueNames: ['Serie Alpha', 'Serie Beta'],
    cupName: 'Coppa Italia', leagueCupName: null,
    coefficient: 84, continentalSlots: 4, exchange: [3],
    prize: { base: [38000, 3500], perPlace: [1500, 120] },
    currency: '€',
  },
  FRA: {
    id: 'FRA', name: 'France', adjective: 'French',
    tiers: [18, 18],
    leagueNames: ['Ligue Première', 'Ligue Seconde'],
    cupName: 'Coupe Nationale', leagueCupName: null,
    coefficient: 78, continentalSlots: 3, exchange: [2],
    prize: { base: [30000, 3000], perPlace: [1200, 100] },
    currency: '€',
  },
  CUS: {
    id: 'CUS', name: 'Custom', adjective: 'Custom',
    tiers: [12, 12],
    leagueNames: ['Division 1', 'Division 2', 'Division 3', 'Division 4'],
    cupName: 'National Cup', leagueCupName: null,
    coefficient: 70, continentalSlots: 0,
    prize: { base: [5000, 1500, 500, 300], perPlace: [500, 120, 40, 20] },
    currency: '£',
  },
};

export const CONTINENTAL_CUP_NAME = 'Continental Cup';

interface NamePool { first: string[]; last: string[]; cities: string[]; styles: ((city: string, rng: Rng) => string)[] }

const ENG_CITIES = [
  'Manchester', 'Liverpool', 'London', 'Birmingham', 'Leeds', 'Newcastle', 'Sheffield', 'Nottingham', 'Leicester', 'Southampton',
  'Brighton', 'Wolverhampton', 'Everton', 'Bristol', 'Norwich', 'Ipswich', 'Sunderland', 'Middlesbrough', 'Stoke', 'Derby',
  'Coventry', 'Hull', 'Cardiff', 'Swansea', 'Reading', 'Watford', 'Luton', 'Millwall', 'Blackburn', 'Preston',
  'Burnley', 'Huddersfield', 'Bolton', 'Wigan', 'Plymouth', 'Portsmouth', 'Oxford', 'Cambridge', 'Peterborough', 'Barnsley',
  'Rotherham', 'Doncaster', 'Bradford', 'Blackpool', 'Charlton', 'Wycombe', 'Exeter', 'Lincoln', 'Shrewsbury', 'Stevenage',
  'Northampton', 'Mansfield', 'Wrexham', 'Stockport', 'Crawley', 'Gillingham', 'Bromley', 'Walsall', 'Chesterfield', 'Salford',
  'Barrow', 'Carlisle', 'Fleetwood', 'Morecambe', 'Harrogate', 'Grimsby', 'Colchester', 'Newport', 'Swindon', 'Cheltenham',
  'Bournemouth', 'Fulham', 'Brentford', 'Crystal Palace', 'West Ham', 'Tottenham', 'Chelsea', 'Arsenal', 'Aston', 'Burton',
  'Port Vale', 'Crewe', 'Tranmere', 'Accrington', 'Leyton', 'Rochdale', 'Oldham', 'Bury', 'Scunthorpe', 'York',
  'Torquay', 'Southend', 'Hartlepool', 'Aldershot', 'Woking', 'Solihull', 'Boreham', 'Eastleigh', 'Halifax', 'Gateshead',
];
const ESP_CITIES = [
  'Madrid', 'Barcelona', 'Sevilla', 'Valencia', 'Bilbao', 'Zaragoza', 'Málaga', 'Murcia', 'Las Palmas', 'Valladolid',
  'Vigo', 'Gijón', 'Oviedo', 'Granada', 'Córdoba', 'Alicante', 'Cádiz', 'Huelva', 'Almería', 'Santander',
  'Pamplona', 'San Sebastián', 'Vitoria', 'Getafe', 'Leganés', 'Alcorcón', 'Elche', 'Castellón', 'Tarragona', 'Girona',
  'Lleida', 'Burgos', 'León', 'Salamanca', 'Logroño', 'Albacete', 'Cartagena', 'Jaén', 'Badajoz', 'Palma',
  'Tenerife', 'Eibar', 'Mallorca', 'Huesca', 'Lugo', 'Ferrol', 'Ponferrada', 'Sabadell', 'Mirandés', 'Andorra',
];
const GER_CITIES = [
  'München', 'Dortmund', 'Berlin', 'Hamburg', 'Köln', 'Frankfurt', 'Stuttgart', 'Leipzig', 'Bremen', 'Hannover',
  'Nürnberg', 'Düsseldorf', 'Leverkusen', 'Gelsenkirchen', 'Mönchengladbach', 'Wolfsburg', 'Hoffenheim', 'Freiburg', 'Mainz', 'Augsburg',
  'Bochum', 'Bielefeld', 'Kiel', 'Rostock', 'Dresden', 'Magdeburg', 'Karlsruhe', 'Fürth', 'Heidenheim', 'Paderborn',
  'Darmstadt', 'Kaiserslautern', 'Braunschweig', 'Regensburg', 'Sandhausen', 'Aue', 'Osnabrück', 'Saarbrücken', 'Ulm', 'Elversberg',
];
const ITA_CITIES = [
  'Milano', 'Torino', 'Roma', 'Napoli', 'Firenze', 'Bologna', 'Genova', 'Bergamo', 'Verona', 'Udine',
  'Cagliari', 'Parma', 'Lecce', 'Salerno', 'Empoli', 'Monza', 'Sassuolo', 'Frosinone', 'Venezia', 'Palermo',
  'Bari', 'Catania', 'Como', 'Cremona', 'Brescia', 'Pisa', 'Modena', 'Reggio', 'Cosenza', 'Cesena',
  'Ascoli', 'Perugia', 'Spezia', 'Terni', 'Catanzaro', 'Sampdoria', 'Vicenza', 'Padova', 'Trieste', 'Livorno',
];
const FRA_CITIES = [
  'Paris', 'Marseille', 'Lyon', 'Lille', 'Monaco', 'Nice', 'Rennes', 'Nantes', 'Bordeaux', 'Strasbourg',
  'Montpellier', 'Toulouse', 'Lens', 'Reims', 'Brest', 'Lorient', 'Metz', 'Saint-Étienne', 'Le Havre', 'Auxerre',
  'Angers', 'Clermont', 'Troyes', 'Caen', 'Sochaux', 'Nancy', 'Guingamp', 'Amiens', 'Dijon', 'Grenoble',
  'Bastia', 'Ajaccio', 'Valenciennes', 'Rodez', 'Pau', 'Laval', 'Annecy', 'Dunkerque', 'Orléans', 'Niort',
];
const CUS_CITIES = [
  'Ashford', 'Bramley', 'Calder', 'Dunmore', 'Eastvale', 'Fairbank', 'Glenrock', 'Harlow', 'Ironbridge', 'Juniper',
  'Kingsmere', 'Larkhill', 'Millbrook', 'Northgate', 'Oakwell', 'Penrith', 'Quarry', 'Ravensdale', 'Stonebridge', 'Thornby',
  'Underhill', 'Verdun', 'Westmoor', 'Yarrow', 'Aldersley', 'Bexley', 'Corby', 'Denby', 'Elmham', 'Frampton',
  'Gresham', 'Holbrook', 'Ingram', 'Kelby', 'Lyndon', 'Marlow', 'Newlyn', 'Ormsby', 'Prescot', 'Rutland',
  'Selby', 'Tenby', 'Uxley', 'Varley', 'Whitby', 'Yately', 'Ambleside', 'Buxton',
];

const POOLS: Record<string, NamePool> = {
  ENG: {
    first: ['Jack', 'Harry', 'Oliver', 'George', 'Charlie', 'Jacob', 'Alfie', 'Freddie', 'Oscar', 'Archie', 'Callum', 'Connor', 'Kyle', 'Lewis', 'Ryan', 'Ben', 'Tom', 'James', 'Joe', 'Sam', 'Reece', 'Tyler', 'Mason', 'Ethan', 'Declan', 'Jordan', 'Marcus', 'Trent', 'Kieran', 'Aaron'],
    last: ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Robinson', 'Wright', 'Thompson', 'Evans', 'Walker', 'White', 'Roberts', 'Green', 'Hall', 'Wood', 'Jackson', 'Clarke', 'Hughes', 'Edwards', 'Turner', 'Hill', 'Ward', 'Cooper', 'Morgan', 'King', 'Bell', 'Foster', 'Barnes', 'Shaw', 'Pearce', 'Bennett', 'Dyer', 'Sterling', 'Mount', 'Rice', 'Gordon', 'Palmer'],
    cities: ENG_CITIES,
    styles: [(c) => `${c} United`, (c) => `${c} City`, (c) => `${c} Town`, (c) => `${c} Athletic`, (c) => `${c} Rovers`, (c) => `${c} Wanderers`, (c) => `${c} Albion`, (c) => `${c} FC`, (c) => `AFC ${c}`],
  },
  ESP: {
    first: ['Pablo', 'Álvaro', 'Sergio', 'Iker', 'Dani', 'Marcos', 'Adrián', 'Diego', 'Javier', 'Rodrigo', 'Mikel', 'Unai', 'Ander', 'Gerard', 'Pedri', 'Nico', 'Raúl', 'Carlos', 'Jesús', 'Fermín', 'Isco', 'Koke', 'Saúl', 'Borja', 'Alejandro'],
    last: ['García', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Ruiz', 'Hernández', 'Jiménez', 'Díaz', 'Moreno', 'Álvarez', 'Romero', 'Torres', 'Navarro', 'Gil', 'Ramos', 'Serrano', 'Molina', 'Ortega', 'Delgado', 'Castro', 'Vidal', 'Oyarzabal', 'Merino', 'Zubimendi', 'Carvajal', 'Olmo', 'Morata'],
    cities: ESP_CITIES,
    styles: [(c) => `Real ${c}`, (c) => `${c} CF`, (c) => `Atlético ${c}`, (c) => `Deportivo ${c}`, (c) => `${c} FC`, (c) => `Racing ${c}`, (c) => `Sporting ${c}`, (c) => `UD ${c}`],
  },
  GER: {
    first: ['Leon', 'Jonas', 'Lukas', 'Finn', 'Niklas', 'Julian', 'Florian', 'Kai', 'Timo', 'Jamal', 'Joshua', 'Serge', 'Benjamin', 'Maximilian', 'Felix', 'Marco', 'Robin', 'Tim', 'Nico', 'Jan', 'Moritz', 'Pascal', 'Thilo', 'Malik', 'Deniz'],
    last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Koch', 'Richter', 'Klein', 'Wolf', 'Neumann', 'Schwarz', 'Braun', 'Krüger', 'Hartmann', 'Lange', 'Werner', 'Kimmich', 'Goretzka', 'Havertz', 'Wirtz', 'Musiala', 'Sané', 'Gnabry', 'Rüdiger', 'Tah'],
    cities: GER_CITIES,
    styles: [(c) => `FC ${c}`, (c) => `1. FC ${c}`, (c) => `SV ${c}`, (c) => `VfB ${c}`, (c) => `Borussia ${c}`, (c) => `Eintracht ${c}`, (c) => `SC ${c}`, (c) => `${c} 09`],
  },
  ITA: {
    first: ['Lorenzo', 'Alessandro', 'Matteo', 'Andrea', 'Francesco', 'Federico', 'Nicolò', 'Sandro', 'Giacomo', 'Riccardo', 'Davide', 'Gianluca', 'Marco', 'Luca', 'Simone', 'Manuel', 'Mattia', 'Ciro', 'Moise', 'Alessio', 'Bryan', 'Giovanni', 'Leonardo', 'Tommaso', 'Pietro'],
    last: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti', 'Barella', 'Bastoni', 'Chiesa', 'Tonali', 'Locatelli', 'Scamacca', 'Pellegrini', 'Bonaventura', 'Di Lorenzo', 'Raspadori'],
    cities: ITA_CITIES,
    styles: [(c) => `${c} Calcio`, (c) => `AC ${c}`, (c) => `US ${c}`, (c) => `FC ${c}`, (c) => `${c} 1907`, (c) => `Virtus ${c}`, (c) => `Pro ${c}`, (c) => `Atalanta ${c}`],
  },
  FRA: {
    first: ['Kylian', 'Antoine', 'Olivier', 'Ousmane', 'Théo', 'Lucas', 'Adrien', 'Jules', 'Eduardo', 'Aurélien', 'Youssouf', 'Marcus', 'Randal', 'Kingsley', 'Christopher', 'Benjamin', 'Ibrahima', 'Dayot', 'Warren', 'Bradley', 'Mathis', 'Rayan', 'Malo', 'Hugo', 'Léo'],
    last: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Griezmann', 'Giroud', 'Tchouaméni', 'Camavinga', 'Koundé', 'Saliba', 'Zaïre-Emery', 'Barcola', 'Olise', 'Thuram'],
    cities: FRA_CITIES,
    styles: [(c) => `${c} FC`, (c) => `Olympique ${c}`, (c) => `Stade ${c}`, (c) => `AS ${c}`, (c) => `RC ${c}`, (c) => `FC ${c}`, (c) => `${c} SC`, (c) => `US ${c}`],
  },
  CUS: {
    first: ['Adam', 'Alex', 'Andre', 'Ben', 'Bruno', 'Carlos', 'Chris', 'Dan', 'Diego', 'Elias', 'Emil', 'Felix', 'Finn', 'Gabriel', 'Hugo', 'Ivan', 'Jack', 'Jonas', 'Kai', 'Karim', 'Leo', 'Liam', 'Luca', 'Luis', 'Marco', 'Mateo', 'Max', 'Milan', 'Nico', 'Noah'],
    last: ['Adams', 'Alvarez', 'Bauer', 'Becker', 'Bennett', 'Carter', 'Costa', 'Dubois', 'Edwards', 'Fischer', 'Foster', 'Garcia', 'Gomez', 'Hansen', 'Hoffman', 'Hughes', 'Jensen', 'Keller', 'Klein', 'Lopez', 'Martin', 'Meyer', 'Moreau', 'Nilsson', 'Novak', 'Olsen', 'Perez', 'Reyes', 'Rossi', 'Santos'],
    cities: CUS_CITIES,
    styles: [(c) => `${c} United`, (c) => `${c} City`, (c) => `${c} Athletic`, (c) => `${c} Rovers`, (c) => `${c} Town`, (c) => `${c} FC`, (c) => `${c} Wanderers`, (c) => `${c} Albion`],
  },
};

const EXTRA_POOLS: Record<string, Pick<NamePool, 'first' | 'last'>> = {
  BRA: { first: ['Gabriel', 'Lucas', 'Matheus', 'João', 'Pedro', 'Rafael', 'Bruno', 'Vinícius', 'Rodrygo', 'Danilo', 'Éder', 'Thiago', 'Wesley', 'Igor', 'Caio', 'Murilo', 'Endrick', 'Estêvão', 'Savinho', 'Raphinha'], last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Lima', 'Carvalho', 'Ribeiro', 'Alves', 'Costa', 'Martins', 'Rocha', 'Barbosa', 'Nascimento', 'Moreira', 'Araújo', 'Cardoso', 'Gomes', 'Teixeira', 'Fernandes'] },
  ARG: { first: ['Julián', 'Lautaro', 'Enzo', 'Alexis', 'Nicolás', 'Rodrigo', 'Nahuel', 'Cristian', 'Leandro', 'Exequiel', 'Giovani', 'Facundo', 'Valentín', 'Thiago', 'Franco', 'Emiliano', 'Lisandro', 'Gonzalo', 'Matías', 'Lucas'], last: ['González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Álvarez', 'Romero', 'Paredes', 'Molina', 'Acuña', 'Almada', 'Garnacho', 'Castellanos', 'Buonanotte', 'Soulé', 'Barco', 'Echeverri', 'Mastantuono', 'Palacios', 'Carboni'] },
  POR: { first: ['João', 'Rúben', 'Bruno', 'Bernardo', 'Rafael', 'Diogo', 'Nuno', 'Gonçalo', 'Pedro', 'Vitinha', 'Francisco', 'António', 'Tiago', 'André', 'Fábio', 'Renato', 'Geovany', 'Matheus', 'Rodrigo', 'Tomás'], last: ['Silva', 'Santos', 'Fernandes', 'Neves', 'Dias', 'Leão', 'Mendes', 'Ramos', 'Costa', 'Conceição', 'Trincão', 'Vieira', 'Inácio', 'Pereira', 'Gonçalves', 'Semedo', 'Cancelo', 'Palhinha', 'Nunes', 'Félix'] },
  NED: { first: ['Virgil', 'Frenkie', 'Cody', 'Xavi', 'Denzel', 'Jeremie', 'Memphis', 'Matthijs', 'Micky', 'Tijjani', 'Ryan', 'Jurriën', 'Nathan', 'Lutsharel', 'Joshua', 'Brian', 'Donyell', 'Justin', 'Wout', 'Jerdy'], last: ['de Jong', 'van Dijk', 'Gakpo', 'Simons', 'Dumfries', 'Frimpong', 'de Ligt', 'van de Ven', 'Reijnders', 'Gravenberch', 'Timber', 'Aké', 'Geertruida', 'Zirkzee', 'Brobbey', 'Malen', 'Kluivert', 'Weghorst', 'Schouten', 'Koopmeiners'] },
  BEL: { first: ['Kevin', 'Romelu', 'Jérémy', 'Youri', 'Leandro', 'Amadou', 'Charles', 'Loïs', 'Johan', 'Arthur', 'Orel', 'Aster', 'Thomas', 'Wout', 'Timothy', 'Koen', 'Zeno', 'Malick', 'Dodi', 'Maxim'], last: ['De Bruyne', 'Lukaku', 'Doku', 'Tielemans', 'Trossard', 'Onana', 'De Ketelaere', 'Openda', 'Bakayoko', 'Theate', 'Mangala', 'Vranckx', 'Meunier', 'Faes', 'Castagne', 'Casteels', 'Debast', 'Fofana', 'Lukebakio', 'De Cuyper'] },
};
const NEAREST: Record<string, string> = { SCO: 'ENG', WAL: 'ENG', IRL: 'ENG', NIR: 'ENG', USA: 'ENG', AUS: 'ENG', CAN: 'ENG', JAM: 'ENG', AUT: 'GER', SUI: 'GER', DEN: 'GER', NOR: 'GER', SWE: 'GER', POL: 'GER', CZE: 'GER', HUN: 'GER', CRO: 'GER', SRB: 'GER', UKR: 'GER', TUR: 'GER', SVN: 'GER', SVK: 'GER', GRE: 'ITA', ALB: 'ITA', MAR: 'FRA', ALG: 'FRA', SEN: 'FRA', CIV: 'FRA', CMR: 'FRA', MLI: 'FRA', GUI: 'FRA', COD: 'FRA', BFA: 'FRA', TUN: 'FRA', GHA: 'ENG', NGA: 'ENG', EGY: 'ENG', KOR: 'ENG', JPN: 'ENG', MEX: 'ESP', COL: 'ESP', URU: 'ARG', CHI: 'ARG', PAR: 'ARG', ECU: 'ARG', VEN: 'ESP', PER: 'ESP' };

export function poolFor(nationId: string): NamePool {
  if (POOLS[nationId]) return POOLS[nationId];
  const extra = EXTRA_POOLS[nationId];
  if (extra) return { ...POOLS.CUS, ...extra };
  return POOLS[NEAREST[nationId] ?? 'CUS'] ?? POOLS.CUS;
}

/** Foreign nationalities that show up in the big leagues, with rough weights. */
export const FOREIGN_NATIONS: [string, number][] = [
  ['BRA', 12], ['ARG', 8], ['FRA', 8], ['ESP', 7], ['POR', 6], ['NED', 6], ['GER', 5], ['ITA', 5], ['ENG', 5], ['BEL', 4], ['DEN', 3], ['CRO', 3], ['SRB', 3], ['URU', 3], ['COL', 3], ['SEN', 3], ['CIV', 2], ['MAR', 3], ['NGA', 2], ['GHA', 2], ['SUI', 2], ['AUT', 2], ['POL', 2], ['NOR', 2], ['SWE', 2], ['SCO', 2], ['IRL', 2], ['WAL', 1], ['USA', 2], ['JPN', 2], ['KOR', 1], ['TUR', 2], ['UKR', 1], ['CZE', 1], ['GRE', 1], ['MEX', 1], ['ECU', 1], ['ALG', 1], ['CMR', 1], ['MLI', 1],
];

export function personName(nationId: string, rng: Rng): string {
  const pool = poolFor(nationId);
  return `${rng.pick(pool.first)} ${rng.pick(pool.last)}`;
}

/** Deterministic, non-repeating club names for a nation. */
export function clubNames(nationId: string, count: number, rng: Rng): { name: string; short: string; city: string }[] {
  const pool = poolFor(nationId);
  const cities = rng.shuffle([...pool.cities]);
  const used = new Set<string>();
  const out: { name: string; short: string; city: string }[] = [];
  let i = 0;
  while (out.length < count) {
    const city = cities[i % cities.length];
    const style = pool.styles[(Math.floor(i / cities.length) + rng.int(0, pool.styles.length - 1)) % pool.styles.length];
    let name = style(city, rng);
    let guard = 0;
    while (used.has(name) && guard++ < pool.styles.length) name = pool.styles[(pool.styles.indexOf(style) + guard) % pool.styles.length](city, rng);
    if (used.has(name)) name = `${name} ${out.length}`;
    used.add(name);
    out.push({ name, short: city.replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 3).toUpperCase(), city });
    i++;
  }
  return out;
}

/** Foreign nationality pick weighted toward stronger leagues. */
export function pickNationality(homeNation: string, tier: number, rng: Rng, real: boolean): string {
  const foreignShare = !real ? 0 : tier === 1 ? 0.45 : tier === 2 ? 0.25 : 0.1;
  if (!rng.chance(foreignShare)) return homeNation;
  const pool = FOREIGN_NATIONS.filter(([id]) => id !== homeNation);
  return rng.weighted(pool.map(([id]) => id), pool.map(([, w]) => w));
}
