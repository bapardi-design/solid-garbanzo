import type { NationData } from './types.js';

const c = (name: string, short: string, city: string, capacity: number, reputation: number, players?: string[]) => ({ name, short, city, capacity, reputation, players });

export const ITA: NationData = {
  id: 'ITA',
  tiers: [
    // Serie A 2025-26
    [
      c('Inter', 'INT', 'Milano', 75817, 89, [
        'Yann Sommer,GK,36,84,SUI', 'Josep Martínez,GK,27,77,ESP', 'Alessandro Bastoni,DF,26,87,ITA', 'Francesco Acerbi,DF,37,79,ITA', 'Stefan de Vrij,DF,33,80,NED', 'Yann Bisseck,DF,24,79,GER', 'Manuel Akanji,DF,30,83,SUI', 'Federico Dimarco,DF,27,84,ITA', 'Denzel Dumfries,DF,29,83,NED', 'Carlos Augusto,DF,26,79,BRA',
        'Nicolò Barella,MF,28,87,ITA', 'Hakan Çalhanoğlu,MF,31,86,TUR', 'Henrikh Mkhitaryan,MF,36,80,ARM', 'Piotr Zieliński,MF,31,80,POL', 'Petar Sučić,MF,21,78,CRO', 'Davide Frattesi,MF,25,80,ITA', 'Andy Diouf,MF,22,76,FRA',
        'Lautaro Martínez,FW,28,89,ARG', 'Marcus Thuram,FW,28,85,FRA', 'Francesco Pio Esposito,FW,20,78,ITA', 'Ange-Yoan Bonny,FW,21,77,FRA',
      ]),
      c('AC Milan', 'MIL', 'Milano', 75817, 86, [
        'Mike Maignan,GK,30,87,FRA', 'Pietro Terracciano,GK,35,75,ITA', 'Fikayo Tomori,DF,27,81,ENG', 'Matteo Gabbia,DF,25,79,ITA', 'Strahinja Pavlović,DF,24,80,SRB', 'Koni De Winter,DF,23,78,BEL', 'Pervis Estupiñán,DF,27,80,ECU', 'Alexis Saelemaekers,DF,26,78,BEL', 'Zachary Athekame,DF,20,74,SUI',
        'Luka Modrić,MF,40,82,CRO', 'Adrien Rabiot,MF,30,82,FRA', 'Youssouf Fofana,MF,26,80,FRA', 'Samuele Ricci,MF,24,78,ITA', 'Ardon Jashari,MF,23,79,SUI', 'Ruben Loftus-Cheek,MF,29,78,ENG',
        'Rafael Leão,FW,26,86,POR', 'Christian Pulisic,FW,26,85,USA', 'Santiago Giménez,FW,24,79,MEX', 'Christopher Nkunku,FW,27,82,FRA',
      ]),
      c('Juventus', 'JUV', 'Torino', 41507, 87, [
        'Michele Di Gregorio,GK,28,82,ITA', 'Mattia Perin,GK,32,77,ITA', 'Gleison Bremer,DF,28,86,BRA', 'Lloyd Kelly,DF,26,76,ENG', 'Pierre Kalulu,DF,25,80,FRA', 'Federico Gatti,DF,27,79,ITA', 'Andrea Cambiaso,DF,25,80,ITA', 'Daniele Rugani,DF,31,75,ITA', 'João Mário,DF,25,76,POR',
        'Manuel Locatelli,MF,27,80,ITA', 'Khéphren Thuram,MF,24,81,FRA', 'Teun Koopmeiners,MF,27,79,NED', 'Weston McKennie,MF,27,78,USA', 'Kenan Yıldız,FW,20,84,TUR', 'Francisco Conceição,FW,22,80,POR', 'Edon Zhegrova,FW,26,79,KOS',
        'Dušan Vlahović,FW,25,82,SRB', 'Jonathan David,FW,25,83,CAN', 'Loïs Openda,FW,25,83,BEL',
      ]),
      c('Napoli', 'NAP', 'Napoli', 54726, 87, [
        'Alex Meret,GK,28,82,ITA', 'Vanja Milinković-Savić,GK,28,79,SRB', 'Amir Rrahmani,DF,31,81,KOS', 'Alessandro Buongiorno,DF,26,83,ITA', 'Sam Beukema,DF,26,79,NED', 'Giovanni Di Lorenzo,DF,32,80,ITA', 'Leonardo Spinazzola,DF,32,76,ITA', 'Mathías Olivera,DF,27,78,URU', 'Miguel Gutiérrez,DF,24,78,ESP',
        'Stanislav Lobotka,MF,30,83,SVK', 'Scott McTominay,MF,28,85,SCO', 'Frank Anguissa,MF,29,82,CMR', 'Kevin De Bruyne,MF,34,86,BEL', 'Billy Gilmour,MF,24,77,SCO', 'Eljif Elmas,MF,25,77,MKD',
        'Romelu Lukaku,FW,32,82,BEL', 'Rasmus Højlund,FW,22,79,DEN', 'Matteo Politano,FW,32,79,ITA', 'David Neres,FW,28,79,BRA', 'Noa Lang,FW,26,79,NED', 'Lorenzo Lucca,FW,24,77,ITA',
      ]),
      c('Atalanta', 'ATA', 'Bergamo', 24950, 80, [
        'Marco Carnesecchi,GK,25,81,ITA', 'Marco Sportiello,GK,33,74,ITA', 'Isak Hien,DF,26,80,SWE', 'Berat Djimsiti,DF,32,78,ALB', 'Odilon Kossounou,DF,24,78,CIV', 'Giorgio Scalvini,DF,21,79,ITA', 'Davide Zappacosta,DF,33,76,ITA', 'Raoul Bellanova,DF,25,77,ITA', 'Honest Ahanor,DF,17,72,ITA',
        'Éderson,MF,26,82,BRA', 'Marten de Roon,MF,34,78,NED', 'Mario Pašalić,MF,30,79,CRO', 'Lazar Samardžić,MF,23,77,SRB', 'Marco Brescianini,MF,25,76,ITA',
        'Gianluca Scamacca,FW,26,80,ITA', 'Ademola Lookman,FW,27,83,NGA', 'Charles De Ketelaere,FW,24,80,BEL', 'Nikola Krstović,FW,25,78,MNE', 'Kamaldeen Sulemana,FW,23,76,GHA',
      ]),
      c('Roma', 'ROM', 'Roma', 70634, 80, [
        'Mile Svilar,GK,26,83,SRB', 'Gianluca Mancini,DF,29,79,ITA', 'Evan Ndicka,DF,26,81,CIV', 'Mario Hermoso,DF,30,77,ESP', 'Zeki Çelik,DF,28,76,TUR', 'Angeliño,DF,28,79,ESP', 'Wesley,DF,21,76,BRA', 'Daniele Ghilardi,DF,22,74,ITA',
        'Manu Koné,MF,24,81,FRA', 'Bryan Cristante,MF,30,78,ITA', 'Lorenzo Pellegrini,MF,29,79,ITA', 'Neil El Aynaoui,MF,24,76,MAR', 'Niccolò Pisilli,MF,21,74,ITA',
        'Paulo Dybala,FW,31,83,ARG', 'Matías Soulé,FW,22,79,ARG', 'Artem Dovbyk,FW,28,79,UKR', 'Evan Ferguson,FW,20,76,IRL', 'Leon Bailey,FW,28,77,JAM', 'Stephan El Shaarawy,FW,32,75,ITA',
      ]),
      c('Lazio', 'LAZ', 'Roma', 70634, 76, [
        'Ivan Provedel,GK,31,80,ITA', 'Christos Mandas,GK,23,75,GRE', 'Alessio Romagnoli,DF,30,78,ITA', 'Mario Gila,DF,24,79,ESP', 'Nuno Tavares,DF,25,78,POR', 'Adam Marušić,DF,32,76,MNE', 'Manuel Lazzari,DF,31,75,ITA', 'Luca Pellegrini,DF,26,74,ITA',
        'Nicolò Rovella,MF,23,79,ITA', 'Matteo Guendouzi,MF,26,79,FRA', 'Mattia Zaccagni,FW,30,80,ITA', 'Fisayo Dele-Bashiru,MF,24,75,NGA', 'Danilo Cataldi,MF,31,75,ITA', 'Toma Bašić,MF,28,73,CRO',
        'Valentín Castellanos,FW,26,78,ARG', 'Boulaye Dia,FW,28,77,SEN', 'Gustav Isaksen,FW,24,76,DEN', 'Pedro,FW,38,76,ESP', 'Tijjani Noslin,FW,26,74,NED',
      ]),
      c('Fiorentina', 'FIO', 'Firenze', 43147, 74, [
        'David de Gea,GK,34,83,ESP', 'Pietro Comuzzo,DF,20,78,ITA', 'Luca Ranieri,DF,26,77,ITA', 'Marin Pongračić,DF,27,78,CRO', 'Robin Gosens,DF,31,77,GER', 'Dodô,DF,26,78,BRA', 'Mattia Viti,DF,23,74,ITA',
        'Rolando Mandragora,MF,28,77,ITA', 'Nicolò Fagioli,MF,24,78,ITA', 'Cher Ndour,MF,21,75,ITA', 'Simon Sohm,MF,24,76,SUI', 'Hans Nicolussi Caviglia,MF,25,75,ITA', 'Jacopo Fazzini,MF,22,75,ITA',
        'Moise Kean,FW,25,83,ITA', 'Edin Džeko,FW,39,76,BIH', 'Roberto Piccoli,FW,24,76,ITA', 'Albert Guðmundsson,FW,28,78,ISL', 'Christian Kouamé,FW,27,74,CIV',
      ]),
      c('Bologna', 'BOL', 'Bologna', 36462, 72, [
        'Łukasz Skorupski,GK,34,79,POL', 'Federico Ravaglia,GK,25,73,ITA', 'Jhon Lucumí,DF,27,80,COL', 'Martin Vitík,DF,22,76,CZE', 'Torbjørn Heggem,DF,26,76,NOR', 'Nadir Zortea,DF,26,76,ITA', 'Charalampos Lykogiannis,DF,31,74,GRE', 'Juan Miranda,DF,25,75,ESP', 'Emil Holm,DF,25,76,SWE',
        'Remo Freuler,MF,33,78,SUI', 'Lewis Ferguson,MF,26,79,SCO', 'Nikola Moro,MF,27,76,CRO', 'Giovanni Fabbian,MF,22,75,ITA', 'Jens Odgaard,MF,26,76,DEN',
        'Riccardo Orsolini,FW,28,80,ITA', 'Santiago Castro,FW,20,78,ARG', 'Ciro Immobile,FW,35,76,ITA', 'Federico Bernardeschi,FW,31,75,ITA', 'Jonathan Rowe,FW,22,76,ENG', 'Dan Ndoye,FW,24,78,SUI',
      ]),
      c('Torino', 'TOR', 'Torino', 27958, 66, [
        'Franco Israel,GK,25,75,URU', 'Alberto Paleari,GK,33,72,ITA', 'Saúl Coco,DF,26,76,EQG', 'Guillermo Maripán,DF,31,76,CHI', 'Adam Masina,DF,31,74,MAR', 'Ardian Ismajli,DF,28,75,ALB', 'Valentino Lazaro,DF,29,75,AUT', 'Cristiano Biraghi,DF,32,74,ITA', 'Marcus Pedersen,DF,25,74,NOR',
        'Cesare Casadei,MF,22,77,ITA', 'Ivan Ilić,MF,24,76,SRB', 'Kristjan Asllani,MF,23,76,ALB', 'Nikola Vlašić,MF,27,78,CRO', 'Gvidas Gineitis,MF,21,73,LTU',
        'Duván Zapata,FW,34,76,COL', 'Che Adams,FW,29,76,SCO', 'Giovanni Simeone,FW,30,76,ARG', 'Cyril Ngonge,FW,25,75,BEL', 'Zakaria Aboukhlal,FW,25,75,MAR',
      ]),
      c('Udinese', 'UDI', 'Udine', 25144, 64, [
        'Maduka Okoye,GK,25,76,NGA', 'Răzvan Sava,GK,23,74,ROU', 'Thomas Kristensen,DF,23,76,DEN', 'Christian Kabasele,DF,34,74,BEL', 'Oumar Solet,DF,25,79,FRA', 'Kingsley Ehizibue,DF,30,74,NGA', 'Hassane Kamara,DF,31,74,CIV', 'Jordan Zemura,DF,25,74,ZIM', 'Jesper Karlström,MF,30,75,SWE',
        'Sandi Lovrić,MF,27,77,SVN', 'Arthur Atta,MF,22,75,FRA', 'Jakub Piotrowski,MF,27,75,POL', 'Jurgen Ekkelenkamp,MF,25,76,NED', 'Iker Bravo,FW,20,76,ESP',
        'Keinan Davis,FW,27,75,ENG', 'Nicolò Zaniolo,FW,26,76,ITA', 'Adam Buksa,FW,29,75,POL', 'Vakoun Bayo,FW,28,74,CIV',
      ]),
      c('Genoa', 'GEN', 'Genova', 33205, 64, [
        'Nicola Leali,GK,32,76,ITA', 'Johan Vásquez,DF,26,77,MEX', 'Alessandro Marcandalli,DF,23,74,ITA', 'Leo Østigård,DF,25,76,NOR', 'Aarón Martín,DF,28,75,ESP', 'Stefano Sabelli,DF,32,73,ITA', 'Brooke Norton-Cuffy,DF,21,74,ENG', 'Sebastián Otoa,DF,20,72,DEN',
        'Morten Frendrup,MF,24,77,DEN', 'Patrizio Masini,MF,24,74,ITA', 'Nicolae Stanciu,MF,32,75,ROU', 'Ruslan Malinovskyi,MF,32,77,UKR', 'Morten Thorsby,MF,29,74,NOR',
        'Vitinha,FW,25,76,POR', 'Lorenzo Colombo,FW,23,75,ITA', 'Caleb Ekuban,FW,31,73,GHA', 'Albert Grønbæk,FW,24,75,DEN', 'Jeff Ekhator,FW,18,73,ITA',
      ]),
      c('Como', 'COM', 'Como', 13602, 66, [
        'Jean Butez,GK,30,76,FRA', 'Alberto Moreno,DF,33,75,ESP', 'Marc-Oliver Kempf,DF,30,75,GER', 'Jacobo Ramón,DF,20,75,ESP', 'Edoardo Goldaniga,DF,31,73,ITA', 'Alex Valle,DF,21,75,ESP', 'Diego Carlos,DF,32,76,BRA', 'Ignace Van der Brempt,DF,23,75,BEL', 'Máximo Perrone,MF,22,76,ARG',
        'Lucas Da Cunha,MF,24,76,FRA', 'Sergi Roberto,MF,33,76,ESP', 'Nico Paz,MF,20,81,ARG', 'Martin Baturina,MF,22,78,CRO', 'Jayden Addai,FW,20,74,NED',
        'Assane Diao,FW,20,78,ESP', 'Tasos Douvikas,FW,26,77,GRE', 'Álvaro Morata,FW,32,78,ESP', 'Jesús Rodríguez,FW,19,76,ESP', 'Gabriel Strefezza,FW,28,75,ITA',
      ]),
      c('Hellas Verona', 'VER', 'Verona', 39211, 60, [
        'Lorenzo Montipò,GK,29,76,ITA', 'Domagoj Bradarić,DF,25,74,CRO', 'Nicolás Valentini,DF,24,74,ARG', 'Diego Coppola,DF,21,75,ITA', 'Victor Nelsson,DF,26,75,DEN', 'Martin Frese,DF,27,73,DEN', 'Rafik Belghali,DF,23,73,BEL', 'Unai Núñez,DF,28,75,ESP',
        'Suat Serdar,MF,28,75,GER', 'Roberto Gagliardini,MF,31,73,ITA', 'Antoine Bernede,MF,26,74,FRA', 'Cheikh Niasse,MF,25,74,SEN', 'Giovane,FW,21,74,BRA',
        'Gift Orban,FW,23,76,NGA', 'Daniel Mosquera,FW,24,73,COL', 'Amin Sarr,FW,24,73,SWE', 'Enzo Fortin,FW,19,71,FRA',
      ]),
      c('Cagliari', 'CAG', 'Cagliari', 16416, 60, [
        'Elia Caprile,GK,24,77,ITA', 'Sebastiano Luperto,DF,28,75,ITA', 'Yerry Mina,DF,30,77,COL', 'Jose Luis Palomino,DF,35,72,ARG', 'Gabriele Zappa,DF,25,74,ITA', 'Juan Rodríguez,DF,22,72,ARG', 'Adam Obert,DF,22,73,SVK', 'Marco Palestra,DF,20,74,ITA',
        'Alessandro Deiola,MF,29,74,ITA', 'Michael Folorunsho,MF,27,76,ITA', 'Michel Adopo,MF,25,74,FRA', 'Matteo Prati,MF,21,74,ITA', 'Gennaro Borrelli,FW,25,73,ITA',
        'Gianluca Gaetano,MF,25,75,ITA', 'Andrea Belotti,FW,31,75,ITA', 'Sebastiano Esposito,FW,23,76,ITA', 'Leonardo Pavoletti,FW,36,72,ITA', 'Semih Kılıçsoy,FW,20,74,TUR',
      ]),
      c('Parma', 'PAR', 'Parma', 27906, 60, [
        'Zion Suzuki,GK,23,79,JPN', 'Edoardo Corvi,GK,23,72,ITA', 'Enrico Delprato,DF,25,75,ITA', 'Mathias Løvik,DF,22,74,NOR', 'Alessandro Circati,DF,21,76,AUS', 'Botond Balogh,DF,25,74,HUN', 'Sascha Britschgi,DF,19,72,SUI', 'Emanuele Valeri,DF,26,74,ITA', 'Mariano Troilo,DF,22,73,ARG',
        'Adrián Bernabé,MF,24,77,ESP', 'Mandela Keita,MF,23,75,BEL', 'Nahuel Estévez,MF,29,74,ARG', 'Christian Ordóñez,MF,20,74,ARG', 'Oliver Sørensen,MF,23,74,DEN',
        'Mateo Pellegrino,FW,24,76,ARG', 'Patrick Cutrone,FW,27,75,ITA', 'Pontus Almqvist,FW,26,74,SWE', 'Benjamin Cremaschi,MF,20,73,USA', 'Milan Đurić,FW,35,73,BIH',
      ]),
      c('Lecce', 'LEC', 'Lecce', 31533, 56, [
        'Wladimiro Falcone,GK,30,75,ITA', 'Kialonda Gaspar,DF,27,75,ANG', 'Jamil Siebert,DF,23,72,GER', 'Tiago Gabriel,DF,21,74,POR', 'Antonino Gallo,DF,25,75,ITA', 'Danilo Veiga,DF,25,73,POR', 'Corrie Ndaba,DF,25,73,IRL',
        'Ylber Ramadani,MF,29,75,ALB', 'Lassana Coulibaly,MF,29,74,MLI', 'Balthazar Pierret,MF,25,73,FRA', 'Medon Berisha,MF,22,73,ALB', 'Lameck Banda,FW,24,74,ZAM',
        'Nikola Štulić,FW,24,74,SRB', 'Francesco Camarda,FW,17,74,ITA', 'Tete Morente,FW,28,74,ESP', 'Santiago Pierotti,FW,24,73,ARG', 'Riccardo Sottil,FW,26,75,ITA',
      ]),
      c('Sassuolo', 'SAS', 'Sassuolo', 21584, 60, [
        'Arijanet Murić,GK,26,76,KOS', 'Filippo Romagna,DF,28,74,ITA', 'Tarik Muharemović,DF,22,75,BIH', 'Fali Candé,DF,27,73,GNB', 'Josh Doig,DF,23,75,SCO', 'Jay Idzes,DF,25,76,IDN', 'Sebastian Walukiewicz,DF,25,74,POL', 'Woyo Coulibaly,DF,26,73,FRA',
        'Ismaël Koné,MF,23,75,CAN', 'Kristian Thorstvedt,MF,26,76,NOR', 'Daniel Boloca,MF,26,75,ROU', 'Nemanja Matić,MF,37,75,SRB', 'Alieu Fadera,FW,23,74,GAM',
        'Domenico Berardi,FW,31,78,ITA', 'Andrea Pinamonti,FW,26,76,ITA', 'Armand Laurienté,FW,26,76,FRA', 'Luca Moro,FW,24,73,ITA', 'Nadir Zortea,DF,26,74,ITA',
      ]),
      c('Pisa', 'PIS', 'Pisa', 14869, 52, [
        'Adrian Šemper,GK,27,74,CRO', 'Simone Scuffet,GK,29,74,ITA', 'Antonio Caracciolo,DF,35,72,ITA', 'Simone Canestrelli,DF,25,74,ITA', 'Giovanni Bonfanti,DF,22,73,ITA', 'Raúl Albiol,DF,40,73,ESP', 'Samuele Angori,DF,22,73,ITA', 'Idrissa Touré,DF,27,73,GER',
        'Marius Marin,MF,27,74,ROU', 'Ebenezer Akinsanmiro,MF,20,74,NGA', 'Michel Aebischer,MF,28,75,SUI', 'Matteo Tramoni,MF,25,75,FRA', 'Isak Vural,MF,19,72,TUR',
        'Mehdi Léris,FW,27,73,ALG', 'Henrik Meister,FW,21,73,DEN', 'M\'Bala Nzola,FW,29,74,ANG', 'Stefano Moreo,FW,32,72,ITA',
      ]),
      c('Cremonese', 'CRE', 'Cremona', 16003, 52, [
        'Emil Audero,GK,28,76,ITA', 'Marco Silvestri,GK,34,73,ITA', 'Matteo Bianchetti,DF,32,73,ITA', 'Federico Baschirotto,DF,28,74,ITA', 'Filippo Terracciano,DF,22,74,ITA', 'Luca Zanimacchia,DF,27,72,ITA', 'Alberto Grassi,MF,30,73,ITA', 'Warren Bondo,MF,21,75,FRA',
        'Michele Collocolo,MF,25,74,ITA', 'Martín Payero,MF,26,74,ARG', 'Jamie Vardy,FW,38,75,ENG', 'Federico Bonazzoli,FW,28,74,ITA', 'Antonio Sanabria,FW,29,74,PAR',
        'Manuel De Luca,FW,26,72,ITA', 'Faris Pemi Moumbagna,FW,25,73,CMR', 'Franco Vázquez,MF,36,72,ITA', 'Jari Vandeputte,FW,29,73,BEL',
      ]),
    ],
    // Serie B 2025-26
    [
      c('Sampdoria', 'SAM', 'Genova', 33205, 52), c('Palermo', 'PAL', 'Palermo', 36365, 52), c('Bari', 'BAR', 'Bari', 58270, 48), c('Catanzaro', 'CTZ', 'Catanzaro', 14650, 45),
      c('Cesena', 'CES', 'Cesena', 20194, 46), c('Frosinone', 'FRO', 'Frosinone', 16227, 48), c('Juve Stabia', 'JST', 'Castellammare', 7642, 42), c('Modena', 'MOD', 'Modena', 21151, 46),
      c('Monza', 'MON', 'Monza', 16917, 52), c('Padova', 'PAD', 'Padova', 32420, 42), c('Reggiana', 'REG', 'Reggio Emilia', 21584, 44), c('Südtirol', 'SUD', 'Bolzano', 5539, 42),
      c('Spezia', 'SPE', 'La Spezia', 11466, 48), c('Venezia', 'VEN', 'Venezia', 11150, 50), c('Empoli', 'EMP', 'Empoli', 16284, 50), c('Carrarese', 'CAR', 'Carrara', 5000, 40),
      c('Mantova', 'MAN', 'Mantova', 7000, 40), c('Avellino', 'AVE', 'Avellino', 26308, 42), c('Pescara', 'PES', 'Pescara', 20476, 42), c('Virtus Entella', 'ENT', 'Chiavari', 5535, 38),
    ],
  ],
};
