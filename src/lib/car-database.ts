export type Generation = { name: string; years: string };

export const CAR_BRANDS = [
  "Acura","Alfa Romeo","Aston Martin","Audi","Bentley","BMW","Bugatti","Buick",
  "Cadillac","Chery","Chevrolet","Chrysler","Citroën","Dacia","Daewoo","Daihatsu",
  "Dodge","DS","Ferrari","Fiat","Ford","Geely","Genesis","GMC","Great Wall",
  "Haval","Honda","Hyundai","Infiniti","Isuzu","Jaguar","Jeep","Kia","Lamborghini",
  "Lancia","Land Rover","Lexus","Lada","Лада","Lincoln","Lotus","Maserati","Mazda",
  "McLaren","Mercedes-Benz","Mini","Mitsubishi","Nissan","Opel","Peugeot","Porsche",
  "RAM","Renault","Rolls-Royce","Saab","SEAT","Skoda","Smart","Subaru","Suzuki",
  "Tesla","Toyota","Vauxhall","Volkswagen","Volvo","Zotye",
  "ВАЗ","УАЗ","UAZ","ГАЗ","GAZ","КАМАЗ","КамАЗ","ЗИЛ","МАЗ","КрАЗ","Урал",
  "Москвич","АЗЛК","ИЖ","Волга","Нива","Буханка",
  "BYD","Changan","Dongfeng","FAW","SAIC","JAC","Lifan","Brilliance","Roewe",
  "MG","Omoda","Exeed","TANK","Jetour","Voyah","Li Auto","NIO","Xpeng","Zeekr",
  "SsangYong","Hino","Mitsubishi Fuso",
  "Scania","Volvo Trucks","MAN","DAF","Iveco","Renault Trucks","Mercedes-Benz Trucks",
];

export const CAR_MODELS: Record<string, string[]> = {
  "Toyota": ["Camry","Corolla","Land Cruiser","Land Cruiser Prado","RAV4","Hilux","Fortuner","Yaris","Auris","Avensis","Highlander","Sequoia","Tundra","Tacoma","4Runner","FJ Cruiser","Venza","Sienna","Alphard","Prius","Celica","Supra","MR2","Levin","Sprinter Trueno","Carina","Corona","Chaser","Cresta","Mark II","Wish","Ipsum","Estima","Previa","Verso","C-HR","Harrier","Kluger","Blade","Fielder","Premio","Allion","Caldina","Cressida","Soarer","Aristo","Altezza","Verossa","Brevis","Progres","Windom","Ist","Rush","bB","Porte","Spade","Tank","Roomy","Esquire","Noah","Voxy","Granvia","Innova"],
  "Volkswagen": ["Polo","Golf","Passat","Tiguan","Touareg","Jetta","Caddy","Transporter","Crafter","Amarok","Sharan","Touran","Phaeton","CC","T-Roc","T-Cross","ID.4","ID.3","Arteon"],
  "BMW": ["1 Series","2 Series","3 Series","4 Series","5 Series","6 Series","7 Series","8 Series","X1","X2","X3","X4","X5","X6","X7","Z4","M3","M5","M8","i3","i4","iX"],
  "Mercedes-Benz": ["A-Class","B-Class","C-Class","CLA","CLS","E-Class","GLA","GLB","GLC","GLE","GLS","G-Class","S-Class","SL","Sprinter","Vito","Viano","V-Class","EQC","EQE","EQS"],
  "Audi": ["A1","A3","A4","A5","A6","A7","A8","Q2","Q3","Q5","Q7","Q8","TT","R8","e-tron","S3","S4","S6","RS3","RS4","RS6"],
  "Hyundai": ["Accent","Elantra","Solaris","Sonata","i20","i30","i40","ix35","Creta","Tucson","Santa Fe","Palisade","Kona","Venue","IONIQ","Nexo","Porter","HD35","HD65","HD78"],
  "Kia": ["Rio","Ceed","ProCeed","Sportage","Sorento","Soul","Stinger","Carnival","Seltos","Telluride","Mohave","K5","K8","Niro","EV6","Stonic","XCeed"],
  "Nissan": ["Almera","Micra","Note","Tiida","Sentra","Teana","Maxima","Qashqai","X-Trail","Murano","Pathfinder","Patrol","Navara","Frontier","Juke","Kicks","Terra","Leaf","GT-R","370Z","350Z"],
  "Mazda": ["2","3","6","CX-3","CX-30","CX-5","CX-8","CX-9","MX-5","RX-8","BT-50"],
  "Honda": ["Jazz","Fit","City","Civic","Accord","CR-V","HR-V","Pilot","Ridgeline","FR-V","Element","CR-Z","Legend","Odyssey","Stream","Stepwgn","Freed","N-Box","Vezel"],
  "Ford": ["Fiesta","Focus","Mondeo","Fusion","Mustang","Explorer","Ranger","F-150","EcoSport","Kuga","Puma","Bronco","Edge","Expedition","Transit","Transit Connect"],
  "Renault": ["Clio","Megane","Laguna","Talisman","Logan","Sandero","Duster","Captur","Arkana","Koleos","Kadjar","Symbol","Fluence","Espace","Trafic","Master"],
  "Skoda": ["Fabia","Rapid","Scala","Octavia","Superb","Kamiq","Karoq","Kodiaq","Yeti","Citigo","Roomster"],
  "Lada": ["Vesta","XRAY","Largus","Granta","Kalina","Priora","Niva Travel","Niva Legend","4x4","Samara"],
  "Лада": ["Vesta","XRAY","Largus","Granta","Калина","Приора","Нива Travel","Нива Legend","4x4"],
  "ВАЗ": ["2101","2102","2103","2104","2105","2106","2107","2108","2109","21099","2110","2111","2112","2113","2114","2115","Нива 2121"],
  "УАЗ": ["Патриот","Хантер","Буханка","Пикап","3909","452","469","31519","Профи"],
  "UAZ": ["Patriot","Hunter","452","469","Pickup","Profi"],
  "ГАЗ": ["Газель","Газель Next","Газель БИЗНЕС","Газель NN","Соболь","Валдай","ГАЗон Next","3302","2705","Волга 3110","Волга 31105"],
  "GAZ": ["Gazelle","Gazelle Next","Sobol","Valdai","Gazon Next"],
  "КАМАЗ": ["5490","5320","43118","65115","65117","6520","4308","65208","Компас","54901"],
  "КамАЗ": ["5490","5320","43118","65115","65117","6520","4308","65208","Компас","54901"],
  "Москвич": ["2140","412","408","2141","3","5"],
  "Mitsubishi": ["Colt","Lancer","Galant","Carisma","Sigma","Outlander","ASX","Eclipse Cross","Eclipse","Pajero","Pajero Sport","L200","L300","Grandis","Space Star"],
  "Subaru": ["Impreza","Legacy","Outback","Forester","XV","WRX","BRZ","Tribeca","Levorg","Ascent"],
  "Volvo": ["S40","S60","S80","S90","V40","V50","V60","V70","V90","XC40","XC60","XC70","XC90","C30","C70"],
  "Peugeot": ["107","108","206","207","208","301","307","308","407","408","508","2008","3008","5008","Partner","Expert","Boxer"],
  "Citroën": ["C1","C2","C3","C4","C4 Cactus","C5","C5 Aircross","C-Crosser","Berlingo","Jumpy","Jumper","SpaceTourer"],
  "Opel": ["Agila","Corsa","Astra","Zafira","Vectra","Signum","Insignia","Mokka","Antara","Crossland","Grandland","Vivaro","Movano"],
  "Chevrolet": ["Spark","Aveo","Cobalt","Lacetti","Cruze","Malibu","Epica","Captiva","Trax","Equinox","TrailBlazer","Tahoe","Suburban","Silverado","Colorado","Niva"],
  "Jeep": ["Renegade","Compass","Cherokee","Grand Cherokee","Wrangler","Gladiator","Commander"],
  "Land Rover": ["Freelander","Discovery Sport","Discovery","Range Rover Evoque","Range Rover Velar","Range Rover Sport","Range Rover","Defender"],
  "Lexus": ["CT","IS","ES","GS","LS","UX","NX","RX","GX","LX","LC","RC","LM"],
  "Infiniti": ["G","Q50","Q60","Q70","QX30","QX50","QX55","QX60","QX70","QX80","FX","EX","JX"],
  "Porsche": ["911","718 Boxster","718 Cayman","Panamera","Macan","Cayenne","Taycan"],
  "Haval": ["H2","H4","H6","H9","F5","F7","F7x","Jolion","Dargo","Shenshou"],
  "Chery": ["QQ","Amulet","Fora","Tiggo","Tiggo 2","Tiggo 3","Tiggo 4","Tiggo 7","Tiggo 8","Tiggo 9","Arrizo 5","Arrizo 8"],
  "Geely": ["Emgrand","MK","GC6","Atlas","Boyue","Coolray","Tugella","Okavango","Monjaro","Preface"],
  "BYD": ["F3","F0","G3","S6","Han","Tang","Song","Song Plus","Atto 3","Seal","Dolphin","Seagull","Sealion"],
  "Changan": ["CS15","CS35","CS35 Plus","CS55","CS55 Plus","CS75","CS75 Plus","CS85","CS95","Eado","Uni-T","Uni-K","Uni-V","Lamore"],
  "Omoda": ["C5","S5"],
  "Exeed": ["TXL","VX","LX","RX"],
  "MG": ["3","4","5","6","ZS","HS","RX5","Marvel R","One"],
  "Lifan": ["320","520","620","720","X60","X70","Solano","Smily","Myway","Foison"],
  "SsangYong": ["Rexton","Kyron","Actyon","Actyon Sports","Tivoli","Korando","Musso","Rodius","Turismo"],
  "Daewoo": ["Matiz","Tico","Lanos","Sens","Nexia","Nubira","Leganza","Tacuma","Kalos","Lacetti"],
  "Suzuki": ["Alto","Swift","Ignis","Baleno","Celerio","SX4","Vitara","Grand Vitara","Jimny","Ertiga","Kizashi","Liana"],
  "SEAT": ["Ibiza","Leon","Arona","Ateca","Tarraco","Toledo","Alhambra","Exeo"],
  "Saab": ["9-3","9-5","9-7X","9-4X"],
  "Acura": ["ILX","TLX","RLX","MDX","RDX","NSX"],
  "Alfa Romeo": ["Mito","Giulietta","Giulia","Stelvio","Tonale","Brera","Spider","159","156","147"],
  "Jaguar": ["XE","XF","XJ","E-Pace","F-Pace","I-Pace","F-Type"],
  "Dacia": ["Logan","Sandero","Duster","Spring","Lodgy","Dokker"],
  "Lincoln": ["MKZ","MKC","MKX","Corsair","Nautilus","Aviator","Navigator","Continental"],
  "Maserati": ["Ghibli","Quattroporte","Levante","Grecale","GranTurismo","GranCabrio"],
  "Tesla": ["Model 3","Model S","Model X","Model Y","Cybertruck"],
  "Mini": ["Hatch","Convertible","Clubman","Countryman","Paceman","Coupe","Roadster"],
  "Genesis": ["G70","G80","G90","GV70","GV80","GV60"],
  "Dodge": ["Charger","Challenger","Durango","Journey","Grand Caravan","Ram 1500","Dart"],
  "Jeep": ["Renegade","Compass","Cherokee","Grand Cherokee","Wrangler","Gladiator"],
  "GMC": ["Sierra","Canyon","Terrain","Acadia","Yukon","Savana"],
  "Isuzu": ["D-Max","MU-X","NPR","NQR","FRR","ELF","Trooper","Rodeo"],
  "Hino": ["300","500","700","Dutro","Ranger","Profia"],
  "Scania": ["R","S","G","P","L","XT"],
  "MAN": ["TGX","TGS","TGL","TGM","TGE","TGA"],
  "DAF": ["XF","CF","LF","XG"],
  "Iveco": ["Daily","Stralis","Trakker","S-WAY","Eurocargo","Eurotrakker"],
  "Dongfeng": ["H30","AX7","AX4","Fengshen A60","S30","580"],
  "FAW": ["Besturn B50","Besturn B70","Besturn X80","Tiggo","V5","V80"],
  "JAC": ["J2","J3","J4","J5","J6","S2","S3","S5","S7","T6","T8"],
  "TANK": ["300","400","500"],
  "Jetour": ["X70","X90","Dashing","Traveler"],
};

