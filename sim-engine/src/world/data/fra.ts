import type { NationData } from './types.js';

const c = (name: string, short: string, city: string, capacity: number, reputation: number, players?: string[]) => ({ name, short, city, capacity, reputation, players });

export const FRA: NationData = {
  id: 'FRA',
  tiers: [
    // Ligue 1 2025-26
    [
      c('Paris Saint-Germain', 'PSG', 'Paris', 47929, 95, [
        'Lucas Chevalier,GK,23,83,FRA', 'Matvei Safonov,GK,26,78,RUS', 'Marquinhos,DF,31,86,BRA', 'Willian Pacho,DF,23,84,ECU', 'Nuno Mendes,DF,23,86,POR', 'Achraf Hakimi,DF,26,88,MAR', 'Lucas Hernández,DF,29,80,FRA', 'Lucas Beraldo,DF,21,77,BRA', 'Illia Zabarnyi,DF,22,80,UKR',
        'Vitinha,MF,25,89,POR', 'João Neves,MF,20,86,POR', 'Fabián Ruiz,MF,29,84,ESP', 'Warren Zaïre-Emery,MF,19,80,FRA', 'Lee Kang-in,MF,24,80,KOR', 'Senny Mayulu,MF,19,76,FRA',
        'Ousmane Dembélé,FW,28,90,FRA', 'Khvicha Kvaratskhelia,FW,24,87,GEO', 'Désiré Doué,FW,20,84,FRA', 'Bradley Barcola,FW,22,84,FRA', 'Gonçalo Ramos,FW,24,80,POR', 'Ibrahim Mbaye,FW,17,73,FRA',
      ]),
      c('Olympique de Marseille', 'OM', 'Marseille', 67394, 80, [
        'Gerónimo Rulli,GK,33,82,ARG', 'Leonardo Balerdi,DF,26,80,ARG', 'Nayef Aguerd,DF,29,79,MAR', 'Facundo Medina,DF,26,79,ARG', 'CJ Egan-Riley,DF,22,74,ENG', 'Benjamin Pavard,DF,29,81,FRA', 'Emerson Palmieri,DF,31,77,ITA', 'Timothy Weah,DF,25,78,USA', 'Ulisses Garcia,DF,29,74,SUI',
        'Pierre-Emile Højbjerg,MF,30,81,DEN', 'Geoffrey Kondogbia,MF,32,76,CAF', 'Angel Gomes,MF,24,78,ENG', 'Matt O\'Riley,MF,24,78,DEN', 'Bilal Nadir,MF,21,75,MAR', 'Arthur Vermeeren,MF,20,77,BEL',
        'Mason Greenwood,FW,23,84,ENG', 'Pierre-Emerick Aubameyang,FW,36,80,GAB', 'Amine Gouiri,FW,25,80,ALG', 'Igor Paixão,FW,25,80,BRA', 'Robinio Vaz,FW,18,73,FRA', 'Hamed Traoré,FW,25,76,CIV',
      ]),
      c('AS Monaco', 'ASM', 'Monaco', 16360, 78, [
        'Philipp Köhn,GK,27,78,SUI', 'Lukáš Hrádecký,GK,35,78,FIN', 'Thilo Kehrer,DF,28,79,GER', 'Christian Mawissa,DF,20,76,FRA', 'Vanderson,DF,24,79,BRA', 'Caio Henrique,DF,28,78,BRA', 'Jordan Teze,DF,25,77,NED', 'Kassoum Ouattara,DF,20,75,FRA', 'Eric Dier,DF,31,77,ENG',
        'Denis Zakaria,MF,28,81,SUI', 'Lamine Camara,MF,21,79,SEN', 'Aleksandr Golovin,MF,29,81,RUS', 'Paul Pogba,MF,32,78,FRA', 'Mamadou Coulibaly,MF,21,74,FRA', 'Maghnes Akliouche,FW,23,82,FRA',
        'Folarin Balogun,FW,24,79,USA', 'Mika Biereth,FW,22,78,DEN', 'Takumi Minamino,FW,30,78,JPN', 'Ansu Fati,FW,22,77,ESP', 'Krépin Diatta,FW,26,76,SEN',
      ]),
      c('LOSC Lille', 'LIL', 'Lille', 50186, 74, [
        'Berke Özer,GK,25,78,TUR', 'Arnaud Bodart,GK,27,75,BEL', 'Alexsandro,DF,25,80,BRA', 'Aïssa Mandi,DF,33,77,ALG', 'Nathan Ngoy,DF,22,75,BEL', 'Thomas Meunier,DF,33,76,BEL', 'Romain Perraud,DF,27,76,FRA', 'Calvin Verdonk,DF,28,75,NED', 'Tiago Santos,DF,23,75,POR',
        'Benjamin André,MF,35,77,FRA', 'Ayyoub Bouaddi,MF,17,76,FRA', 'Nabil Bentaleb,MF,30,76,ALG', 'Hákon Haraldsson,MF,22,78,ISL', 'Ngal\'ayel Mukau,MF,20,75,COD', 'André Gomes,MF,31,75,POR',
        'Olivier Giroud,FW,38,77,FRA', 'Hamza Igamane,FW,22,77,MAR', 'Matias Fernandez-Pardo,FW,20,75,BEL', 'Osame Sahraoui,FW,24,76,MAR', 'Félix Correia,FW,24,76,POR',
      ]),
      c('Olympique Lyonnais', 'OL', 'Lyon', 59186, 76, [
        'Dominik Greif,GK,28,77,SVK', 'Rémy Descamps,GK,29,73,FRA', 'Moussa Niakhaté,DF,29,78,SEN', 'Clinton Mata,DF,32,77,ANG', 'Ruben Kluivert,DF,24,74,NED', 'Nicolás Tagliafico,DF,32,77,ARG', 'Ainsley Maitland-Niles,DF,28,76,ENG', 'Hans Hateboer,DF,31,74,NED', 'Abner,DF,25,75,BRA',
        'Corentin Tolisso,MF,31,79,FRA', 'Tyler Morton,MF,22,76,ENG', 'Tanner Tessmann,MF,23,76,USA', 'Orel Mangala,MF,27,76,BEL', 'Pavel Šulc,MF,24,77,CZE', 'Adam Karabec,MF,22,75,CZE',
        'Malick Fofana,FW,20,79,BEL', 'Georges Mikautadze,FW,24,79,GEO', 'Martín Satriano,FW,24,74,URU', 'Afonso Moreira,FW,20,74,POR', 'Ernest Nuamah,FW,21,76,GHA',
      ]),
      c('OGC Nice', 'NIC', 'Nice', 36178, 72, [
        'Yehvann Diouf,GK,25,77,SEN', 'Dante,DF,41,74,BRA', 'Juma Bah,DF,18,74,SLE', 'Ali Abdi,DF,31,75,TUN', 'Jonathan Clauss,DF,32,78,FRA', 'Melvin Bard,DF,24,76,FRA', 'Antoine Mendy,DF,21,74,FRA', 'Moïse Bombito,DF,25,74,CAN',
        'Tanguy Ndombélé,MF,28,75,FRA', 'Hicham Boudaoui,MF,25,77,ALG', 'Morgan Sanson,MF,31,75,FRA', 'Charles Vanhoutte,MF,26,74,BEL', 'Salis Abdul Samed,MF,25,75,GHA',
        'Sofiane Diop,FW,25,77,MAR', 'Jérémie Boga,FW,28,76,CIV', 'Terem Moffi,FW,26,77,NGA', 'Isak Jansson,FW,23,75,SWE', 'Kevin Carlos,FW,24,75,ESP',
      ]),
      c('RC Lens', 'RCL', 'Lens', 38223, 70, [
        'Robin Risser,GK,20,75,FRA', 'Régis Gurtner,GK,38,72,FRA', 'Jonathan Gradit,DF,32,76,FRA', 'Malang Sarr,DF,26,75,FRA', 'Samson Baidoo,DF,21,75,AUT', 'Deiver Machado,DF,31,75,COL', 'Ruben Aguilar,DF,32,75,FRA', 'Matthieu Udol,DF,29,74,FRA', 'Jhoanner Chávez,DF,23,73,ECU',
        'Adrien Thomasson,MF,31,76,FRA', 'Andy Diouf,MF,22,76,FRA', 'Mamadou Sangaré,MF,23,74,MLI', 'Florian Thauvin,MF,32,78,FRA', 'Ismaël Saibari,MF,24,76,MAR',
        'Odsonne Édouard,FW,27,76,FRA', 'Wesley Saïd,FW,30,75,FRA', 'Rayan Fofana,FW,19,73,FRA', 'Morgan Guilavogui,FW,27,73,GUI', 'Robin Le Normand,DF,28,80,ESP',
      ]),
      c('Stade Rennais', 'REN', 'Rennes', 29778, 70, [
        'Brice Samba,GK,31,79,FRA', 'Doğan Alemdar,GK,22,73,TUR', 'Jérémy Jacquet,DF,20,76,FRA', 'Anthony Rouault,DF,24,76,FRA', 'Lilian Brassier,DF,25,76,FRA', 'Mikayil Faye,DF,21,74,SEN', 'Hans Hateboer,DF,31,74,NED', 'Quentin Merlin,DF,23,76,FRA', 'Przemysław Frankowski,DF,30,76,POL',
        'Seko Fofana,MF,30,77,CIV', 'Valentin Rongier,MF,30,77,FRA', 'Djaoui Cissé,MF,21,74,FRA', 'Mahdi Camara,MF,27,75,FRA', 'Ludovic Blas,MF,27,77,FRA', 'Mousa Tamari,FW,28,75,JOR',
        'Breel Embolo,FW,28,77,SUI', 'Esteban Lepaul,FW,25,76,FRA', 'Kader Meïté,FW,18,74,FRA', 'Ibrahim Salah,FW,24,74,MAR',
      ]),
      c('RC Strasbourg', 'RCS', 'Strasbourg', 26109, 66, [
        'Mike Penders,GK,20,75,BEL', 'Karl-Johan Johnsson,GK,35,73,SWE', 'Abakar Sylla,DF,22,76,CIV', 'Mamadou Sarr,DF,20,76,FRA', 'Guela Doué,DF,22,77,FRA', 'Ismaël Doukouré,DF,22,75,FRA', 'Lucas Perrin,DF,26,74,FRA', 'Diego Moreira,DF,20,76,BEL', 'Ben Chilwell,DF,28,77,ENG',
        'Valentín Barco,MF,21,76,ARG', 'Samir El Mourabet,MF,21,75,MAR', 'Rabby Nzingoula,MF,20,74,FRA', 'Sebastian Nanasi,MF,23,75,SWE', 'Dilane Bakwa,FW,22,78,FRA',
        'Emanuel Emegha,FW,22,78,NED', 'Joaquín Panichelli,FW,22,76,ARG', 'Julio Enciso,FW,21,76,PAR', 'Martial Godo,FW,22,75,CIV', 'Kendry Páez,MF,18,74,ECU',
      ]),
      c('Toulouse FC', 'TFC', 'Toulouse', 33150, 64, [
        'Guillaume Restes,GK,20,77,FRA', 'Kjetil Haug,GK,27,73,NOR', 'Charlie Cresswell,DF,22,76,ENG', 'Mark McKenzie,DF,26,76,USA', 'Dayann Methalie,DF,19,73,FRA', 'Warren Kamanzi,DF,24,74,NOR', 'Jaydee Canvot,DF,18,74,FRA', 'Aron Dønnum,DF,27,75,NOR', 'Dayot Upamecano,DF,26,85,FRA',
        'Cristian Cásseres Jr,MF,25,75,VEN', 'Yann Gboho,MF,24,76,CIV', 'Mario Sauer,MF,22,75,SVK', 'Alexis Vossah,MF,20,72,FRA', 'Djibril Sidibé,DF,33,73,FRA',
        'Emersonn,FW,21,74,BRA', 'Frank Magri,FW,25,75,CMR', 'Santiago Hidalgo,FW,20,73,ARG', 'Yanis Bouzana,FW,19,72,FRA', 'Aaron Donnum,FW,27,74,NOR',
      ]),
      c('Stade Brestois', 'BRE', 'Brest', 15220, 62, [
        'Radosław Majecki,GK,25,76,POL', 'Grégoire Coudert,GK,26,73,FRA', 'Brendan Chardonnet,DF,30,75,FRA', 'Julien Le Cardinal,DF,27,74,FRA', 'Bradley Locko,DF,23,75,FRA', 'Kenny Lala,DF,33,74,FRA', 'Soumaïla Coulibaly,DF,21,74,FRA', 'Massadio Haïdara,DF,32,73,FRA',
        'Pierre Lees-Melou,MF,32,76,FRA', 'Hugo Magnetti,MF,27,74,FRA', 'Mahdi Camara,MF,27,75,FRA', 'Kamory Doumbia,MF,22,76,MLI', 'Romain Del Castillo,MF,29,76,FRA',
        'Ludovic Ajorque,FW,31,76,FRA', 'Kenny Nagera,FW,23,73,FRA', 'Rémy Labeau Lascary,FW,21,74,FRA', 'Mama Baldé,FW,29,74,GNB', 'Ismaël Bennacer,MF,27,77,ALG',
      ]),
      c('FC Nantes', 'NAN', 'Nantes', 35322, 64, [
        'Anthony Lopes,GK,34,77,POR', 'Patrik Carlgren,GK,33,72,SWE', 'Nicolas Cozza,DF,26,75,FRA', 'Tylel Tati,DF,17,73,FRA', 'Chidozie Awaziem,DF,28,75,NGA', 'Kelvin Amian,DF,27,74,FRA', 'Nathan Zézé,DF,20,74,FRA', 'Kwon Hyeok-kyu,MF,24,74,KOR', 'Louis Leroux,MF,19,74,FRA',
        'Francis Coquelin,MF,34,74,FRA', 'Johann Lepenant,MF,22,75,FRA', 'Deiver Machado,DF,31,74,COL', 'Mostafa Mohamed,FW,27,75,EGY', 'Matthis Abline,FW,22,77,FRA',
        'Youssef El Arabi,FW,38,73,MAR', 'Herba Guirassy,FW,20,73,FRA', 'Bahereba Guirassy,FW,20,72,FRA', 'Mayckel Lahdo,FW,22,74,SWE',
      ]),
      c('AJ Auxerre', 'AJA', 'Auxerre', 21379, 58, [
        'Donovan Léon,GK,32,75,FRA', 'Théo De Percin,GK,23,71,FRA', 'Clément Akpa,DF,23,74,CIV', 'Jubal,DF,32,73,BRA', 'Sinaly Diomandé,DF,24,74,CIV', 'Marvin Senaya,DF,23,73,FRA', 'Paul Joly,DF,25,73,FRA', 'Gideon Mensah,DF,27,74,GHA',
        'Elisha Owusu,MF,27,74,GHA', 'Ousmane Camara,MF,20,73,FRA', 'Kévin Danois,MF,20,73,FRA', 'Hamed Traoré,MF,25,74,CIV', 'Josué Casimir,FW,23,74,FRA',
        'Lassine Sinayoko,FW,25,75,MLI', 'Gaëtan Perrin,FW,29,74,FRA', 'Lucas Oliveira,FW,20,72,BRA', 'Danny Namaso,FW,24,73,ENG',
      ]),
      c('Angers SCO', 'ANG', 'Angers', 18752, 55, [
        'Hervé Koffi,GK,28,74,BFA', 'Rayan Bouadla,GK,22,70,FRA', 'Ousmane Camara,DF,24,74,FRA', 'Jacques Ekomié,DF,23,73,FRA', 'Marius Courcoul,DF,22,72,FRA', 'Emmanuel Biumla,DF,21,73,CMR', 'Cédric Hountondji,DF,31,73,BEN', 'Amine Salama,FW,24,74,MAR',
        'Himad Abdelli,MF,25,76,ALG', 'Jean-Eudes Aholou,MF,31,74,CIV', 'Yassin Belkhdim,MF,22,73,FRA', 'Louis Mouton,MF,24,73,FRA', 'Haris Belkebla,MF,31,73,ALG',
        'Sidiki Chérif,FW,18,74,GUI', 'Prosper Peter,FW,19,72,NGA', 'Esteban Lepaul,FW,25,75,FRA', 'Bamba Dieng,FW,25,74,SEN',
      ]),
      c('Le Havre AC', 'HAC', 'Le Havre', 25178, 56, [
        'Mory Diaw,GK,32,74,SEN', 'Mathieu Gorgelin,GK,34,72,FRA', 'Arouna Sangante,DF,23,75,SEN', 'Gautier Lloris,DF,29,74,FRA', 'Étienne Youté,DF,23,74,FRA', 'Loïc Nego,DF,34,73,HUN', 'Yanis Zouaoui,DF,24,73,FRA', 'Godson Kyeremeh,FW,21,73,GHA',
        'Abdoulaye Touré,MF,31,75,GUI', 'Rassoul Ndiaye,MF,23,74,SEN', 'Yassine Kechta,MF,23,74,MAR', 'Simon Ebonog,MF,21,73,CMR', 'Ayumu Seko,DF,25,74,JPN',
        'Issa Soumaré,FW,25,75,SEN', 'Ahmed Hassan,FW,32,73,EGY', 'Reda Khadra,FW,24,73,GER', 'Ismaël Doukouré,DF,22,74,FRA',
      ]),
      c('FC Lorient', 'LOR', 'Lorient', 18500, 56, [
        'Yvon Mvogo,GK,31,76,SUI', 'Vito Mannone,GK,37,72,ITA', 'Montassar Talbi,DF,27,76,TUN', 'Panos Katseris,DF,23,74,GRE', 'Formose Mendy,DF,24,74,SEN', 'Igor Silva,DF,29,74,BRA', 'Darlin Yongwa,DF,25,74,CMR', 'Nathaniel Adjei,DF,22,74,GHA',
        'Laurent Abergel,MF,32,75,FRA', 'Théo Le Bris,MF,22,75,FRA', 'Aiyegun Tosin,FW,27,76,NGA', 'Pablo Pagis,MF,22,74,FRA', 'Isaak Touré,DF,22,74,FRA',
        'Bamba Dieng,FW,25,74,SEN', 'Sambou Soumano,FW,24,74,FRA', 'Mohamed Bamba,FW,23,75,CIV', 'Dermane Karim,FW,22,73,TOG',
      ]),
      c('Paris FC', 'PFC', 'Paris', 20000, 56, [
        'Obed Nkambadio,GK,22,74,FRA', 'Kevin Trapp,GK,35,76,GER', 'Thibault De Smet,DF,27,74,BEL', 'Otávio,DF,30,76,BRA', 'Nhoa Sangui,DF,19,73,FRA', 'Ilan Kebbal,MF,27,76,ALG', 'Maxime Lopez,MF,27,75,FRA', 'Vincent Marchetti,MF,27,74,FRA', 'Pierre Lees-Melou,MF,32,75,FRA',
        'Jean-Philippe Krasso,FW,28,75,CIV', 'Willem Geubbels,FW,24,75,FRA', 'Moses Simon,FW,30,76,NGA', 'Jonathan Ikoné,FW,27,75,FRA', 'Timothée Kolodziejczak,DF,33,73,FRA',
        'Adama Camara,MF,24,73,FRA', 'Pierre-Yves Hamel,FW,31,73,FRA', 'Lamine Fofana,FW,20,72,FRA', 'Julien Lopez,FW,29,73,FRA',
      ]),
      c('FC Metz', 'MET', 'Metz', 30000, 54, [
        'Jonathan Fischer,GK,29,74,FRA', 'Pape Sy,GK,26,72,SEN', 'Koffi Kouao,DF,27,74,CIV', 'Sadibou Sané,DF,24,74,SEN', 'Fali Candé,DF,27,73,GNB', 'Maxime Colin,DF,33,72,FRA', 'Morgan Bokele,DF,20,72,FRA', 'Jessy Deminguet,MF,27,74,FRA',
        'Gauthier Hein,MF,29,75,FRA', 'Jean-Philippe Gbamin,MF,29,74,CIV', 'Idrissa Gueye,MF,22,73,SEN', 'Cheikh Sabaly,FW,26,74,SEN', 'Ibou Sané,FW,20,73,SEN',
        'Habib Diallo,FW,30,76,SEN', 'Gauthier Hein,MF,29,74,FRA', 'Georges Mikautadze,FW,24,79,GEO', 'Lamine Camara,MF,21,78,SEN',
      ]),
    ],
    // Ligue 2 2025-26
    [
      c('AS Saint-Étienne', 'ASSE', 'Saint-Étienne', 41965, 62), c('Montpellier HSC', 'MHSC', 'Montpellier', 32900, 56), c('Stade de Reims', 'REI', 'Reims', 21684, 55), c('SC Bastia', 'BAS', 'Bastia', 16480, 46),
      c('Stade Lavallois', 'LAV', 'Laval', 18739, 44), c('EA Guingamp', 'GUI', 'Guingamp', 18378, 46), c('Amiens SC', 'AMI', 'Amiens', 12097, 46), c('FC Annecy', 'ANN', 'Annecy', 15660, 42),
      c('Clermont Foot', 'CLE', 'Clermont-Ferrand', 11980, 44), c('USL Dunkerque', 'DUN', 'Dunkerque', 4200, 42), c('Grenoble Foot', 'GRE', 'Grenoble', 20068, 44), c('Pau FC', 'PAU', 'Pau', 4031, 42),
      c('Rodez AF', 'ROD', 'Rodez', 5955, 42), c('ES Troyes AC', 'TRO', 'Troyes', 20400, 46), c('AS Nancy', 'NAN', 'Nancy', 20087, 42), c('Le Mans FC', 'LEM', 'Le Mans', 25064, 40),
      c('US Boulogne', 'BOU', 'Boulogne', 15004, 38), c('Red Star FC', 'RED', 'Paris', 10000, 42),
    ],
  ],
};
