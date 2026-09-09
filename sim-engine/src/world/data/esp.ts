import type { NationData } from './types.js';

const c = (name: string, short: string, city: string, capacity: number, reputation: number, players?: string[]) => ({ name, short, city, capacity, reputation, players });

export const ESP: NationData = {
  id: 'ESP',
  tiers: [
    // La Liga 2025-26
    [
      c('Real Madrid', 'RMA', 'Madrid', 78297, 96, [
        'Thibaut Courtois,GK,33,89,BEL', 'Andriy Lunin,GK,26,80,UKR', 'Éder Militão,DF,27,84,BRA', 'Antonio Rüdiger,DF,32,84,GER', 'Dean Huijsen,DF,20,83,ESP', 'Trent Alexander-Arnold,DF,26,86,ENG', 'Álvaro Carreras,DF,22,80,ESP', 'Ferland Mendy,DF,30,79,FRA', 'Dani Carvajal,DF,33,80,ESP', 'Raúl Asencio,DF,22,78,ESP',
        'Jude Bellingham,MF,22,90,ENG', 'Federico Valverde,MF,27,88,URU', 'Aurélien Tchouaméni,MF,25,85,FRA', 'Eduardo Camavinga,MF,22,83,FRA', 'Arda Güler,MF,20,83,TUR', 'Dani Ceballos,MF,29,78,ESP',
        'Kylian Mbappé,FW,26,93,FRA', 'Vinícius Júnior,FW,25,90,BRA', 'Rodrygo,FW,24,84,BRA', 'Brahim Díaz,FW,26,80,MAR', 'Franco Mastantuono,FW,18,79,ARG', 'Gonzalo García,FW,21,75,ESP',
      ]),
      c('FC Barcelona', 'BAR', 'Barcelona', 99354, 95, [
        'Joan García,GK,24,82,ESP', 'Marc-André ter Stegen,GK,33,83,GER', 'Pau Cubarsí,DF,18,85,ESP', 'Ronald Araújo,DF,26,82,URU', 'Jules Koundé,DF,26,85,FRA', 'Alejandro Balde,DF,21,82,ESP', 'Eric García,DF,24,79,ESP', 'Andreas Christensen,DF,29,79,DEN', 'Gerard Martín,DF,23,75,ESP',
        'Pedri,MF,22,90,ESP', 'Frenkie de Jong,MF,28,85,NED', 'Gavi,MF,21,82,ESP', 'Dani Olmo,MF,27,85,ESP', 'Fermín López,MF,22,80,ESP', 'Marc Casadó,MF,21,78,ESP', 'Marc Bernal,MF,18,74,ESP',
        'Lamine Yamal,FW,18,91,ESP', 'Raphinha,FW,28,89,BRA', 'Robert Lewandowski,FW,37,85,POL', 'Ferran Torres,FW,25,81,ESP', 'Marcus Rashford,FW,27,81,ENG', 'Roony Bardghji,FW,19,74,SWE',
      ]),
      c('Atlético Madrid', 'ATM', 'Madrid', 70460, 88, [
        'Jan Oblak,GK,32,87,SVN', 'Juan Musso,GK,31,77,ARG', 'José María Giménez,DF,30,82,URU', 'Robin Le Normand,DF,28,82,ESP', 'Clément Lenglet,DF,30,77,FRA', 'Marcos Llorente,DF,30,82,ESP', 'Dávid Hancko,DF,27,80,SVK', 'Matteo Ruggeri,DF,23,77,ITA', 'Nahuel Molina,DF,27,78,ARG',
        'Koke,MF,33,79,ESP', 'Pablo Barrios,MF,22,81,ESP', 'Conor Gallagher,MF,25,80,ENG', 'Johnny Cardoso,MF,23,78,USA', 'Álex Baena,MF,24,83,ESP', 'Giacomo Raspadori,MF,25,79,ITA',
        'Julián Álvarez,FW,25,87,ARG', 'Antoine Griezmann,FW,34,82,FRA', 'Alexander Sørloth,FW,29,79,NOR', 'Giuliano Simeone,FW,22,78,ARG', 'Thiago Almada,FW,24,79,ARG', 'Nico González,FW,27,78,ARG',
      ]),
      c('Athletic Club', 'ATH', 'Bilbao', 53289, 80, [
        'Unai Simón,GK,28,84,ESP', 'Dani Vivian,DF,26,82,ESP', 'Aitor Paredes,DF,25,78,ESP', 'Yuri Berchiche,DF,35,74,ESP', 'Óscar de Marcos,DF,36,73,ESP', 'Andoni Gorosabel,DF,28,75,ESP', 'Jesús Areso,DF,26,76,ESP',
        'Mikel Jauregizar,MF,21,77,ESP', 'Beñat Prados,MF,24,76,ESP', 'Oihan Sancet,MF,25,82,ESP', 'Iñigo Ruiz de Galarreta,MF,32,76,ESP', 'Unai Gómez,MF,22,75,ESP',
        'Nico Williams,FW,23,86,ESP', 'Iñaki Williams,FW,31,81,GHA', 'Gorka Guruzeta,FW,29,77,ESP', 'Álex Berenguer,FW,30,77,ESP', 'Maroan Sannadi,FW,24,74,ESP', 'Robert Navarro,FW,23,74,ESP',
      ]),
      c('Real Betis', 'BET', 'Sevilla', 60721, 76, [
        'Álvaro Valles,GK,27,77,ESP', 'Pau López,GK,30,77,ESP', 'Marc Bartra,DF,34,76,ESP', 'Natan,DF,24,77,BRA', 'Diego Llorente,DF,32,76,ESP', 'Junior Firpo,DF,29,76,DOM', 'Héctor Bellerín,DF,30,76,ESP', 'Aitor Ruibal,DF,29,75,ESP',
        'Sofyan Amrabat,MF,29,78,MAR', 'Marc Roca,MF,28,76,ESP', 'Pablo Fornals,MF,29,78,ESP', 'Isco,MF,33,82,ESP', 'Sergi Altimira,MF,23,75,ESP', 'Giovani Lo Celso,MF,29,80,ARG',
        'Antony,FW,25,82,BRA', 'Abde Ezzalzouli,FW,23,78,MAR', 'Cucho Hernández,FW,26,79,COL', 'Cédric Bakambu,FW,34,75,COD', 'Rodrigo Riquelme,FW,25,77,ESP',
      ]),
      c('Celta Vigo', 'CEL', 'Vigo', 24870, 68, [
        'Ionuț Radu,GK,28,76,ROU', 'Javi Rodríguez,DF,24,74,ESP', 'Carl Starfelt,DF,30,76,SWE', 'Marcos Alonso,DF,34,74,ESP', 'Óscar Mingueza,DF,26,78,ESP', 'Sergio Carreira,DF,24,74,ESP',
        'Ilaix Moriba,MF,22,76,GUI', 'Fran Beltrán,MF,26,76,ESP', 'Hugo Sotelo,MF,21,74,ESP', 'Miguel Román,MF,20,72,ESP',
        'Iago Aspas,FW,38,77,ESP', 'Borja Iglesias,FW,32,77,ESP', 'Williot Swedberg,FW,21,76,SWE', 'Bryan Zaragoza,FW,24,76,ESP', 'Pablo Durán,FW,23,74,ESP',
      ]),
      c('Deportivo Alavés', 'ALA', 'Vitoria', 19840, 62, [
        'Antonio Sivera,GK,29,76,ESP', 'Nahuel Tenaglia,DF,29,74,ARG', 'Facundo Garcés,DF,26,74,ARG', 'Jonny Otto,DF,31,74,ESP', 'Moussa Diarra,DF,25,73,MLI',
        'Antonio Blanco,MF,25,76,ESP', 'Ander Guevara,MF,28,74,ESP', 'Carlos Vicente,MF,26,75,ESP', 'Carles Aleñá,MF,27,74,ESP',
        'Toni Martínez,FW,28,73,ESP', 'Lucas Boyé,FW,29,74,ARG', 'Carlos Martín,FW,22,72,ESP', 'Abde Rebbach,FW,27,72,ALG',
      ]),
      c('Elche CF', 'ELC', 'Elche', 31388, 58, [
        'Matías Dituro,GK,38,74,ARG', 'Iñaki Peña,GK,26,76,ESP', 'David Affengruber,DF,24,74,AUT', 'Pedro Bigas,DF,35,72,ESP', 'John Chetauya,DF,22,72,NGA', 'Víctor Chust,DF,25,73,ESP',
        'Marc Aguado,MF,25,73,ESP', 'Martim Neto,MF,22,74,POR', 'Aleix Febas,MF,29,74,ESP', 'Grady Diangana,MF,27,74,ENG',
        'Rafa Mir,FW,28,76,ESP', 'André Silva,FW,29,76,POR', 'Germán Valera,FW,23,72,ESP', 'Álvaro Rodríguez,FW,21,73,URU',
      ]),
      c('RCD Espanyol', 'ESP', 'Barcelona', 40000, 64, [
        'Marko Dmitrović,GK,33,77,SRB', 'Leandro Cabrera,DF,34,75,URU', 'Omar El Hilali,DF,21,76,MAR', 'Carlos Romero,DF,23,75,ESP', 'Fernando Calero,DF,30,74,ESP', 'Miguel Rubio,DF,29,73,ESP',
        'Pol Lozano,MF,25,75,ESP', 'Edu Expósito,MF,29,76,ESP', 'Urko González,MF,24,73,ESP', 'Ramon Terrats,MF,24,74,ESP',
        'Roberto Fernández,FW,23,76,ESP', 'Pere Milla,FW,32,75,ESP', 'Kike García,FW,35,73,ESP', 'Tyrhys Dolan,FW,23,74,ENG', 'Javi Puado,FW,27,77,ESP',
      ]),
      c('Getafe CF', 'GET', 'Getafe', 16500, 62, [
        'David Soria,GK,32,78,ESP', 'Djené,DF,33,75,TOG', 'Domingos Duarte,DF,30,75,POR', 'Juan Iglesias,DF,27,73,ESP', 'Diego Rico,DF,32,73,ESP', 'Kiko Femenía,DF,34,73,ESP', 'Allan Nyom,DF,37,71,CMR',
        'Luis Milla,MF,30,76,ESP', 'Mauro Arambarri,MF,29,77,URU', 'Javi Muñoz,MF,30,73,ESP',
        'Borja Mayoral,FW,28,78,ESP', 'Adrián Liso,FW,20,74,ESP', 'Coba da Costa,FW,20,72,ESP',
      ]),
      c('Girona FC', 'GIR', 'Girona', 14624, 68, [
        'Paulo Gazzaniga,GK,33,78,ARG', 'Daley Blind,DF,35,76,NED', 'Alejandro Francés,DF,23,75,ESP', 'Hugo Rincón,DF,22,73,ESP', 'Arnau Martínez,DF,22,77,ESP', 'Ladislav Krejčí,DF,26,77,CZE',
        'Iván Martín,MF,26,76,ESP', 'Axel Witsel,MF,36,76,BEL', 'Azzedine Ounahi,MF,25,77,MAR', 'Viktor Tsygankov,FW,27,79,UKR', 'Bryan Gil,FW,24,77,ESP',
        'Cristhian Stuani,FW,38,75,URU', 'Vladyslav Vanat,FW,23,77,UKR', 'Portu,FW,33,74,ESP', 'Joel Roca,FW,20,72,ESP',
      ]),
      c('Levante UD', 'LEV', 'Valencia', 26354, 56, [
        'Mathew Ryan,GK,33,76,AUS', 'Pablo Martínez,GK,31,73,ESP', 'Unai Elgezabal,DF,32,72,ESP', 'Jorge Cabello,DF,22,72,ESP', 'Matías Moreno,DF,22,73,ARG', 'Adrián de la Fuente,DF,28,72,ESP', 'Manu Sánchez,DF,25,73,ESP',
        'Oriol Rey,MF,23,74,ESP', 'Kervin Arriaga,MF,27,73,HON', 'Iván Romero,MF,25,74,ESP', 'Carlos Álvarez,MF,22,76,ESP',
        'Karl Etta Eyong,FW,21,76,CMR', 'Roger Brugué,FW,29,73,ESP', 'Carlos Espí,FW,20,71,ESP', 'Goduine Koyalipou,FW,26,73,CAF',
      ]),
      c('RCD Mallorca', 'MLL', 'Palma', 23021, 63, [
        'Leo Román,GK,25,76,ESP', 'Antonio Raíllo,DF,33,74,ESP', 'Martin Valjent,DF,29,76,SVK', 'Mateu Morey,DF,25,73,ESP', 'Pablo Maffeo,DF,28,75,ESP', 'Johan Mojica,DF,32,73,COL',
        'Samú Costa,MF,24,77,POR', 'Sergi Darder,MF,31,77,ESP', 'Manu Morlanes,MF,26,74,ESP', 'Omar Mascarell,MF,32,73,ESP', 'Dani Rodríguez,MF,37,72,ESP',
        'Vedat Muriqi,FW,31,79,KOS', 'Takuma Asano,FW,30,75,JPN', 'Mateo Joseph,FW,21,74,ESP', 'Jan Virgili,FW,19,72,ESP',
      ]),
      c('CA Osasuna', 'OSA', 'Pamplona', 23516, 64, [
        'Sergio Herrera,GK,32,77,ESP', 'Alejandro Catena,DF,30,76,ESP', 'Enzo Boyomo,DF,23,76,CMR', 'Juan Cruz,DF,32,74,ESP', 'Valentin Rosier,DF,28,74,FRA', 'Abel Bretones,DF,25,74,ESP',
        'Lucas Torró,MF,31,75,ESP', 'Jon Moncayola,MF,27,76,ESP', 'Aimar Oroz,MF,23,76,ESP', 'Moi Gómez,MF,31,74,ESP', 'Rubén García,MF,32,74,ESP',
        'Ante Budimir,FW,34,78,CRO', 'Raúl García,FW,29,74,ESP', 'Víctor Muñoz,FW,21,73,ESP', 'Kike Barja,FW,28,72,ESP',
      ]),
      c('Rayo Vallecano', 'RAY', 'Madrid', 14708, 62, [
        'Augusto Batalla,GK,29,76,ARG', 'Florian Lejeune,DF,34,76,FRA', 'Abdul Mumin,DF,27,74,GHA', 'Pep Chavarría,DF,27,74,ESP', 'Andrei Rațiu,DF,27,77,ROU', 'Iván Balliu,DF,33,73,ALB',
        'Unai López,MF,29,76,ESP', 'Pedro Díaz,MF,27,75,ESP', 'Pathé Ciss,MF,31,73,SEN', 'Óscar Valentín,MF,31,74,ESP',
        'Isi Palazón,FW,30,78,ESP', 'Álvaro García,FW,32,77,ESP', 'Jorge de Frutos,FW,28,76,ESP', 'Sergio Camello,FW,24,74,ESP', 'Fran Pérez,FW,22,74,ESP',
      ]),
      c('Real Oviedo', 'OVI', 'Oviedo', 30500, 56, [
        'Aarón Escandell,GK,29,75,ESP', 'David Costas,DF,30,74,ESP', 'Dani Calvo,DF,31,73,ESP', 'Rahim Alhassane,DF,25,72,NIG', 'Nacho Vidal,DF,30,73,ESP', 'Oier Luengo,DF,27,72,ESP',
        'Santi Cazorla,MF,40,72,ESP', 'Luka Ilić,MF,26,74,SRB', 'Kwasi Sibo,MF,27,73,GHA', 'Leander Dendoncker,MF,30,75,BEL', 'Eric Bailly,DF,31,73,CIV',
        'Salomón Rondón,FW,35,74,VEN', 'Fede Viñas,FW,27,73,URU', 'Ilyas Chaira,FW,24,72,MAR', 'Haissem Hassan,FW,23,73,FRA',
      ]),
      c('Real Sociedad', 'RSO', 'San Sebastián', 39500, 76, [
        'Álex Remiro,GK,30,82,ESP', 'Igor Zubeldia,DF,28,79,ESP', 'Jon Martín,DF,19,76,ESP', 'Aihen Muñoz,DF,28,76,ESP', 'Sergio Gómez,DF,24,76,ESP', 'Duje Ćaleta-Car,DF,28,77,CRO', 'Jon Aramburu,DF,23,76,VEN',
        'Beñat Turrientes,MF,23,77,ESP', 'Brais Méndez,MF,28,79,ESP', 'Yangel Herrera,MF,27,77,VEN', 'Pablo Marín,MF,22,75,ESP', 'Carlos Soler,MF,28,78,ESP', 'Arsen Zakharyan,MF,22,77,RUS',
        'Mikel Oyarzabal,FW,28,84,ESP', 'Takefusa Kubo,FW,24,82,JPN', 'Gonçalo Guedes,FW,28,77,POR', 'Ander Barrenetxea,FW,23,78,ESP', 'Orri Óskarsson,FW,20,76,ISL',
      ]),
      c('Sevilla FC', 'SEV', 'Sevilla', 43883, 72, [
        'Ørjan Nyland,GK,34,76,NOR', 'Odysseas Vlachodimos,GK,31,76,GRE', 'Loïc Badé,DF,25,79,FRA', 'Tanguy Nianzou,DF,23,75,FRA', 'Kike Salas,DF,23,74,ESP', 'José Ángel Carmona,DF,23,75,ESP', 'Gabriel Suazo,DF,28,75,CHI', 'Marcão,DF,29,75,BRA',
        'Nemanja Gudelj,MF,33,75,SRB', 'Lucien Agoumé,MF,23,76,FRA', 'Djibril Sow,MF,28,77,SUI', 'Alexis Sánchez,FW,36,76,CHI',
        'Isaac Romero,FW,25,76,ESP', 'Akor Adams,FW,25,75,NGA', 'Chidera Ejuke,FW,27,75,NGA', 'Rubén Vargas,FW,27,77,SUI', 'Dodi Lukébakio,FW,27,78,BEL',
      ]),
      c('Valencia CF', 'VAL', 'Valencia', 49430, 70, [
        'Giorgi Mamardashvili,GK,24,82,GEO', 'Stole Dimitrievski,GK,31,75,MKD', 'César Tárrega,DF,23,76,ESP', 'Cristhian Mosquera,DF,21,79,ESP', 'José Gayà,DF,30,78,ESP', 'Thierry Correia,DF,26,74,POR', 'Dimitri Foulquier,DF,32,73,GLP',
        'Javi Guerra,MF,22,79,ESP', 'Pepelu,MF,26,77,ESP', 'André Almeida,MF,25,76,POR', 'Luis Rioja,MF,31,75,ESP', 'Enzo Barrenechea,MF,24,75,ARG',
        'Hugo Duro,FW,25,77,ESP', 'Diego López,FW,23,76,ESP', 'Umar Sadiq,FW,28,74,NGA', 'Rafa Mir,FW,28,75,ESP', 'Dani Raba,FW,29,74,ESP',
      ]),
      c('Villarreal CF', 'VIL', 'Villarreal', 23500, 77, [
        'Luiz Júnior,GK,24,78,BRA', 'Diego Conde,GK,26,75,ESP', 'Juan Foyth,DF,27,79,ARG', 'Logan Costa,DF,24,78,CPV', 'Rafa Marín,DF,23,76,ESP', 'Sergi Cardona,DF,26,77,ESP', 'Santiago Mouriño,DF,23,76,URU', 'Alfonso Pedraza,DF,29,77,ESP',
        'Dani Parejo,MF,36,79,ESP', 'Pape Gueye,MF,26,77,SEN', 'Thomas Partey,MF,32,80,GHA', 'Santi Comesaña,MF,29,77,ESP', 'Alberto Moleiro,MF,21,77,ESP',
        'Gerard Moreno,FW,33,80,ESP', 'Ayoze Pérez,FW,32,80,ESP', 'Nicolas Pépé,FW,30,78,CIV', 'Tajon Buchanan,FW,26,76,CAN', 'Georges Mikautadze,FW,24,79,GEO', 'Yeremy Pino,FW,22,78,ESP',
      ]),
    ],
    // Segunda División 2025-26
    [
      c('Albacete Balompié', 'ALB', 'Albacete', 17524, 44), c('UD Almería', 'ALM', 'Almería', 15274, 52), c('FC Andorra', 'AND', 'Andorra la Vella', 3306, 40), c('Burgos CF', 'BUR', 'Burgos', 12200, 44),
      c('Cádiz CF', 'CAD', 'Cádiz', 20724, 50), c('CD Castellón', 'CAS', 'Castellón', 15500, 43), c('AD Ceuta', 'CEU', 'Ceuta', 6500, 38), c('Córdoba CF', 'COR', 'Córdoba', 21822, 45),
      c('Cultural Leonesa', 'CUL', 'León', 13451, 40), c('Deportivo La Coruña', 'DEP', 'A Coruña', 32660, 52), c('SD Eibar', 'EIB', 'Eibar', 8164, 46), c('Granada CF', 'GRA', 'Granada', 19169, 50),
      c('SD Huesca', 'HUE', 'Huesca', 9100, 44), c('UD Las Palmas', 'LPA', 'Las Palmas', 32400, 52), c('CD Leganés', 'LEG', 'Leganés', 12454, 50), c('Málaga CF', 'MAL', 'Málaga', 30044, 50),
      c('CD Mirandés', 'MIR', 'Miranda de Ebro', 5759, 40), c('Racing de Santander', 'RAC', 'Santander', 22222, 47), c('Real Sociedad B', 'RSB', 'San Sebastián', 2500, 38), c('Sporting de Gijón', 'SPG', 'Gijón', 29029, 48),
      c('Real Valladolid', 'VLL', 'Valladolid', 27618, 50), c('Real Zaragoza', 'ZAR', 'Zaragoza', 33608, 48),
    ],
  ],
};