export const CAR_GENERATIONS: Record<string, Record<string, Generation[]>> = {
  "Toyota": {
    "Corolla": [
      { name: "E80", years: "1983–1987" },
      { name: "E90", years: "1987–1992" },
      { name: "E100", years: "1991–1999" },
      { name: "E110", years: "1995–2002" },
      { name: "E120 / E130", years: "2001–2007" },
      { name: "E140 / E150", years: "2006–2013" },
      { name: "E160 / E170", years: "2012–2019" },
      { name: "E210", years: "2018–н.в." },
    ],
    "Camry": [
      { name: "V10", years: "1982–1986" },
      { name: "V20", years: "1986–1991" },
      { name: "V30", years: "1991–1996" },
      { name: "V40", years: "1994–2001" },
      { name: "XV30", years: "2001–2006" },
      { name: "XV40", years: "2006–2011" },
      { name: "XV50", years: "2011–2017" },
      { name: "XV70", years: "2017–н.в." },
    ],
    "Land Cruiser": [
      { name: "60 Series", years: "1980–1990" },
      { name: "70 Series", years: "1984–н.в." },
      { name: "80 Series", years: "1990–1998" },
      { name: "100 Series", years: "1998–2007" },
      { name: "200 Series", years: "2007–2021" },
      { name: "300 Series", years: "2021–н.в." },
    ],
    "Land Cruiser Prado": [
      { name: "J70", years: "1984–1996" },
      { name: "J90", years: "1996–2002" },
      { name: "J120", years: "2002–2009" },
      { name: "J150", years: "2009–н.в." },
    ],
    "RAV4": [
      { name: "XA10", years: "1994–2000" },
      { name: "XA20", years: "2000–2005" },
      { name: "XA30", years: "2005–2012" },
      { name: "XA40", years: "2012–2018" },
      { name: "XA50", years: "2018–н.в." },
    ],
    "Hilux": [
      { name: "N50", years: "1978–1983" },
      { name: "N60", years: "1983–1988" },
      { name: "N80", years: "1988–1997" },
      { name: "N100", years: "1997–2005" },
      { name: "N120/N150", years: "2004–2015" },
      { name: "N210", years: "2015–н.в." },
    ],
    "Celica": [
      { name: "A20/A35", years: "1977–1981" },
      { name: "A40/A50", years: "1981–1985" },
      { name: "A60", years: "1982–1985" },
      { name: "T160", years: "1985–1989" },
      { name: "T180", years: "1989–1993" },
      { name: "T200", years: "1993–1999" },
      { name: "T230", years: "1999–2006" },
    ],
    "Supra": [
      { name: "A40", years: "1978–1981" },
      { name: "A60", years: "1981–1986" },
      { name: "A70", years: "1986–1993" },
      { name: "A80", years: "1993–2002" },
      { name: "A90", years: "2019–н.в." },
    ],
    "Mark II": [
      { name: "X60", years: "1984–1988" },
      { name: "X70", years: "1988–1992" },
      { name: "X80", years: "1992–1996" },
      { name: "X90", years: "1996–2000" },
      { name: "X100", years: "1996–2000" },
      { name: "X110", years: "2000–2004" },
    ],
    "Chaser": [
      { name: "X60", years: "1984–1988" },
      { name: "X70", years: "1988–1992" },
      { name: "X80", years: "1992–1996" },
      { name: "X90", years: "1996–2001" },
      { name: "X100", years: "1996–2001" },
    ],
    "Cresta": [
      { name: "X60", years: "1984–1988" },
      { name: "X70", years: "1988–1992" },
      { name: "X80", years: "1992–1996" },
      { name: "X90", years: "1996–2001" },
      { name: "X100", years: "1996–2001" },
    ],
    "Levin": [
      { name: "AE71", years: "1979–1983" },
      { name: "AE86", years: "1983–1987" },
      { name: "AE92", years: "1987–1991" },
      { name: "AE101", years: "1991–1995" },
      { name: "AE111", years: "1995–2000" },
    ],
    "Sprinter Trueno": [
      { name: "AE71", years: "1979–1983" },
      { name: "AE86", years: "1983–1987" },
      { name: "AE92", years: "1987–1991" },
      { name: "AE101", years: "1991–1995" },
      { name: "AE111", years: "1995–2000" },
    ],
    "Prius": [
      { name: "NHW10", years: "1997–2000" },
      { name: "NHW20", years: "2003–2009" },
      { name: "ZVW30", years: "2009–2015" },
      { name: "ZVW50", years: "2015–2022" },
      { name: "MXWH60", years: "2022–н.в." },
    ],
    "Harrier": [
      { name: "XU10", years: "1997–2003" },
      { name: "XU30", years: "2003–2013" },
      { name: "ZSU60", years: "2013–2020" },
      { name: "MXUA80", years: "2020–н.в." },
    ],
    "C-HR": [
      { name: "NGX10/ZYX10", years: "2016–н.в." },
    ],
    "Highlander": [
      { name: "XU20", years: "2000–2007" },
      { name: "XU40", years: "2007–2013" },
      { name: "XU50", years: "2013–2019" },
      { name: "XU70", years: "2019–н.в." },
    ],
    "Avensis": [
      { name: "T220", years: "1997–2003" },
      { name: "T250", years: "2003–2008" },
      { name: "T270", years: "2008–2018" },
    ],
    "Yaris": [
      { name: "XP10", years: "1999–2005" },
      { name: "XP90", years: "2005–2011" },
      { name: "XP130", years: "2011–2020" },
      { name: "XP210", years: "2020–н.в." },
    ],
    "Fortuner": [
      { name: "I поколение", years: "2005–2015" },
      { name: "II поколение", years: "2015–н.в." },
    ],
    "Alphard": [
      { name: "H10", years: "2002–2008" },
      { name: "H20", years: "2008–2015" },
      { name: "H30", years: "2015–2023" },
      { name: "H40", years: "2023–н.в." },
    ],
    "Estima": [
      { name: "R10/R20", years: "1990–1999" },
      { name: "R30/R40", years: "2000–2005" },
      { name: "R50", years: "2006–2019" },
    ],
    "Noah": [
      { name: "R60", years: "2001–2007" },
      { name: "R70", years: "2007–2014" },
      { name: "R80", years: "2014–2021" },
      { name: "R90", years: "2021–н.в." },
    ],
    "Voxy": [
      { name: "R60", years: "2001–2007" },
      { name: "R70", years: "2007–2014" },
      { name: "R80", years: "2014–2021" },
      { name: "R90", years: "2021–н.в." },
    ],
  },
  "Volkswagen": {
    "Golf": [
      { name: "Golf I", years: "1974–1983" },
      { name: "Golf II", years: "1983–1992" },
      { name: "Golf III", years: "1991–1998" },
      { name: "Golf IV", years: "1997–2006" },
      { name: "Golf V", years: "2003–2009" },
      { name: "Golf VI", years: "2008–2013" },
      { name: "Golf VII", years: "2012–2020" },
      { name: "Golf VIII", years: "2019–н.в." },
    ],
    "Passat": [
      { name: "B1", years: "1973–1980" },
      { name: "B2", years: "1980–1988" },
      { name: "B3", years: "1988–1993" },
      { name: "B4", years: "1993–1997" },
      { name: "B5", years: "1996–2005" },
      { name: "B6", years: "2005–2010" },
      { name: "B7", years: "2010–2015" },
      { name: "B8", years: "2014–н.в." },
    ],
    "Polo": [
      { name: "Mk1", years: "1975–1981" },
      { name: "Mk2", years: "1981–1994" },
      { name: "Mk3", years: "1994–2002" },
      { name: "Mk4", years: "2001–2009" },
      { name: "Mk5", years: "2009–2017" },
      { name: "Mk6", years: "2017–н.в." },
    ],
    "Tiguan": [
      { name: "Mk1", years: "2007–2016" },
      { name: "Mk2", years: "2016–н.в." },
    ],
    "Touareg": [
      { name: "7L", years: "2002–2010" },
      { name: "7P", years: "2010–2018" },
      { name: "CR", years: "2018–н.в." },
    ],
    "Jetta": [
      { name: "Mk1", years: "1979–1984" },
      { name: "Mk2", years: "1984–1992" },
      { name: "Mk3", years: "1992–1999" },
      { name: "Mk4", years: "1998–2005" },
      { name: "Mk5", years: "2005–2010" },
      { name: "Mk6", years: "2010–2018" },
      { name: "Mk7", years: "2018–н.в." },
    ],
    "Transporter": [
      { name: "T3", years: "1979–1992" },
      { name: "T4", years: "1990–2003" },
      { name: "T5", years: "2003–2015" },
      { name: "T6", years: "2015–н.в." },
    ],
  },
  "BMW": {
    "1 Series": [
      { name: "E87", years: "2004–2011" },
      { name: "F20/F21", years: "2011–2019" },
      { name: "F40", years: "2019–н.в." },
    ],
    "3 Series": [
      { name: "E21", years: "1975–1983" },
      { name: "E30", years: "1982–1994" },
      { name: "E36", years: "1990–2000" },
      { name: "E46", years: "1997–2006" },
      { name: "E90/E91/E92/E93", years: "2004–2013" },
      { name: "F30/F31/F34", years: "2011–2019" },
      { name: "G20/G21", years: "2018–н.в." },
    ],
    "5 Series": [
      { name: "E12", years: "1972–1981" },
      { name: "E28", years: "1981–1988" },
      { name: "E34", years: "1988–1996" },
      { name: "E39", years: "1995–2004" },
      { name: "E60/E61", years: "2003–2010" },
      { name: "F10/F11", years: "2009–2017" },
      { name: "G30/G31", years: "2016–н.в." },
    ],
    "7 Series": [
      { name: "E23", years: "1977–1986" },
      { name: "E32", years: "1986–1994" },
      { name: "E38", years: "1994–2001" },
      { name: "E65/E66", years: "2001–2008" },
      { name: "F01/F02", years: "2008–2015" },
      { name: "G11/G12", years: "2015–н.в." },
    ],
    "X1": [
      { name: "E84", years: "2009–2015" },
      { name: "F48", years: "2015–2022" },
      { name: "U11", years: "2022–н.в." },
    ],
    "X3": [
      { name: "E83", years: "2003–2010" },
      { name: "F25", years: "2010–2017" },
      { name: "G01", years: "2017–н.в." },
    ],
    "X5": [
      { name: "E53", years: "1999–2006" },
      { name: "E70", years: "2006–2013" },
      { name: "F15", years: "2013–2018" },
      { name: "G05", years: "2018–н.в." },
    ],
    "X6": [
      { name: "E71", years: "2008–2014" },
      { name: "F16", years: "2014–2019" },
      { name: "G06", years: "2019–н.в." },
    ],
    "M3": [
      { name: "E30 M3", years: "1986–1992" },
      { name: "E36 M3", years: "1992–1999" },
      { name: "E46 M3", years: "2000–2006" },
      { name: "E90/E92 M3", years: "2007–2013" },
      { name: "F80 M3", years: "2014–2020" },
      { name: "G80 M3", years: "2020–н.в." },
    ],
  },
  "Mercedes-Benz": {
    "A-Class": [
      { name: "W168", years: "1997–2004" },
      { name: "W169", years: "2004–2012" },
      { name: "W176", years: "2012–2018" },
      { name: "W177", years: "2018–н.в." },
    ],
    "C-Class": [
      { name: "W201 (190)", years: "1982–1993" },
      { name: "W202", years: "1993–2000" },
      { name: "W203", years: "2000–2007" },
      { name: "W204", years: "2007–2014" },
      { name: "W205", years: "2014–2021" },
      { name: "W206", years: "2021–н.в." },
    ],
    "E-Class": [
      { name: "W124", years: "1984–1996" },
      { name: "W210", years: "1995–2003" },
      { name: "W211", years: "2002–2009" },
      { name: "W212", years: "2009–2016" },
      { name: "W213", years: "2016–н.в." },
    ],
    "S-Class": [
      { name: "W116", years: "1972–1980" },
      { name: "W126", years: "1979–1991" },
      { name: "W140", years: "1991–1998" },
      { name: "W220", years: "1998–2005" },
      { name: "W221", years: "2005–2013" },
      { name: "W222", years: "2013–2020" },
      { name: "W223", years: "2020–н.в." },
    ],
    "GLC": [
      { name: "X253", years: "2015–2022" },
      { name: "X254", years: "2022–н.в." },
    ],
    "GLE": [
      { name: "W166 (ML)", years: "2011–2015" },
      { name: "W166 (GLE)", years: "2015–2018" },
      { name: "V167", years: "2018–н.в." },
    ],
    "G-Class": [
      { name: "W460", years: "1979–1991" },
      { name: "W461", years: "1991–н.в." },
      { name: "W463", years: "1989–2018" },
      { name: "W463A", years: "2018–н.в." },
    ],
    "Sprinter": [
      { name: "W901-905", years: "1995–2006" },
      { name: "W906", years: "2006–2018" },
      { name: "W907/W910", years: "2018–н.в." },
    ],
    "Vito": [
      { name: "W638", years: "1996–2003" },
      { name: "W639", years: "2003–2014" },
      { name: "W447", years: "2014–н.в." },
    ],
  },
  "Audi": {
    "A3": [
      { name: "8L", years: "1996–2003" },
      { name: "8P", years: "2003–2012" },
      { name: "8V", years: "2012–2020" },
      { name: "8Y", years: "2020–н.в." },
    ],
    "A4": [
      { name: "B5", years: "1994–2001" },
      { name: "B6", years: "2000–2004" },
      { name: "B7", years: "2004–2008" },
      { name: "B8", years: "2007–2015" },
      { name: "B9", years: "2015–н.в." },
    ],
    "A6": [
      { name: "C4", years: "1994–1997" },
      { name: "C5", years: "1997–2004" },
      { name: "C6", years: "2004–2011" },
      { name: "C7", years: "2011–2018" },
      { name: "C8", years: "2018–н.в." },
    ],
    "Q5": [
      { name: "8R", years: "2008–2017" },
      { name: "FY", years: "2017–н.в." },
    ],
    "Q7": [
      { name: "4L", years: "2005–2015" },
      { name: "4M", years: "2015–н.в." },
    ],
    "TT": [
      { name: "8N", years: "1998–2006" },
      { name: "8J", years: "2006–2014" },
      { name: "8S", years: "2014–2023" },
    ],
  },
  "Hyundai": {
    "Accent": [
      { name: "X3", years: "1994–1999" },
      { name: "LC", years: "1999–2005" },
      { name: "MC", years: "2005–2011" },
      { name: "RB", years: "2010–2017" },
      { name: "HC", years: "2017–н.в." },
    ],
    "Elantra": [
      { name: "J1", years: "1990–1995" },
      { name: "XD", years: "2000–2006" },
      { name: "HD", years: "2006–2010" },
      { name: "MD", years: "2010–2015" },
      { name: "AD", years: "2015–2020" },
      { name: "CN7", years: "2020–н.в." },
    ],
    "Solaris": [
      { name: "I поколение (RB)", years: "2010–2017" },
      { name: "II поколение (HC)", years: "2017–н.в." },
    ],
    "Sonata": [
      { name: "Y2", years: "1987–1993" },
      { name: "Y3", years: "1993–1996" },
      { name: "EF", years: "1998–2004" },
      { name: "NF", years: "2004–2009" },
      { name: "YF", years: "2009–2014" },
      { name: "LF", years: "2014–2019" },
      { name: "DN8", years: "2019–н.в." },
    ],
    "Creta": [
      { name: "I поколение (GS)", years: "2015–2021" },
      { name: "II поколение (SU2)", years: "2021–н.в." },
    ],
    "Tucson": [
      { name: "JM", years: "2004–2010" },
      { name: "LM", years: "2009–2015" },
      { name: "TL", years: "2015–2020" },
      { name: "NX4", years: "2020–н.в." },
    ],
    "Santa Fe": [
      { name: "SM", years: "2000–2006" },
      { name: "CM", years: "2006–2012" },
      { name: "DM", years: "2012–2018" },
      { name: "TM", years: "2018–н.в." },
    ],
    "i30": [
      { name: "FD", years: "2007–2012" },
      { name: "GD", years: "2012–2017" },
      { name: "PD", years: "2017–н.в." },
    ],
  },
  "Kia": {
    "Rio": [
      { name: "I поколение (DC)", years: "2000–2005" },
      { name: "II поколение (JB)", years: "2005–2011" },
      { name: "III поколение (UB)", years: "2011–2017" },
      { name: "IV поколение (FB)", years: "2017–н.в." },
    ],
    "Ceed": [
      { name: "I поколение (ED)", years: "2006–2012" },
      { name: "II поколение (JD)", years: "2012–2018" },
      { name: "III поколение (CD)", years: "2018–н.в." },
    ],
    "Sportage": [
      { name: "I поколение (JA)", years: "1993–2002" },
      { name: "II поколение (KM)", years: "2004–2010" },
      { name: "III поколение (SL)", years: "2010–2015" },
      { name: "IV поколение (QL)", years: "2015–2021" },
      { name: "V поколение (NQ5)", years: "2021–н.в." },
    ],
    "Sorento": [
      { name: "I поколение (BL)", years: "2002–2009" },
      { name: "II поколение (XM)", years: "2009–2014" },
      { name: "III поколение (UM)", years: "2014–2020" },
      { name: "IV поколение (MQ4)", years: "2020–н.в." },
    ],
    "Soul": [
      { name: "I поколение (AM)", years: "2008–2013" },
      { name: "II поколение (PS)", years: "2013–2019" },
      { name: "III поколение (SK3)", years: "2019–н.в." },
    ],
    "Mohave": [
      { name: "HM", years: "2008–2019" },
      { name: "HM (рестайл)", years: "2019–н.в." },
    ],
  },
  "Nissan": {
    "Almera": [
      { name: "N15", years: "1995–2000" },
      { name: "N16", years: "2000–2006" },
      { name: "G15", years: "2012–2018" },
    ],
    "Qashqai": [
      { name: "J10", years: "2006–2014" },
      { name: "J11", years: "2013–2021" },
      { name: "J12", years: "2021–н.в." },
    ],
    "X-Trail": [
      { name: "T30", years: "2000–2007" },
      { name: "T31", years: "2007–2015" },
      { name: "T32", years: "2013–2022" },
      { name: "T33", years: "2022–н.в." },
    ],
    "Patrol": [
      { name: "Y60", years: "1987–1997" },
      { name: "Y61", years: "1997–2013" },
      { name: "Y62", years: "2010–н.в." },
    ],
    "Tiida": [
      { name: "C11", years: "2004–2012" },
      { name: "C12", years: "2011–2018" },
    ],
    "Teana": [
      { name: "J31", years: "2003–2008" },
      { name: "J32", years: "2008–2014" },
      { name: "L33", years: "2013–2022" },
    ],
    "Murano": [
      { name: "Z50", years: "2002–2008" },
      { name: "Z51", years: "2008–2016" },
      { name: "Z52", years: "2014–н.в." },
    ],
    "Navara": [
      { name: "D22", years: "1997–2004" },
      { name: "D40", years: "2004–2014" },
      { name: "D23", years: "2014–н.в." },
    ],
    "Juke": [
      { name: "F15", years: "2010–2019" },
      { name: "F16", years: "2019–н.в." },
    ],
    "GT-R": [
      { name: "R32", years: "1989–1994" },
      { name: "R33", years: "1993–1998" },
      { name: "R34", years: "1999–2002" },
      { name: "R35", years: "2007–н.в." },
    ],
  },
  "Mazda": {
    "2": [
      { name: "DY", years: "2002–2007" },
      { name: "DE", years: "2007–2014" },
      { name: "DJ/DL", years: "2014–н.в." },
    ],
    "3": [
      { name: "BK", years: "2003–2009" },
      { name: "BL", years: "2008–2013" },
      { name: "BM/BN", years: "2013–2019" },
      { name: "BP", years: "2019–н.в." },
    ],
    "6": [
      { name: "GG/GY", years: "2002–2008" },
      { name: "GH", years: "2007–2012" },
      { name: "GJ", years: "2012–н.в." },
    ],
    "CX-5": [
      { name: "KE", years: "2011–2017" },
      { name: "KF", years: "2017–н.в." },
    ],
    "CX-3": [
      { name: "DK", years: "2015–н.в." },
    ],
    "CX-9": [
      { name: "TB", years: "2006–2016" },
      { name: "TC", years: "2016–н.в." },
    ],
    "MX-5": [
      { name: "NA", years: "1989–1997" },
      { name: "NB", years: "1998–2005" },
      { name: "NC", years: "2005–2015" },
      { name: "ND", years: "2015–н.в." },
    ],
  },
  "Honda": {
    "Civic": [
      { name: "EG/EH (5th)", years: "1991–1995" },
      { name: "EK (6th)", years: "1995–2001" },
      { name: "EP/EU/ES (7th)", years: "2000–2005" },
      { name: "FD/FA (8th)", years: "2005–2011" },
      { name: "FB/FG (9th)", years: "2011–2015" },
      { name: "FC/FK (10th)", years: "2015–2021" },
      { name: "FE/FL (11th)", years: "2021–н.в." },
    ],
    "Accord": [
      { name: "CB/CD (5th)", years: "1993–1997" },
      { name: "CG/CF (6th)", years: "1997–2002" },
      { name: "CL/CM (7th)", years: "2002–2008" },
      { name: "CP/CS (8th)", years: "2007–2012" },
      { name: "CR (9th)", years: "2012–2017" },
      { name: "CV (10th)", years: "2017–н.в." },
    ],
    "CR-V": [
      { name: "RD (1st)", years: "1995–2002" },
      { name: "RD4–RD9 (2nd)", years: "2001–2006" },
      { name: "RE (3rd)", years: "2006–2012" },
      { name: "RM (4th)", years: "2011–2016" },
      { name: "RW/RT (5th)", years: "2016–2022" },
      { name: "RS (6th)", years: "2022–н.в." },
    ],
    "HR-V": [
      { name: "GH (1st)", years: "1998–2006" },
      { name: "RU (2nd)", years: "2013–2021" },
      { name: "RV (3rd)", years: "2021–н.в." },
    ],
    "Jazz": [
      { name: "GD", years: "2001–2008" },
      { name: "GE", years: "2008–2014" },
      { name: "GK", years: "2014–2020" },
      { name: "GR", years: "2020–н.в." },
    ],
  },
  "Ford": {
    "Fiesta": [
      { name: "Mk4/Mk5", years: "1995–2002" },
      { name: "Mk6", years: "2002–2008" },
      { name: "Mk7", years: "2008–2017" },
      { name: "Mk8", years: "2017–2023" },
    ],
    "Focus": [
      { name: "Mk1", years: "1998–2004" },
      { name: "Mk2", years: "2004–2011" },
      { name: "Mk3", years: "2010–2018" },
      { name: "Mk4", years: "2018–н.в." },
    ],
    "Mondeo": [
      { name: "Mk1", years: "1993–1996" },
      { name: "Mk2", years: "1996–2000" },
      { name: "Mk3", years: "2000–2007" },
      { name: "Mk4", years: "2007–2014" },
      { name: "Mk5", years: "2014–2022" },
    ],
    "Explorer": [
      { name: "I поколение", years: "1990–1994" },
      { name: "II поколение", years: "1994–2001" },
      { name: "III поколение", years: "2001–2005" },
      { name: "IV поколение", years: "2005–2010" },
      { name: "V поколение", years: "2010–2019" },
      { name: "VI поколение", years: "2019–н.в." },
    ],
    "Ranger": [
      { name: "T6", years: "2011–2019" },
      { name: "T6 (рестайл)", years: "2019–2022" },
      { name: "T6.2", years: "2022–н.в." },
    ],
    "Mustang": [
      { name: "I поколение", years: "1964–1973" },
      { name: "II поколение", years: "1974–1978" },
      { name: "III поколение", years: "1979–1993" },
      { name: "IV поколение (SN95)", years: "1994–2004" },
      { name: "V поколение (S197)", years: "2004–2014" },
      { name: "VI поколение (S550)", years: "2015–2023" },
      { name: "VII поколение (S650)", years: "2023–н.в." },
    ],
    "Kuga": [
      { name: "I поколение", years: "2008–2012" },
      { name: "II поколение", years: "2012–2019" },
      { name: "III поколение", years: "2019–н.в." },
    ],
  },
  "Renault": {
    "Clio": [
      { name: "I поколение", years: "1990–1998" },
      { name: "II поколение", years: "1998–2005" },
      { name: "III поколение", years: "2005–2012" },
      { name: "IV поколение", years: "2012–2019" },
      { name: "V поколение", years: "2019–н.в." },
    ],
    "Megane": [
      { name: "I поколение", years: "1995–2003" },
      { name: "II поколение", years: "2002–2009" },
      { name: "III поколение", years: "2008–2015" },
      { name: "IV поколение", years: "2015–н.в." },
    ],
    "Logan": [
      { name: "I поколение", years: "2004–2012" },
      { name: "II поколение", years: "2012–2022" },
      { name: "III поколение", years: "2022–н.в." },
    ],
    "Sandero": [
      { name: "I поколение", years: "2007–2012" },
      { name: "II поколение", years: "2012–2020" },
      { name: "III поколение", years: "2020–н.в." },
    ],
    "Duster": [
      { name: "I поколение", years: "2010–2017" },
      { name: "II поколение", years: "2017–н.в." },
    ],
    "Kaptur": [
      { name: "I поколение", years: "2016–2021" },
      { name: "II поколение", years: "2021–н.в." },
    ],
    "Arkana": [
      { name: "I поколение", years: "2019–н.в." },
    ],
  },
  "Skoda": {
    "Fabia": [
      { name: "Mk1 (6Y)", years: "1999–2007" },
      { name: "Mk2 (5J)", years: "2007–2014" },
      { name: "Mk3 (NJ)", years: "2014–2021" },
      { name: "Mk4 (PJ)", years: "2021–н.в." },
    ],
    "Octavia": [
      { name: "1U", years: "1996–2010" },
      { name: "A5 (1Z)", years: "2004–2013" },
      { name: "A7 (5E)", years: "2012–2020" },
      { name: "A8 (NX)", years: "2019–н.в." },
    ],
    "Superb": [
      { name: "3U", years: "2001–2008" },
      { name: "3T", years: "2008–2015" },
      { name: "3V", years: "2015–н.в." },
    ],
    "Kodiaq": [
      { name: "NS", years: "2016–н.в." },
    ],
    "Karoq": [
      { name: "NU", years: "2017–н.в." },
    ],
    "Yeti": [
      { name: "5L", years: "2009–2017" },
    ],
  },
  "Lada": {
    "Vesta": [
      { name: "I поколение", years: "2015–н.в." },
    ],
    "Granta": [
      { name: "I поколение", years: "2011–2018" },
      { name: "II поколение", years: "2018–н.в." },
    ],
    "Niva Travel": [
      { name: "I поколение", years: "2020–н.в." },
    ],
    "Niva Legend": [
      { name: "2121 Classic", years: "1977–н.в." },
    ],
    "Kalina": [
      { name: "I поколение (1117/1118/1119)", years: "2004–2013" },
      { name: "II поколение (2192/2194)", years: "2012–2018" },
    ],
    "Priora": [
      { name: "2170/2171/2172", years: "2007–2018" },
    ],
    "Largus": [
      { name: "I поколение", years: "2012–н.в." },
    ],
    "XRAY": [
      { name: "I поколение", years: "2016–н.в." },
    ],
  },
  "ВАЗ": {
    "2101": [{ name: "Классика", years: "1970–1988" }],
    "2105": [{ name: "Классика", years: "1979–2010" }],
    "2106": [{ name: "Классика", years: "1975–2005" }],
    "2107": [{ name: "Классика", years: "1982–2012" }],
    "2108": [{ name: "I поколение", years: "1984–2003" }],
    "2109": [{ name: "I поколение", years: "1987–2004" }],
    "2110": [{ name: "I поколение", years: "1995–2014" }],
    "2114": [{ name: "I поколение", years: "2001–2013" }],
    "2115": [{ name: "I поколение", years: "1997–2012" }],
    "Нива 2121": [
      { name: "2121 Classic", years: "1977–2020" },
      { name: "2121 Legend", years: "2020–н.в." },
    ],
  },
  "УАЗ": {
    "Патриот": [
      { name: "I поколение", years: "2005–2012" },
      { name: "II поколение", years: "2012–2016" },
      { name: "III поколение", years: "2016–н.в." },
    ],
    "Буханка": [
      { name: "452", years: "1965–н.в." },
    ],
    "Хантер": [
      { name: "315195", years: "2003–н.в." },
    ],
  },
  "ГАЗ": {
    "Газель": [
      { name: "ГАЗ-3302", years: "1994–2010" },
      { name: "Газель БИЗНЕС", years: "2010–2015" },
      { name: "Газель Next", years: "2013–н.в." },
      { name: "Газель NN", years: "2022–н.в." },
    ],
    "Соболь": [
      { name: "2752", years: "1998–н.в." },
    ],
  },
  "Subaru": {
    "Impreza": [
      { name: "GC/GF (1st)", years: "1992–2000" },
      { name: "GD/GG (2nd)", years: "2000–2007" },
      { name: "GE/GH (3rd)", years: "2007–2011" },
      { name: "GP/GJ (4th)", years: "2011–2016" },
      { name: "GT (5th)", years: "2016–н.в." },
    ],
    "Legacy": [
      { name: "BC/BJ (1st)", years: "1989–1994" },
      { name: "BD/BG (2nd)", years: "1994–1999" },
      { name: "BE/BH (3rd)", years: "1998–2003" },
      { name: "BL/BP (4th)", years: "2003–2009" },
      { name: "BM/BR (5th)", years: "2009–2014" },
      { name: "BS/BN (6th)", years: "2014–н.в." },
    ],
    "Forester": [
      { name: "SF (1st)", years: "1997–2002" },
      { name: "SG (2nd)", years: "2002–2008" },
      { name: "SH (3rd)", years: "2008–2012" },
      { name: "SJ (4th)", years: "2012–2018" },
      { name: "SK (5th)", years: "2018–н.в." },
    ],
    "Outback": [
      { name: "BH (2nd)", years: "1999–2003" },
      { name: "BP (3rd)", years: "2003–2009" },
      { name: "BR (4th)", years: "2009–2014" },
      { name: "BS (5th)", years: "2014–2020" },
      { name: "BT (6th)", years: "2020–н.в." },
    ],
    "WRX": [
      { name: "GC (1st)", years: "1992–2000" },
      { name: "GD (2nd)", years: "2000–2007" },
      { name: "GE (3rd)", years: "2007–2014" },
      { name: "VA (4th)", years: "2014–2021" },
      { name: "VB (5th)", years: "2021–н.в." },
    ],
  },
  "Volvo": {
    "S60": [
      { name: "P24", years: "2000–2009" },
      { name: "P24 (рестайл)", years: "2009–2010" },
      { name: "Y20", years: "2010–2018" },
      { name: "Z252", years: "2018–н.в." },
    ],
    "XC60": [
      { name: "DZ", years: "2008–2017" },
      { name: "UZ", years: "2017–н.в." },
    ],
    "XC90": [
      { name: "C", years: "2002–2014" },
      { name: "L", years: "2014–н.в." },
    ],
    "V70": [
      { name: "P80", years: "1996–2000" },
      { name: "P26", years: "2000–2007" },
      { name: "BB", years: "2007–2016" },
    ],
    "S80": [
      { name: "TS", years: "1998–2006" },
      { name: "AS", years: "2006–2016" },
    ],
  },
  "Peugeot": {
    "206": [
      { name: "I поколение", years: "1998–2009" },
    ],
    "207": [
      { name: "I поколение", years: "2006–2012" },
    ],
    "208": [
      { name: "I поколение (A9)", years: "2012–2019" },
      { name: "II поколение (UB)", years: "2019–н.в." },
    ],
    "307": [
      { name: "I поколение (3A/C)", years: "2001–2008" },
    ],
    "308": [
      { name: "I поколение (4A/C)", years: "2007–2013" },
      { name: "II поколение (T9)", years: "2013–2021" },
      { name: "III поколение (P51)", years: "2021–н.в." },
    ],
    "407": [
      { name: "I поколение", years: "2004–2011" },
    ],
    "2008": [
      { name: "I поколение (A94)", years: "2013–2019" },
      { name: "II поколение (P24)", years: "2019–н.в." },
    ],
    "3008": [
      { name: "I поколение (T84)", years: "2008–2016" },
      { name: "II поколение (P84)", years: "2016–н.в." },
    ],
    "5008": [
      { name: "I поколение (T87)", years: "2009–2016" },
      { name: "II поколение (P87)", years: "2016–н.в." },
    ],
  },
  "Opel": {
    "Corsa": [
      { name: "A", years: "1982–1993" },
      { name: "B", years: "1993–2000" },
      { name: "C", years: "2000–2006" },
      { name: "D", years: "2006–2014" },
      { name: "E", years: "2014–2019" },
      { name: "F", years: "2019–н.в." },
    ],
    "Astra": [
      { name: "F", years: "1991–2002" },
      { name: "G", years: "1998–2009" },
      { name: "H", years: "2004–2010" },
      { name: "J", years: "2009–2015" },
      { name: "K", years: "2015–2021" },
      { name: "L", years: "2021–н.в." },
    ],
    "Vectra": [
      { name: "A", years: "1988–1995" },
      { name: "B", years: "1995–2002" },
      { name: "C", years: "2002–2008" },
    ],
    "Insignia": [
      { name: "A", years: "2008–2017" },
      { name: "B", years: "2017–н.в." },
    ],
    "Mokka": [
      { name: "A (J13)", years: "2012–2020" },
      { name: "B (B-E)", years: "2020–н.в." },
    ],
  },
  "Chevrolet": {
    "Aveo": [
      { name: "T200", years: "2002–2008" },
      { name: "T250", years: "2006–2012" },
      { name: "T300", years: "2011–2015" },
    ],
    "Cruze": [
      { name: "J300", years: "2009–2015" },
      { name: "J400", years: "2015–2019" },
    ],
    "Lacetti": [
      { name: "J200", years: "2002–2013" },
    ],
    "Captiva": [
      { name: "C100", years: "2006–2018" },
    ],
    "Cobalt": [
      { name: "T250", years: "2011–н.в." },
    ],
  },
  "Mitsubishi": {
    "Outlander": [
      { name: "CU", years: "2001–2006" },
      { name: "CW", years: "2005–2012" },
      { name: "GF/GG", years: "2012–2021" },
      { name: "GN", years: "2021–н.в." },
    ],
    "Pajero": [
      { name: "L040", years: "1982–1991" },
      { name: "V20", years: "1991–1999" },
      { name: "V60/V70", years: "1999–2006" },
      { name: "V80/V90", years: "2006–2021" },
    ],
    "L200": [
      { name: "K0T", years: "1986–1996" },
      { name: "K3T", years: "1996–2006" },
      { name: "KB", years: "2005–2015" },
      { name: "KJ/KK/KL", years: "2015–н.в." },
    ],
    "Pajero Sport": [
      { name: "K90", years: "1996–2008" },
      { name: "KH", years: "2008–2016" },
      { name: "QE", years: "2015–н.в." },
    ],
    "Lancer": [
      { name: "CB/CD", years: "1992–2003" },
      { name: "CS", years: "2003–2007" },
      { name: "CX/CY", years: "2007–2017" },
    ],
    "ASX": [
      { name: "GA", years: "2010–н.в." },
    ],
  },
  "Lexus": {
    "RX": [
      { name: "XU10", years: "1997–2003" },
      { name: "XU30", years: "2003–2009" },
      { name: "AL10", years: "2009–2015" },
      { name: "AL20", years: "2015–2022" },
      { name: "AL30", years: "2022–н.в." },
    ],
    "NX": [
      { name: "AZ10", years: "2014–2021" },
      { name: "AZ20", years: "2021–н.в." },
    ],
    "LX": [
      { name: "J80 (450)", years: "1996–1997" },
      { name: "J100 (470)", years: "1998–2007" },
      { name: "J200 (570)", years: "2007–2021" },
      { name: "J300 (600)", years: "2021–н.в." },
    ],
    "IS": [
      { name: "XE10", years: "1998–2005" },
      { name: "XE20", years: "2005–2013" },
      { name: "XE30", years: "2013–н.в." },
    ],
    "ES": [
      { name: "XV10", years: "1989–1994" },
      { name: "XV20", years: "1996–2001" },
      { name: "XV30", years: "2001–2006" },
      { name: "XV40", years: "2006–2012" },
      { name: "XV60", years: "2012–2018" },
      { name: "XV70", years: "2018–н.в." },
    ],
    "GX": [
      { name: "J120 (470)", years: "2002–2009" },
      { name: "J150 (460)", years: "2009–н.в." },
    ],
  },
  "Land Rover": {
    "Discovery": [
      { name: "Series I (L15)", years: "1989–1998" },
      { name: "Series II (L18)", years: "1998–2004" },
      { name: "Series III (L319)", years: "2004–2009" },
      { name: "Series IV (L319)", years: "2009–2017" },
      { name: "Series V (L462)", years: "2017–н.в." },
    ],
    "Range Rover": [
      { name: "Classic (L26)", years: "1970–1996" },
      { name: "P38A (L322)", years: "1994–2002" },
      { name: "L322", years: "2002–2012" },
      { name: "L405", years: "2012–2022" },
      { name: "L460", years: "2021–н.в." },
    ],
    "Range Rover Sport": [
      { name: "L320", years: "2005–2013" },
      { name: "L494", years: "2013–2022" },
      { name: "L461", years: "2022–н.в." },
    ],
    "Defender": [
      { name: "Classic", years: "1983–2016" },
      { name: "L663", years: "2019–н.в." },
    ],
    "Freelander": [
      { name: "L314 (1st)", years: "1997–2006" },
      { name: "L359 (2nd)", years: "2006–2014" },
    ],
    "Discovery Sport": [
      { name: "L550", years: "2014–н.в." },
    ],
  },
  "Porsche": {
    "911": [
      { name: "901/911 Classic", years: "1963–1989" },
      { name: "964", years: "1989–1994" },
      { name: "993", years: "1994–1998" },
      { name: "996", years: "1997–2006" },
      { name: "997", years: "2004–2012" },
      { name: "991", years: "2011–2019" },
      { name: "992", years: "2018–н.в." },
    ],
    "Cayenne": [
      { name: "9PA", years: "2002–2010" },
      { name: "92A", years: "2010–2018" },
      { name: "PO536", years: "2017–н.в." },
    ],
    "Macan": [
      { name: "95B", years: "2014–н.в." },
    ],
    "Panamera": [
      { name: "970", years: "2009–2016" },
      { name: "971", years: "2016–н.в." },
    ],
  },
  "Jeep": {
    "Grand Cherokee": [
      { name: "ZJ", years: "1992–1998" },
      { name: "WJ", years: "1998–2004" },
      { name: "WK", years: "2004–2010" },
      { name: "WK2", years: "2010–2021" },
      { name: "WL", years: "2021–н.в." },
    ],
    "Wrangler": [
      { name: "YJ", years: "1986–1995" },
      { name: "TJ", years: "1996–2006" },
      { name: "JK", years: "2006–2018" },
      { name: "JL", years: "2017–н.в." },
    ],
    "Cherokee": [
      { name: "XJ", years: "1983–2001" },
      { name: "KJ", years: "2002–2007" },
      { name: "KK", years: "2007–2013" },
      { name: "KL", years: "2013–н.в." },
    ],
  },
  "Infiniti": {
    "QX80": [
      { name: "Z62", years: "2010–н.в." },
    ],
    "QX60": [
      { name: "L50", years: "2012–2020" },
      { name: "L51", years: "2021–н.в." },
    ],
    "Q50": [
      { name: "V37", years: "2013–н.в." },
    ],
    "FX": [
      { name: "S50", years: "2002–2008" },
      { name: "S51", years: "2008–2013" },
    ],
    "QX50": [
      { name: "J50 (EX)", years: "2007–2017" },
      { name: "J55", years: "2017–н.в." },
    ],
  },
  "Haval": {
    "H6": [
      { name: "I поколение", years: "2011–2017" },
      { name: "II поколение", years: "2017–2021" },
      { name: "III поколение", years: "2021–н.в." },
    ],
    "F7": [
      { name: "I поколение", years: "2018–н.в." },
    ],
    "Jolion": [
      { name: "I поколение", years: "2020–н.в." },
    ],
    "Dargo": [
      { name: "I поколение", years: "2021–н.в." },
    ],
  },
  "Geely": {
    "Atlas": [
      { name: "NL3", years: "2016–н.в." },
    ],
    "Coolray": [
      { name: "SX11", years: "2018–н.в." },
    ],
    "Emgrand": [
      { name: "EC7", years: "2009–2018" },
      { name: "I поколение", years: "2018–н.в." },
    ],
    "Monjaro": [
      { name: "KX11", years: "2021–н.в." },
    ],
  },
  "Chery": {
    "Tiggo 4": [
      { name: "I поколение", years: "2017–н.в." },
    ],
    "Tiggo 7": [
      { name: "I поколение", years: "2016–2019" },
      { name: "Tiggo 7 Pro", years: "2019–н.в." },
    ],
    "Tiggo 8": [
      { name: "I поколение", years: "2018–н.в." },
      { name: "Tiggo 8 Pro", years: "2020–н.в." },
    ],
    "Arrizo 5": [
      { name: "I поколение", years: "2014–н.в." },
    ],
  },
  "BYD": {
    "Han": [
      { name: "I поколение", years: "2020–н.в." },
    ],
    "Tang": [
      { name: "I поколение", years: "2015–2019" },
      { name: "II поколение", years: "2019–н.в." },
    ],
    "Song Plus": [
      { name: "I поколение", years: "2020–н.в." },
    ],
    "Atto 3": [
      { name: "I поколение", years: "2021–н.в." },
    ],
    "Seal": [
      { name: "I поколение", years: "2022–н.в." },
    ],
  },
  "Tesla": {
    "Model S": [
      { name: "I поколение", years: "2012–2021" },
      { name: "Plaid", years: "2021–н.в." },
    ],
    "Model 3": [
      { name: "I поколение", years: "2017–2023" },
      { name: "Highland", years: "2023–н.в." },
    ],
    "Model X": [
      { name: "I поколение", years: "2015–2021" },
      { name: "Plaid", years: "2021–н.в." },
    ],
    "Model Y": [
      { name: "I поколение", years: "2020–н.в." },
    ],
  },
  "Mini": {
    "Hatch": [
      { name: "R50/R53 (1st)", years: "2001–2006" },
      { name: "R56 (2nd)", years: "2006–2013" },
      { name: "F55/F56 (3rd)", years: "2013–2022" },
      { name: "J01 (4th)", years: "2023–н.в." },
    ],
    "Countryman": [
      { name: "R60 (1st)", years: "2010–2016" },
      { name: "F60 (2nd)", years: "2016–2023" },
      { name: "U25 (3rd)", years: "2023–н.в." },
    ],
  },
  "SsangYong": {
    "Rexton": [
      { name: "Y200", years: "2001–2012" },
      { name: "Y290", years: "2012–2017" },
      { name: "Y400", years: "2017–н.в." },
    ],
    "Actyon": [
      { name: "I поколение", years: "2005–2011" },
      { name: "II поколение", years: "2010–2019" },
    ],
    "Tivoli": [
      { name: "I поколение", years: "2015–н.в." },
    ],
    "Musso": [
      { name: "Classic", years: "1993–2005" },
      { name: "Grand", years: "2018–н.в." },
    ],
    "Kyron": [
      { name: "I поколение", years: "2005–2015" },
    ],
  },
  "Suzuki": {
    "Swift": [
      { name: "AA34S / SF", years: "1983–2004" },
      { name: "RS415 (3rd)", years: "2004–2011" },
      { name: "FZ/NZ (4th)", years: "2011–2017" },
      { name: "AZ (5th)", years: "2017–н.в." },
    ],
    "Vitara": [
      { name: "TA01/ET (1st)", years: "1988–1998" },
      { name: "TD (2nd)", years: "1998–2005" },
      { name: "SQ (3rd)", years: "2005–2015" },
      { name: "LY (4th)", years: "2015–н.в." },
    ],
    "Grand Vitara": [
      { name: "TD (2nd)", years: "1997–2005" },
      { name: "SQ/JT (3rd)", years: "2005–2015" },
    ],
    "Jimny": [
      { name: "SJ (2nd)", years: "1981–1998" },
      { name: "SN (3rd)", years: "1998–2018" },
      { name: "JB64/JB74 (4th)", years: "2018–н.в." },
    ],
    "Liana": [
      { name: "RH413/416", years: "2001–2008" },
    ],
    "SX4": [
      { name: "EY/GY (1st)", years: "2006–2013" },
      { name: "AKK (2nd, S-Cross)", years: "2013–н.в." },
    ],
  },
  "Daewoo": {
    "Nexia": [
      { name: "I поколение (KLETN)", years: "1994–2016" },
    ],
    "Lanos": [
      { name: "I поколение (T100)", years: "1997–н.в." },
    ],
    "Matiz": [
      { name: "M100", years: "1998–2009" },
    ],
    "Lacetti": [
      { name: "J200", years: "2002–2013" },
    ],
  },
  "SEAT": {
    "Ibiza": [
      { name: "021A (1st)", years: "1984–1993" },
      { name: "6K (2nd)", years: "1993–2002" },
      { name: "6L (3rd)", years: "2002–2008" },
      { name: "6J (4th)", years: "2008–2017" },
      { name: "KJ (5th)", years: "2017–н.в." },
    ],
    "Leon": [
      { name: "1M (1st)", years: "1998–2005" },
      { name: "1P (2nd)", years: "2005–2012" },
      { name: "5F (3rd)", years: "2012–2020" },
      { name: "KL (4th)", years: "2020–н.в." },
    ],
    "Ateca": [
      { name: "KH7 (1st)", years: "2016–н.в." },
    ],
  },
  "Alfa Romeo": {
    "156": [
      { name: "932", years: "1997–2007" },
    ],
    "159": [
      { name: "939", years: "2005–2011" },
    ],
    "Giulietta": [
      { name: "940", years: "2010–2020" },
    ],
    "Giulia": [
      { name: "952", years: "2015–н.в." },
    ],
    "Stelvio": [
      { name: "949", years: "2016–н.в." },
    ],
  },
  "Jaguar": {
    "XF": [
      { name: "X250 (1st)", years: "2007–2015" },
      { name: "X260 (2nd)", years: "2015–н.в." },
    ],
    "XJ": [
      { name: "X300", years: "1994–1997" },
      { name: "X308", years: "1997–2003" },
      { name: "X350", years: "2003–2009" },
      { name: "X351", years: "2009–2019" },
    ],
    "F-Pace": [
      { name: "X761 (1st)", years: "2016–н.в." },
    ],
    "E-Pace": [
      { name: "X540 (1st)", years: "2017–н.в." },
    ],
  },
};