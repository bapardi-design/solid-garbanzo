import type { NationData } from './types.js';

const c = (name: string, short: string, city: string, capacity: number, reputation: number, players?: string[]) => ({ name, short, city, capacity, reputation, players });

export const ENG: NationData = {
  id: 'ENG',
  tiers: [
    // Premier League 2025-26
    [
      c('Arsenal', 'ARS', 'London', 60704, 92, [
        'David Raya,GK,29,86,ESP', 'William Saliba,DF,24,88,FRA', 'Gabriel Magalhães,DF,27,87,BRA', 'Jurriën Timber,DF,24,82,NED', 'Riccardo Calafiori,DF,23,80,ITA', 'Ben White,DF,27,81,ENG', 'Myles Lewis-Skelly,DF,18,77,ENG',
        'Declan Rice,MF,26,88,ENG', 'Martin Ødegaard,MF,26,88,NOR', 'Martín Zubimendi,MF,26,85,ESP', 'Mikel Merino,MF,29,81,ESP', 'Ethan Nwaneri,MF,18,76,ENG',
        'Bukayo Saka,FW,23,89,ENG', 'Gabriel Martinelli,FW,24,82,BRA', 'Viktor Gyökeres,FW,27,85,SWE', 'Kai Havertz,FW,26,83,GER', 'Noni Madueke,FW,23,79,ENG', 'Leandro Trossard,FW,30,81,BEL',
      ]),
      c('Aston Villa', 'AVL', 'Birmingham', 42918, 80, [
        'Emiliano Martínez,GK,32,86,ARG', 'Ezri Konsa,DF,27,80,ENG', 'Pau Torres,DF,28,81,ESP', 'Tyrone Mings,DF,32,77,ENG', 'Lucas Digne,DF,31,77,FRA', 'Matty Cash,DF,27,77,POL',
        'Youri Tielemans,MF,28,83,BEL', 'Boubacar Kamara,MF,25,81,FRA', 'Amadou Onana,MF,23,79,BEL', 'John McGinn,MF,30,80,SCO', 'Morgan Rogers,MF,23,82,ENG',
        'Ollie Watkins,FW,29,84,ENG', 'Emiliano Buendía,FW,28,76,ARG', 'Leon Bailey,FW,27,77,JAM', 'Evann Guessand,FW,24,76,CIV',
      ]),
      c('AFC Bournemouth', 'BOU', 'Bournemouth', 11307, 72, [
        'Đorđe Petrović,GK,25,79,SRB', 'Adrien Truffert,DF,23,77,FRA', 'Marcos Senesi,DF,28,80,ARG', 'Bafodé Diakité,DF,24,78,FRA', 'Adam Smith,DF,34,72,ENG',
        'Lewis Cook,MF,28,78,ENG', 'Ryan Christie,MF,30,77,SCO', 'Tyler Adams,MF,26,78,USA', 'Alex Scott,MF,21,76,ENG',
        'Antoine Semenyo,FW,25,82,GHA', 'Evanilson,FW,25,80,BRA', 'Marcus Tavernier,FW,26,77,ENG', 'Justin Kluivert,FW,26,79,NED',
      ]),
      c('Brentford', 'BRE', 'London', 17250, 70, [
        'Caoimhín Kelleher,GK,26,79,IRL', 'Nathan Collins,DF,24,79,IRL', 'Ethan Pinnock,DF,32,77,JAM', 'Sepp van den Berg,DF,23,76,NED', 'Keane Lewis-Potter,DF,24,75,ENG', 'Aaron Hickey,DF,23,75,SCO',
        'Mikkel Damsgaard,MF,25,79,DEN', 'Vitaly Janelt,MF,27,77,GER', 'Yehor Yarmoliuk,MF,21,75,UKR', 'Jordan Henderson,MF,35,74,ENG',
        'Igor Thiago,FW,24,78,BRA', 'Kevin Schade,FW,23,77,GER', 'Dango Ouattara,FW,23,77,BFA', 'Yoane Wissa,FW,28,79,COD',
      ]),
      c('Brighton & Hove Albion', 'BHA', 'Brighton', 31876, 75, [
        'Bart Verbruggen,GK,22,80,NED', 'Lewis Dunk,DF,33,79,ENG', 'Jan Paul van Hecke,DF,25,80,NED', 'Adam Webster,DF,30,75,ENG', 'Maxim De Cuyper,DF,24,77,BEL', 'Joël Veltman,DF,33,75,NED',
        'Carlos Baleba,MF,21,82,CMR', 'Yasin Ayari,MF,21,76,SWE', 'Diego Gómez,MF,22,77,PAR', 'Brajan Gruda,MF,21,76,GER',
        'Kaoru Mitoma,FW,28,82,JPN', 'Danny Welbeck,FW,34,76,ENG', 'Georginio Rutter,FW,23,78,FRA', 'Yankuba Minteh,FW,21,78,GAM', 'Stefanos Tzimas,FW,19,73,GRE',
      ]),
      c('Burnley', 'BUR', 'Burnley', 21944, 62, [
        'Martin Dúbravka,GK,36,76,SVK', 'Maxime Estève,DF,23,77,FRA', 'Kyle Walker,DF,35,76,ENG', 'Quilindschy Hartman,DF,23,75,NED', 'Axel Tuanzebe,DF,27,73,COD',
        'Josh Cullen,MF,29,75,IRL', 'Lesley Ugochukwu,MF,21,75,FRA', 'Hannibal Mejbri,MF,22,73,TUN', 'Josh Laurent,MF,30,72,ENG',
        'Lyle Foster,FW,24,74,RSA', 'Jaidon Anthony,FW,25,74,ENG', 'Zian Flemming,FW,27,74,NED', 'Loum Tchaouna,FW,21,73,FRA',
      ]),
      c('Chelsea', 'CHE', 'London', 40173, 90, [
        'Robert Sánchez,GK,27,80,ESP', 'Levi Colwill,DF,22,82,ENG', 'Marc Cucurella,DF,26,83,ESP', 'Reece James,DF,25,83,ENG', 'Trevoh Chalobah,DF,26,79,ENG', 'Malo Gusto,DF,22,79,FRA', 'Wesley Fofana,DF,24,79,FRA',
        'Moisés Caicedo,MF,23,88,ECU', 'Enzo Fernández,MF,24,86,ARG', 'Cole Palmer,MF,23,90,ENG', 'Roméo Lavia,MF,21,79,BEL', 'Andrey Santos,MF,21,77,BRA',
        'João Pedro,FW,23,83,BRA', 'Pedro Neto,FW,25,81,POR', 'Liam Delap,FW,22,78,ENG', 'Jamie Gittens,FW,21,79,ENG', 'Estêvão,FW,18,80,BRA', 'Nicolas Jackson,FW,24,80,SEN',
      ]),
      c('Crystal Palace', 'CRY', 'London', 25486, 72, [
        'Dean Henderson,GK,28,80,ENG', 'Marc Guéhi,DF,25,84,ENG', 'Maxence Lacroix,DF,25,80,FRA', 'Chris Richards,DF,25,78,USA', 'Daniel Muñoz,DF,29,80,COL', 'Tyrick Mitchell,DF,25,77,ENG',
        'Adam Wharton,MF,21,82,ENG', 'Will Hughes,MF,30,75,ENG', 'Jefferson Lerma,MF,30,77,COL', 'Daichi Kamada,MF,29,77,JPN',
        'Jean-Philippe Mateta,FW,28,81,FRA', 'Ismaïla Sarr,FW,27,79,SEN', 'Eddie Nketiah,FW,26,75,ENG', 'Yéremy Pino,FW,22,78,ESP',
      ]),
      c('Everton', 'EVE', 'Liverpool', 52888, 73, [
        'Jordan Pickford,GK,31,84,ENG', 'James Tarkowski,DF,32,80,ENG', 'Jarrad Branthwaite,DF,23,82,ENG', 'Vitaliy Mykolenko,DF,26,77,UKR', 'Jake O\'Brien,DF,24,76,IRL', 'Nathan Patterson,DF,23,73,SCO',
        'Idrissa Gueye,MF,35,76,SEN', 'James Garner,MF,24,77,ENG', 'Jack Grealish,MF,29,82,ENG', 'Kiernan Dewsbury-Hall,MF,26,77,ENG', 'Tim Iroegbunam,MF,22,73,ENG',
        'Beto,FW,27,76,GNB', 'Iliman Ndiaye,FW,25,79,SEN', 'Dwight McNeil,FW,25,76,ENG', 'Thierno Barry,FW,22,75,FRA',
      ]),
      c('Fulham', 'FUL', 'London', 29600, 70, [
        'Bernd Leno,GK,33,82,GER', 'Calvin Bassey,DF,25,79,NGA', 'Joachim Andersen,DF,29,81,DEN', 'Antonee Robinson,DF,27,81,USA', 'Kenny Tete,DF,29,77,NED', 'Timothy Castagne,DF,29,76,BEL',
        'Sander Berge,MF,27,78,NOR', 'Andreas Pereira,MF,29,78,BRA', 'Emile Smith Rowe,MF,25,78,ENG', 'Tom Cairney,MF,34,74,SCO', 'Sasa Lukic,MF,29,76,SRB',
        'Raúl Jiménez,FW,34,76,MEX', 'Rodrigo Muniz,FW,24,77,BRA', 'Alex Iwobi,FW,29,79,NGA', 'Harry Wilson,FW,28,77,WAL', 'Adama Traoré,FW,29,76,ESP',
      ]),
      c('Leeds United', 'LEE', 'Leeds', 37792, 70, [
        'Lucas Perri,GK,27,78,BRA', 'Pascal Struijk,DF,25,78,NED', 'Joe Rodon,DF,27,78,WAL', 'Jaka Bijol,DF,26,78,SVN', 'Jayden Bogle,DF,25,76,ENG', 'Gabriel Gudmundsson,DF,26,75,SWE',
        'Ethan Ampadu,MF,24,78,WAL', 'Ao Tanaka,MF,26,77,JPN', 'Anton Stach,MF,26,77,GER', 'Sean Longstaff,MF,27,75,ENG', 'Brenden Aaronson,MF,24,75,USA',
        'Dominic Calvert-Lewin,FW,28,77,ENG', 'Lukas Nmecha,FW,26,75,GER', 'Daniel James,FW,27,76,WAL', 'Noah Okafor,FW,25,76,SUI', 'Wilfried Gnonto,FW,21,76,ITA',
      ]),
      c('Liverpool', 'LIV', 'Liverpool', 61276, 95, [
        'Alisson,GK,32,89,BRA', 'Giorgi Mamardashvili,GK,24,82,GEO', 'Virgil van Dijk,DF,34,89,NED', 'Ibrahima Konaté,DF,26,84,FRA', 'Milos Kerkez,DF,21,80,HUN', 'Andrew Robertson,DF,31,80,SCO', 'Jeremie Frimpong,DF,24,82,NED', 'Conor Bradley,DF,22,78,NIR',
        'Ryan Gravenberch,MF,23,86,NED', 'Alexis Mac Allister,MF,26,87,ARG', 'Dominik Szoboszlai,MF,24,84,HUN', 'Florian Wirtz,MF,22,88,GER', 'Curtis Jones,MF,24,79,ENG', 'Wataru Endo,MF,32,76,JPN',
        'Mohamed Salah,FW,33,90,EGY', 'Alexander Isak,FW,25,89,SWE', 'Hugo Ekitiké,FW,23,83,FRA', 'Cody Gakpo,FW,26,83,NED', 'Federico Chiesa,FW,27,78,ITA',
      ]),
      c('Manchester City', 'MCI', 'Manchester', 52900, 94, [
        'Gianluigi Donnarumma,GK,26,88,ITA', 'James Trafford,GK,22,78,ENG', 'Rúben Dias,DF,28,86,POR', 'Joško Gvardiol,DF,23,85,CRO', 'John Stones,DF,31,82,ENG', 'Abdukodir Khusanov,DF,21,79,UZB', 'Rayan Aït-Nouri,DF,24,80,ALG', 'Matheus Nunes,DF,26,79,POR', 'Nathan Aké,DF,30,80,NED',
        'Rodri,MF,29,90,ESP', 'Bernardo Silva,MF,31,85,POR', 'Phil Foden,MF,25,85,ENG', 'Tijjani Reijnders,MF,27,84,NED', 'Rayan Cherki,MF,21,82,FRA', 'Nico González,MF,23,80,ESP', 'Nico O\'Reilly,MF,20,76,ENG',
        'Erling Haaland,FW,25,91,NOR', 'Jérémy Doku,FW,23,82,BEL', 'Omar Marmoush,FW,26,83,EGY', 'Savinho,FW,21,80,BRA', 'Oscar Bobb,FW,22,77,NOR',
      ]),
      c('Manchester United', 'MUN', 'Manchester', 74310, 86, [
        'Senne Lammens,GK,23,77,BEL', 'Altay Bayındır,GK,27,75,TUR', 'Matthijs de Ligt,DF,26,83,NED', 'Lisandro Martínez,DF,27,83,ARG', 'Leny Yoro,DF,19,79,FRA', 'Harry Maguire,DF,32,78,ENG', 'Luke Shaw,DF,30,78,ENG', 'Noussair Mazraoui,DF,27,78,MAR', 'Diogo Dalot,DF,26,78,POR', 'Patrick Dorgu,DF,20,75,DEN',
        'Bruno Fernandes,MF,30,87,POR', 'Casemiro,MF,33,80,BRA', 'Kobbie Mainoo,MF,20,78,ENG', 'Manuel Ugarte,MF,24,78,URU', 'Mason Mount,MF,26,77,ENG', 'Amad Diallo,MF,23,80,CIV',
        'Bryan Mbeumo,FW,26,83,CMR', 'Matheus Cunha,FW,26,83,BRA', 'Benjamin Šeško,FW,22,80,SVN', 'Joshua Zirkzee,FW,24,76,NED',
      ]),
      c('Newcastle United', 'NEW', 'Newcastle', 52305, 82, [
        'Nick Pope,GK,33,82,ENG', 'Aaron Ramsdale,GK,27,79,ENG', 'Sven Botman,DF,25,81,NED', 'Fabian Schär,DF,33,79,SUI', 'Dan Burn,DF,33,77,ENG', 'Malick Thiaw,DF,24,79,GER', 'Kieran Trippier,DF,34,78,ENG', 'Tino Livramento,DF,22,79,ENG', 'Lewis Hall,DF,20,78,ENG',
        'Bruno Guimarães,MF,27,86,BRA', 'Sandro Tonali,MF,25,85,ITA', 'Joelinton,MF,29,80,BRA', 'Joe Willock,MF,26,76,ENG', 'Lewis Miley,MF,19,74,ENG', 'Jacob Ramsey,MF,24,76,ENG',
        'Nick Woltemade,FW,23,80,GER', 'Yoane Wissa,FW,28,79,COD', 'Anthony Gordon,FW,24,82,ENG', 'Anthony Elanga,FW,23,79,SWE', 'Harvey Barnes,FW,27,79,ENG', 'Jacob Murphy,FW,30,77,ENG',
      ]),
      c('Nottingham Forest', 'NFO', 'Nottingham', 30404, 74, [
        'Matz Sels,GK,33,81,BEL', 'Murillo,DF,23,82,BRA', 'Nikola Milenković,DF,27,82,SRB', 'Ola Aina,DF,28,78,NGA', 'Neco Williams,DF,24,76,WAL', 'Nicolò Savona,DF,22,75,ITA',
        'Elliot Anderson,MF,22,82,ENG', 'Ibrahim Sangaré,MF,27,77,CIV', 'Douglas Luiz,MF,27,78,BRA', 'James McAtee,MF,22,76,ENG', 'Ryan Yates,MF,27,74,ENG', 'Nicolás Domínguez,MF,27,76,ARG',
        'Chris Wood,FW,33,80,NZL', 'Morgan Gibbs-White,MF,25,82,ENG', 'Callum Hudson-Odoi,FW,24,77,ENG', 'Dan Ndoye,FW,24,78,SUI', 'Igor Jesus,FW,24,77,BRA', 'Omari Hutchinson,FW,21,76,ENG',
      ]),
      c('Sunderland', 'SUN', 'Sunderland', 49000, 64, [
        'Robin Roefs,GK,22,76,NED', 'Omar Alderete,DF,28,77,PAR', 'Dan Ballard,DF,25,76,NIR', 'Trai Hume,DF,23,76,NIR', 'Reinildo,DF,31,76,MOZ', 'Nordi Mukiele,DF,27,77,FRA',
        'Granit Xhaka,MF,32,82,SUI', 'Habib Diarra,MF,21,78,SEN', 'Noah Sadiki,MF,20,76,COD', 'Enzo Le Fée,MF,25,77,FRA', 'Chris Rigg,MF,18,74,ENG',
        'Brian Brobbey,FW,23,77,NED', 'Wilson Isidor,FW,25,75,FRA', 'Chemsdine Talbi,FW,20,75,MAR', 'Simon Adingra,FW,23,76,CIV', 'Bertrand Traoré,FW,29,74,BFA',
      ]),
      c('Tottenham Hotspur', 'TOT', 'London', 62850, 84, [
        'Guglielmo Vicario,GK,28,83,ITA', 'Cristian Romero,DF,27,85,ARG', 'Micky van de Ven,DF,24,85,NED', 'Pedro Porro,DF,25,82,ESP', 'Destiny Udogie,DF,22,79,ITA', 'Djed Spence,DF,25,77,ENG', 'Kevin Danso,DF,26,77,AUT',
        'João Palhinha,MF,30,82,POR', 'Rodrigo Bentancur,MF,28,80,URU', 'Pape Matar Sarr,MF,22,79,SEN', 'Lucas Bergvall,MF,19,78,SWE', 'Archie Gray,MF,19,76,ENG', 'Xavi Simons,MF,22,83,NED',
        'Dominic Solanke,FW,27,80,ENG', 'Richarlison,FW,28,79,BRA', 'Mohammed Kudus,FW,25,82,GHA', 'Brennan Johnson,FW,24,79,WAL', 'Mathys Tel,FW,20,77,FRA', 'Wilson Odobert,FW,20,75,FRA', 'Randal Kolo Muani,FW,26,80,FRA',
      ]),
      c('West Ham United', 'WHU', 'London', 62500, 74, [
        'Alphonse Areola,GK,32,79,FRA', 'Mads Hermansen,GK,25,76,DEN', 'Max Kilman,DF,28,78,ENG', 'Konstantinos Mavropanos,DF,27,77,GRE', 'Jean-Clair Todibo,DF,25,78,FRA', 'Aaron Wan-Bissaka,DF,27,78,ENG', 'El Hadji Malick Diouf,DF,20,75,SEN',
        'Tomáš Souček,MF,30,77,CZE', 'James Ward-Prowse,MF,30,77,ENG', 'Mateus Fernandes,MF,21,77,POR', 'Lucas Paquetá,MF,27,82,BRA', 'Freddie Potts,MF,21,72,ENG',
        'Jarrod Bowen,FW,28,83,ENG', 'Callum Wilson,FW,33,75,ENG', 'Crysencio Summerville,FW,23,77,NED', 'Niclas Füllkrug,FW,32,77,GER',
      ]),
      c('Wolverhampton Wanderers', 'WOL', 'Wolverhampton', 31750, 70, [
        'José Sá,GK,32,79,POR', 'Sam Johnstone,GK,32,77,ENG', 'Toti Gomes,DF,26,76,POR', 'Santiago Bueno,DF,26,76,URU', 'Emmanuel Agbadou,DF,28,77,CIV', 'Yerson Mosquera,DF,24,76,COL', 'Hugo Bueno,DF,22,74,ESP', 'Jackson Tchatchoua,DF,23,75,CMR',
        'João Gomes,MF,24,80,BRA', 'André,MF,24,78,BRA', 'Jean-Ricner Bellegarde,MF,27,76,FRA', 'Rodrigo Gomes,MF,22,74,POR',
        'Jørgen Strand Larsen,FW,25,79,NOR', 'Hwang Hee-chan,FW,29,76,KOR', 'Jhon Arias,FW,27,77,COL', 'Tolu Arokodare,FW,24,74,NGA',
      ]),
    ],
    // Championship 2025-26
    [
      c('Birmingham City', 'BIR', 'Birmingham', 29409, 56), c('Blackburn Rovers', 'BLB', 'Blackburn', 31367, 54), c('Bristol City', 'BRC', 'Bristol', 27000, 56), c('Charlton Athletic', 'CHA', 'London', 27111, 50),
      c('Coventry City', 'COV', 'Coventry', 32609, 58), c('Derby County', 'DER', 'Derby', 33597, 53), c('Hull City', 'HUL', 'Hull', 25400, 54), c('Ipswich Town', 'IPS', 'Ipswich', 30014, 62),
      c('Leicester City', 'LEI', 'Leicester', 32261, 63), c('Middlesbrough', 'MID', 'Middlesbrough', 34742, 58), c('Millwall', 'MIL', 'London', 20146, 53), c('Norwich City', 'NOR', 'Norwich', 27359, 58),
      c('Oxford United', 'OXF', 'Oxford', 12500, 49), c('Portsmouth', 'POR', 'Portsmouth', 20899, 52), c('Preston North End', 'PNE', 'Preston', 23408, 53), c('Queens Park Rangers', 'QPR', 'London', 18439, 52),
      c('Sheffield United', 'SHU', 'Sheffield', 32050, 60), c('Sheffield Wednesday', 'SHW', 'Sheffield', 39732, 50), c('Southampton', 'SOU', 'Southampton', 32384, 62), c('Stoke City', 'STK', 'Stoke', 30089, 55),
      c('Swansea City', 'SWA', 'Swansea', 21088, 54), c('Watford', 'WAT', 'Watford', 22200, 56), c('West Bromwich Albion', 'WBA', 'West Bromwich', 26850, 57), c('Wrexham', 'WRX', 'Wrexham', 13341, 55),
    ],
    // League One 2025-26
    [
      c('AFC Wimbledon', 'WIM', 'London', 9300, 40), c('Barnsley', 'BAR', 'Barnsley', 23287, 46), c('Blackpool', 'BLP', 'Blackpool', 16616, 46), c('Bolton Wanderers', 'BOL', 'Bolton', 28723, 47),
      c('Bradford City', 'BRA', 'Bradford', 25136, 43), c('Burton Albion', 'BUA', 'Burton', 6912, 40), c('Cardiff City', 'CAR', 'Cardiff', 33280, 50), c('Doncaster Rovers', 'DON', 'Doncaster', 15231, 42),
      c('Exeter City', 'EXE', 'Exeter', 8696, 41), c('Huddersfield Town', 'HUD', 'Huddersfield', 24121, 48), c('Leyton Orient', 'LEY', 'London', 9271, 42), c('Lincoln City', 'LIN', 'Lincoln', 10780, 44),
      c('Luton Town', 'LUT', 'Luton', 12000, 50), c('Mansfield Town', 'MAN', 'Mansfield', 9186, 42), c('Northampton Town', 'NTN', 'Northampton', 7798, 41), c('Peterborough United', 'PET', 'Peterborough', 15314, 44),
      c('Plymouth Argyle', 'PLY', 'Plymouth', 17900, 47), c('Port Vale', 'PVL', 'Stoke', 15036, 41), c('Reading', 'REA', 'Reading', 24161, 46), c('Rotherham United', 'ROT', 'Rotherham', 12021, 44),
      c('Stevenage', 'STE', 'Stevenage', 7800, 40), c('Stockport County', 'STO', 'Stockport', 10852, 45), c('Wigan Athletic', 'WIG', 'Wigan', 25133, 45), c('Wycombe Wanderers', 'WYC', 'Wycombe', 10137, 44),
    ],
    // League Two 2025-26
    [
      c('Accrington Stanley', 'ACC', 'Accrington', 5450, 33), c('Barnet', 'BNT', 'London', 7000, 34), c('Barrow', 'BRW', 'Barrow', 6500, 34), c('Bristol Rovers', 'BRR', 'Bristol', 12300, 38),
      c('Bromley', 'BRO', 'London', 5300, 34), c('Cambridge United', 'CAM', 'Cambridge', 8127, 37), c('Cheltenham Town', 'CHE', 'Cheltenham', 7066, 34), c('Chesterfield', 'CFD', 'Chesterfield', 10504, 38),
      c('Colchester United', 'COL', 'Colchester', 10105, 35), c('Crawley Town', 'CRA', 'Crawley', 5996, 34), c('Crewe Alexandra', 'CRE', 'Crewe', 10153, 35), c('Fleetwood Town', 'FLE', 'Fleetwood', 5327, 35),
      c('Gillingham', 'GIL', 'Gillingham', 11582, 36), c('Grimsby Town', 'GRI', 'Grimsby', 9052, 36), c('Harrogate Town', 'HAR', 'Harrogate', 5000, 32), c('Milton Keynes Dons', 'MKD', 'Milton Keynes', 30500, 39),
      c('Newport County', 'NEP', 'Newport', 8700, 33), c('Notts County', 'NOT', 'Nottingham', 19588, 39), c('Oldham Athletic', 'OLD', 'Oldham', 13512, 36), c('Salford City', 'SAL', 'Salford', 5108, 37),
      c('Shrewsbury Town', 'SHR', 'Shrewsbury', 9875, 36), c('Swindon Town', 'SWI', 'Swindon', 15728, 37), c('Tranmere Rovers', 'TRA', 'Birkenhead', 16587, 36), c('Walsall', 'WAL', 'Walsall', 11300, 37),
    ],
  ],
};
