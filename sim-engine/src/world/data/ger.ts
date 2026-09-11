import type { NationData } from './types.js';

const c = (name: string, short: string, city: string, capacity: number, reputation: number, players?: string[]) => ({ name, short, city, capacity, reputation, players });

export const GER: NationData = {
  id: 'GER',
  tiers: [
    // Bundesliga 2025-26
    [
      c('FC Bayern München', 'FCB', 'München', 75024, 94, [
        'Manuel Neuer,GK,39,85,GER', 'Jonas Urbig,GK,21,76,GER', 'Dayot Upamecano,DF,26,85,FRA', 'Jonathan Tah,DF,29,84,GER', 'Kim Min-jae,DF,28,82,KOR', 'Alphonso Davies,DF,24,84,CAN', 'Konrad Laimer,DF,28,80,AUT', 'Josip Stanišić,DF,25,79,CRO', 'Sacha Boey,DF,24,76,FRA',
        'Joshua Kimmich,MF,30,87,GER', 'Aleksandar Pavlović,MF,21,81,GER', 'Leon Goretzka,MF,30,82,GER', 'Jamal Musiala,MF,22,88,GER', 'Tom Bischof,MF,20,76,GER', 'Lennart Karl,MF,17,72,GER',
        'Harry Kane,FW,32,91,ENG', 'Michael Olise,FW,23,87,FRA', 'Luis Díaz,FW,28,85,COL', 'Serge Gnabry,FW,30,80,GER', 'Nicolas Jackson,FW,24,80,SEN',
      ]),
      c('Borussia Dortmund', 'BVB', 'Dortmund', 81365, 86, [
        'Gregor Kobel,GK,27,86,SUI', 'Nico Schlotterbeck,DF,25,84,GER', 'Niklas Süle,DF,29,79,GER', 'Waldemar Anton,DF,29,79,GER', 'Ramy Bensebaini,DF,30,78,ALG', 'Julian Ryerson,DF,27,78,NOR', 'Yan Couto,DF,23,77,BRA', 'Daniel Svensson,DF,23,76,SWE',
        'Felix Nmecha,MF,24,79,GER', 'Pascal Groß,MF,34,79,GER', 'Marcel Sabitzer,MF,31,78,AUT', 'Jobe Bellingham,MF,19,77,ENG', 'Julian Brandt,MF,29,82,GER', 'Carney Chukwuemeka,MF,21,76,ENG',
        'Serhou Guirassy,FW,29,85,GUI', 'Karim Adeyemi,FW,23,81,GER', 'Maximilian Beier,FW,22,78,GER', 'Fábio Silva,FW,23,77,POR', 'Julien Duranville,FW,19,74,BEL',
      ]),
      c('Bayer 04 Leverkusen', 'B04', 'Leverkusen', 30210, 82, [
        'Mark Flekken,GK,32,80,NED', 'Janis Blaswich,GK,34,74,GER', 'Edmond Tapsoba,DF,26,82,BFA', 'Jarell Quansah,DF,22,79,ENG', 'Piero Hincapié,DF,23,81,ECU', 'Alejandro Grimaldo,DF,29,84,ESP', 'Arthur,DF,22,77,BRA', 'Loïc Badé,DF,25,79,FRA',
        'Robert Andrich,MF,30,80,GER', 'Exequiel Palacios,MF,26,82,ARG', 'Aleix García,MF,28,80,ESP', 'Ezequiel Fernández,MF,23,78,ARG', 'Malik Tillman,MF,23,80,USA', 'Ibrahim Maza,MF,19,76,ALG',
        'Patrik Schick,FW,29,82,CZE', 'Nathan Tella,FW,26,78,NGA', 'Christian Kofane,FW,19,74,CMR', 'Ernest Poku,FW,21,75,NED', 'Eliesse Ben Seghir,FW,20,78,MAR',
      ]),
      c('RB Leipzig', 'RBL', 'Leipzig', 47069, 80, [
        'Péter Gulácsi,GK,35,80,HUN', 'Maarten Vandevoordt,GK,23,76,BEL', 'Willi Orbán,DF,32,80,HUN', 'Castello Lukeba,DF,22,81,FRA', 'David Raum,DF,27,80,GER', 'Ridle Baku,DF,27,77,GER', 'Lutsharel Geertruida,DF,25,77,NED', 'El Chadaille Bitshiabu,DF,20,75,FRA',
        'Xavi Simons,MF,22,83,NED', 'Nicolas Seiwald,MF,24,77,AUT', 'Arthur Vermeeren,MF,20,77,BEL', 'Kevin Kampl,MF,34,75,SVN', 'Assan Ouédraogo,MF,19,76,GER', 'Christoph Baumgartner,MF,26,78,AUT',
        'Loïs Openda,FW,25,83,BEL', 'Benjamin Šeško,FW,22,80,SVN', 'Antonio Nusa,FW,20,78,NOR', 'Yan Diomande,FW,18,75,CIV', 'Johan Bakayoko,FW,22,79,BEL', 'Romulo,FW,24,77,BRA',
      ]),
      c('Eintracht Frankfurt', 'SGE', 'Frankfurt', 58000, 78, [
        'Kaua Santos,GK,22,77,BRA', 'Michael Zetterer,GK,30,76,GER', 'Robin Koch,DF,29,80,GER', 'Arthur Theate,DF,25,79,BEL', 'Tuta,DF,26,77,BRA', 'Nathaniel Brown,DF,22,77,GER', 'Rasmus Kristensen,DF,28,78,DEN', 'Aurèle Amenda,DF,22,75,SUI',
        'Ellyes Skhiri,MF,30,78,TUN', 'Hugo Larsson,MF,21,80,SWE', 'Mario Götze,MF,33,77,GER', 'Farès Chaïbi,MF,22,78,ALG', 'Can Uzun,MF,19,78,TUR', 'Ansgar Knauff,FW,23,77,GER',
        'Jonathan Burkardt,FW,25,80,GER', 'Ritsu Doan,FW,27,80,JPN', 'Jean-Matteo Bahoya,FW,20,78,FRA', 'Elye Wahi,FW,22,77,FRA', 'Michy Batshuayi,FW,31,75,BEL',
      ]),
      c('VfB Stuttgart', 'VFB', 'Stuttgart', 60449, 78, [
        'Alexander Nübel,GK,28,80,GER', 'Jeff Chabot,DF,27,78,GER', 'Finn Jeltsch,DF,19,76,GER', 'Maximilian Mittelstädt,DF,28,80,GER', 'Josha Vagnoman,DF,24,76,GER', 'Luca Jaquez,DF,22,75,SUI', 'Julian Chabot,DF,27,76,GER',
        'Angelo Stiller,MF,24,82,GER', 'Atakan Karazor,MF,28,77,GER', 'Chris Führich,MF,27,77,GER', 'Jamie Leweling,MF,24,78,GER', 'Bilal El Khannouss,MF,21,78,MAR', 'Lorenz Assignon,DF,25,76,FRA',
        'Deniz Undav,FW,29,81,GER', 'Ermedin Demirović,FW,27,80,BIH', 'Tiago Tomás,FW,23,77,POR', 'Badredine Bouanani,FW,20,74,ALG', 'Chema Andrés,MF,20,74,ESP',
      ]),
      c('SC Freiburg', 'SCF', 'Freiburg', 34700, 72, [
        'Noah Atubolu,GK,23,79,GER', 'Matthias Ginter,DF,31,80,GER', 'Philipp Lienhart,DF,29,78,AUT', 'Christian Günter,DF,32,76,GER', 'Lukas Kübler,DF,32,75,GER', 'Max Rosenfelder,DF,22,75,GER', 'Jordy Makengo,DF,22,74,FRA',
        'Maximilian Eggestein,MF,28,78,GER', 'Vincenzo Grifo,MF,32,79,ITA', 'Johan Manzambi,MF,19,76,SUI', 'Patrick Osterhage,MF,25,76,GER', 'Yuito Suzuki,MF,23,77,JPN', 'Derry Scherhant,FW,22,75,GER',
        'Lucas Höler,FW,31,75,GER', 'Igor Matanović,FW,22,77,CRO', 'Junior Adamu,FW,24,75,AUT', 'Cyriaque Irié,FW,21,75,FRA',
      ]),
      c('Borussia Mönchengladbach', 'BMG', 'Mönchengladbach', 54042, 72, [
        'Moritz Nicolas,GK,27,77,GER', 'Ko Itakura,DF,28,79,JPN', 'Nico Elvedi,DF,28,78,SUI', 'Lukas Ullrich,DF,21,74,GER', 'Joe Scally,DF,22,76,USA', 'Kevin Diks,DF,28,76,IDN', 'Luca Netz,DF,22,74,GER',
        'Rocco Reitz,MF,23,78,GER', 'Philipp Sander,MF,27,76,GER', 'Jens Castrop,MF,22,74,GER', 'Franck Honorat,MF,29,77,FRA', 'Robin Hack,MF,26,76,GER',
        'Tim Kleindienst,FW,30,80,GER', 'Haris Tabaković,FW,31,76,BIH', 'Shuto Machino,FW,26,76,JPN', 'Kevin Stöger,MF,32,76,AUT', 'Nathan Ngoumou,FW,25,74,FRA',
      ]),
      c('VfL Wolfsburg', 'WOB', 'Wolfsburg', 30000, 70, [
        'Kamil Grabara,GK,26,78,POL', 'Marius Müller,GK,32,74,GER', 'Konstantinos Koulierakis,DF,21,78,GRE', 'Denis Vavro,DF,29,76,SVK', 'Joakim Mæhle,DF,28,77,DEN', 'Kilian Fischer,DF,24,75,GER', 'Sebastiaan Bornauw,DF,26,76,BEL', 'Aaron Zehnter,DF,20,73,GER',
        'Vinícius Souza,MF,26,77,BRA', 'Yannick Gerhardt,MF,31,75,GER', 'Lovro Majer,MF,27,78,CRO', 'Patrick Wimmer,MF,24,76,AUT', 'Mattias Svanberg,MF,26,77,SWE',
        'Mohamed Amoura,FW,25,80,ALG', 'Jonas Wind,FW,26,79,DEN', 'Adam Daghim,FW,19,74,DEN', 'Andreas Skov Olsen,FW,25,77,DEN',
      ]),
      c('1. FSV Mainz 05', 'M05', 'Mainz', 33305, 70, [
        'Robin Zentner,GK,30,79,GER', 'Lasse Rieß,GK,24,73,GER', 'Dominik Kohr,DF,31,76,GER', 'Stefan Bell,DF,33,75,GER', 'Anthony Caci,DF,28,76,FRA', 'Danny da Costa,DF,32,74,GER', 'Andreas Hanche-Olsen,DF,28,77,NOR', 'Phillipp Mwene,DF,31,75,AUT',
        'Nadiem Amiri,MF,28,79,GER', 'Kacper Potulski,DF,19,73,POL', 'Paul Nebel,MF,22,78,GER', 'Jae-sung Lee,MF,33,76,KOR', 'Silvan Widmer,DF,32,75,SUI', 'Ben Bobzien,FW,22,74,GER',
        'Nelson Weiper,FW,20,76,GER', 'Armindo Sieb,FW,22,76,GER', 'Benedict Hollerbach,FW,24,76,GER', 'Kaishu Sano,MF,24,77,JPN',
      ]),
      c('FC Augsburg', 'FCA', 'Augsburg', 30660, 66, [
        'Finn Dahmen,GK,27,77,GER', 'Nediljko Labrović,GK,25,74,CRO', 'Keven Schlotterbeck,DF,28,76,GER', 'Cédric Zesiger,DF,27,76,SUI', 'Chrislain Matsima,DF,23,76,FRA', 'Marius Wolf,DF,30,75,GER', 'Dimitrios Giannoulis,DF,29,75,GRE', 'Han-Noah Massengo,MF,24,75,FRA',
        'Elvis Rexhbeçaj,MF,27,75,KOS', 'Kristijan Jakić,MF,28,76,CRO', 'Arne Engels,MF,21,75,BEL', 'Fabian Rieder,MF,23,76,SUI', 'Alexis Claude-Maurice,FW,27,76,FRA',
        'Samuel Essende,FW,27,76,COD', 'Mert Kömür,FW,20,74,GER', 'Steve Mounié,FW,30,75,BEN', 'Anton Kade,FW,21,73,GER',
      ]),
      c('SV Werder Bremen', 'SVW', 'Bremen', 42100, 70, [
        'Mio Backhaus,GK,21,75,GER', 'Karl Hein,GK,23,75,EST', 'Marco Friedl,DF,27,77,AUT', 'Niklas Stark,DF,30,76,GER', 'Julián Malatini,DF,24,74,ARG', 'Mitchell Weiser,DF,31,77,GER', 'Felix Agu,DF,25,74,GER', 'Yukinari Sugawara,DF,25,75,JPN',
        'Senne Lynen,MF,26,76,BEL', 'Jens Stage,MF,28,77,DEN', 'Romano Schmid,MF,25,77,AUT', 'Cameron Puertas,MF,27,76,SUI', 'Leonardo Bittencourt,MF,31,75,GER',
        'Marco Grüll,FW,27,77,AUT', 'Justin Njinmah,FW,24,75,GER', 'Samuel Mbangula,FW,21,76,BEL', 'Victor Boniface,FW,24,79,NGA', 'Keke Topp,FW,21,73,GER',
      ]),
      c('TSG Hoffenheim', 'TSG', 'Sinsheim', 30150, 68, [
        'Oliver Baumann,GK,35,78,GER', 'Luca Philipp,GK,24,72,GER', 'Albian Hajdari,DF,22,76,SUI', 'Vladimír Coufal,DF,33,75,CZE', 'Bernardo,DF,30,75,BRA', 'Arthur Chaves,DF,22,74,BRA', 'Tim Drexler,DF,20,73,GER', 'Alexander Prass,DF,24,75,AUT',
        'Wouter Burger,MF,24,77,NED', 'Grischa Prömel,MF,30,76,GER', 'Umut Tohumcu,MF,21,75,GER', 'Andrej Kramarić,FW,34,78,CRO', 'Adam Hložek,FW,23,77,CZE',
        'Fisnik Asllani,FW,23,77,KOS', 'Bazoumana Touré,FW,19,75,CIV', 'Tim Lemperle,FW,23,75,GER', 'Ihlas Bebou,FW,31,74,TOG',
      ]),
      c('1. FC Union Berlin', 'FCU', 'Berlin', 22012, 68, [
        'Frederik Rønnow,GK,33,79,DEN', 'Matheo Raab,GK,26,73,GER', 'Diogo Leite,DF,26,78,POR', 'Danilho Doekhi,DF,27,78,NED', 'Leopold Querfeld,DF,21,76,AUT', 'Christopher Trimmel,DF,38,73,AUT', 'Tom Rothe,DF,20,75,GER', 'Derrick Köhn,DF,26,74,GER',
        'Rani Khedira,MF,31,76,GER', 'András Schäfer,MF,26,76,HUN', 'Aljoscha Kemlein,MF,21,74,GER', 'Ilyas Ansah,FW,20,74,GER', 'Tim Skarke,FW,28,74,GER',
        'Oliver Burke,FW,28,75,SCO', 'Andrej Ilić,FW,25,76,SRB', 'Marin Ljubičić,FW,23,76,CRO', 'Woo-yeong Jeong,FW,25,74,KOR',
      ]),
      c('FC St. Pauli', 'STP', 'Hamburg', 29546, 64, [
        'Nikola Vasilj,GK,29,77,BIH', 'Ben Voll,GK,24,72,GER', 'Hauke Wahl,DF,31,75,GER', 'Eric Smith,DF,28,76,SWE', 'Karol Mets,DF,32,74,EST', 'Lars Ritzka,DF,26,73,GER', 'Manolis Saliakas,DF,28,74,GRE', 'Arkadiusz Pyrka,DF,22,73,POL',
        'Jackson Irvine,MF,32,76,AUS', 'Joel Fujita,MF,23,75,JPN', 'Connor Metcalfe,MF,25,74,AUS', 'Carlo Boukhalfa,MF,26,73,GER', 'Adam Dźwigała,DF,29,72,POL',
        'Andreas Hountondji,FW,22,74,BEN', 'Danel Sinani,FW,28,74,LUX', 'Mathias Pereira Lage,FW,28,73,POR', 'Louis Oppie,DF,23,73,GER', 'Martijn Kaars,FW,26,74,NED',
      ]),
      c('1. FC Heidenheim', 'HDH', 'Heidenheim', 15000, 58, [
        'Diant Ramaj,GK,23,75,GER', 'Frans Krätzig,DF,22,74,GER', 'Patrick Mainka,DF,30,75,GER', 'Tim Siersleben,DF,25,74,GER', 'Marnon Busch,DF,30,73,GER', 'Jonas Föhrenbach,DF,29,73,GER', 'Omar Traoré,DF,27,73,GER',
        'Niklas Dorsch,MF,27,75,GER', 'Adrian Beck,MF,28,74,GER', 'Julian Niehues,MF,24,74,GER', 'Léo Scienza,MF,26,75,BRA', 'Mathias Honsak,FW,28,74,AUT',
        'Stefan Schimmer,FW,31,73,GER', 'Budu Zivzivadze,FW,31,74,GEO', 'Mikkel Kaufmann,FW,24,73,DEN', 'Paul Wanner,MF,19,75,GER',
      ]),
      c('1. FC Köln', 'KOE', 'Köln', 50000, 66, [
        'Marvin Schwäbe,GK,30,77,GER', 'Ron-Robert Zieler,GK,36,73,GER', 'Timo Hübers,DF,29,76,GER', 'Joel Schmied,DF,26,74,SUI', 'Dominique Heintz,DF,31,74,GER', 'Jan Thielmann,DF,23,75,GER', 'Sebastian Sebulonsen,DF,24,74,NOR', 'Leart Paqarada,DF,30,74,KOS',
        'Eric Martel,MF,23,77,GER', 'Isak Johannesson,MF,22,75,ISL', 'Tom Krauß,MF,24,75,GER', 'Linton Maina,MF,26,76,GER', 'Jakub Kamiński,MF,23,76,POL', 'Marius Bülter,FW,32,75,GER',
        'Ragnar Ache,FW,27,76,GER', 'Saïd El Mala,FW,19,74,GER', 'Florian Kainz,MF,32,75,AUT', 'Luca Waldschmidt,FW,29,75,GER',
      ]),
      c('Hamburger SV', 'HSV', 'Hamburg', 57000, 66, [
        'Daniel Heuer Fernandes,GK,32,77,POR', 'Daniel Peretz,GK,25,74,ISR', 'Jordan Torunarigha,DF,28,76,GER', 'Daniel Elfadli,DF,28,75,LBY', 'Giorgi Gocholeishvili,DF,24,75,GEO', 'Miro Muheim,DF,27,76,SUI', 'Luka Vušković,DF,18,76,CRO', 'Warmed Omari,DF,25,74,FRA',
        'Nicolai Remberg,MF,25,75,GER', 'Jonas Meffert,MF,30,74,GER', 'Ludovit Reis,MF,25,76,NED', 'Albert Sambi Lokonga,MF,25,76,BEL', 'Immanuel Pherai,MF,24,74,NED',
        'Ransford-Yeboah Königsdörffer,FW,23,76,GHA', 'Robert Glatzel,FW,31,75,GER', 'Jean-Luc Dompé,FW,30,74,FRA', 'Fábio Vieira,MF,25,77,POR', 'Yussuf Poulsen,FW,31,76,DEN',
      ]),
    ],
    // 2. Bundesliga 2025-26
    [
      c('Hertha BSC', 'BSC', 'Berlin', 74475, 56), c('FC Schalke 04', 'S04', 'Gelsenkirchen', 62271, 58), c('Hannover 96', 'H96', 'Hannover', 49000, 54), c('Fortuna Düsseldorf', 'F95', 'Düsseldorf', 54600, 54),
      c('1. FC Kaiserslautern', 'FCK', 'Kaiserslautern', 49780, 52), c('1. FC Nürnberg', 'FCN', 'Nürnberg', 50000, 52), c('SC Paderborn 07', 'SCP', 'Paderborn', 15000, 48), c('SV Elversberg', 'ELV', 'Elversberg', 10000, 46),
      c('Karlsruher SC', 'KSC', 'Karlsruhe', 34302, 50), c('SV Darmstadt 98', 'D98', 'Darmstadt', 17810, 50), c('Eintracht Braunschweig', 'EBS', 'Braunschweig', 23325, 45), c('1. FC Magdeburg', 'FCM', 'Magdeburg', 30098, 50),
      c('Preußen Münster', 'PRM', 'Münster', 14300, 42), c('SpVgg Greuther Fürth', 'SGF', 'Fürth', 16626, 48), c('Holstein Kiel', 'KIE', 'Kiel', 15034, 52), c('VfL Bochum', 'BOC', 'Bochum', 26000, 54),
      c('Arminia Bielefeld', 'DSC', 'Bielefeld', 27332, 45), c('Dynamo Dresden', 'SGD', 'Dresden', 32066, 46),
    ],
  ],
};
